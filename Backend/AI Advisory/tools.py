"""
LangChain tools for KisanMitra advisory agent.
Each tool wraps a team API endpoint (or mock) and is decorated with @tool
so the LLM agent can invoke it automatically.
"""

import os
import requests
from langchain.tools import tool

# Base URLs for backend microservices — reads from .env, falls back to localhost
DISEASE_BACKEND_URL = os.getenv("DISEASE_BACKEND_URL", "http://localhost:8000")
CROP_BACKEND_URL = os.getenv("CROP_BACKEND_URL", "http://localhost:8001")


@tool
def crop_fertilizer_tool(soil_npk: str, location: str) -> str:
    """Call this when a farmer asks what crop to grow, how much fertilizer
    to use, or needs crop recommendations for their region.
    Input: soil NPK values (e.g. 'N=80, P=40, K=30') and district/location."""
    try:
        # Parse NPK from string
        import re
        n_val = 90.0
        p_val = 42.0
        k_val = 43.0
        n_match = re.search(r'n\s*[:=]\s*(\d+(?:\.\d+)?)', soil_npk, re.IGNORECASE)
        p_match = re.search(r'p\s*[:=]\s*(\d+(?:\.\d+)?)', soil_npk, re.IGNORECASE)
        k_match = re.search(r'k\s*[:=]\s*(\d+(?:\.\d+)?)', soil_npk, re.IGNORECASE)
        if n_match: n_val = float(n_match.group(1))
        if p_match: p_val = float(p_match.group(1))
        if k_match: k_val = float(k_match.group(1))

        # Fetch weather for location if API key is present
        temp_val = 27.0
        humidity_val = 70.0
        api_key = os.getenv("OPEN_WEATHER_API_KEY")
        if api_key and location:
            try:
                loc_clean = location.split(',')[0].replace("Tahsil", "").replace("Tehsil", "").replace("District", "").strip()
                url = f"https://api.openweathermap.org/data/2.5/weather?q={loc_clean}&appid={api_key}&units=metric"
                w_resp = requests.get(url, timeout=5)
                if w_resp.status_code == 200:
                    w_data = w_resp.json()
                    temp_val = float(w_data.get("main", {}).get("temp", temp_val))
                    humidity_val = float(w_data.get("main", {}).get("humidity", humidity_val))
            except Exception:
                pass

        # Call crop recommendation model
        payload = {
            "n": n_val,
            "p": p_val,
            "k": k_val,
            "ph": 6.5,
            "rainfall": 200.0,
            "temperature": temp_val,
            "humidity": humidity_val
        }
        
        rec_url = f"{CROP_BACKEND_URL}/recommend"
        resp = requests.post(rec_url, json=payload, timeout=10)
        resp.raise_for_status()
        rec_data = resp.json()
        crop = rec_data.get("crop", "rice")
        confidence = rec_data.get("confidence", "N/A")

        # Now get fertilizer optimization for the recommended crop
        fert_payload = {
            "crop": crop.lower(),
            "n": n_val,
            "p": p_val,
            "k": k_val,
            "area": 1.0 # default to 1 acre
        }
        
        fert_url = f"{CROP_BACKEND_URL}/fertilizer"
        fert_resp = requests.post(fert_url, json=fert_payload, timeout=10)
        fert_details = ""
        if fert_resp.ok:
            f_data = fert_resp.json()
            dose = f_data.get("fertilizer_dose_per_ha", {})
            schedule = f_data.get("application_schedule", [])
            notes = f_data.get("notes", [])
            
            dose_str = ", ".join(f"{k}: {v} kg/ha" for k, v in dose.items() if k != "total")
            schedule_str = "\n".join(f"- Step {i+1}: {step}" for i, step in enumerate(schedule))
            notes_str = "\n".join(f"- {note}" for note in notes)
            
            fert_details = (
                f"\n\nRecommended Fertilizer Doses:\n{dose_str}"
                f"\n\nApplication Schedule:\n{schedule_str}"
                f"\n\nExpert Notes:\n{notes_str}"
            )

        return (
            f"Based on the crop recommendation model:\n"
            f"- Recommended Crop: {crop.capitalize()} (Confidence: {confidence})"
            f"{fert_details}"
        )
    except requests.exceptions.ConnectionError:
        # Fallback: use RAG knowledge for crop advice when API is down
        try:
            from .rag import retriever
        except ImportError:
            from rag import retriever
        docs = retriever.invoke(f"crop recommendation for {location} with NPK {soil_npk}")
        if docs:
            return (
                "[WARN] Live recommendation service offline. "
                "Here's what I know from my knowledge base:\n\n"
                + "\n".join(d.page_content for d in docs[:2])
            )
        return "Crop recommendation service is currently unavailable. Please try again later."
    except Exception as e:
        return f"Error getting crop recommendation: {str(e)}"


@tool
def disease_detector_tool(symptoms_or_image: str) -> str:
    """Call this when a farmer uploads a leaf photo, describes plant symptoms,
    or reports that their crop looks sick/yellow/wilting.
    Input: description of symptoms OR image URL/base64 string of the leaf."""
    try:
        resp = requests.post(
            f"{DISEASE_BACKEND_URL}/detect",
            json={"image": symptoms_or_image},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        disease = data.get("disease", "Unknown")
        treatment = data.get("treatment", "Consult your local KVK.")
        confidence = data.get("confidence", "")
        result = f"[DETECTED] {disease}"
        if confidence:
            result += f" (Confidence: {confidence})"
        result += f"\n[TREATMENT] {treatment}"
        return result
    except requests.exceptions.ConnectionError:
        # Fallback: use RAG for disease info when API is down
        try:
            from .rag import retriever
        except ImportError:
            from rag import retriever
        docs = retriever.invoke(f"disease treatment {symptoms_or_image}")
        if docs:
            return (
                "[WARN] Disease detection service offline. "
                "Based on your description, here's what I found:\n\n"
                + "\n".join(d.page_content for d in docs[:2])
            )
        return "Disease detection service is currently unavailable. Please try again later."
    except Exception as e:
        return f"Error in disease detection: {str(e)}"


@tool
def rag_search_tool(query: str) -> str:
    """Call this for general farming questions, mandi prices, weather advice,
    government schemes (like PM-KISAN, crop insurance, Kisan Credit Card),
    or any agricultural knowledge question.
    Input: the farmer's question (translate to English first if needed)."""
    try:
        try:
            from .rag import retriever
        except ImportError:
            from rag import retriever
        docs = retriever.invoke(query)
        if not docs:
            return "I couldn't find relevant information in my knowledge base."
        return "\n\n---\n\n".join(d.page_content for d in docs[:3])
    except Exception as e:
        return f"Error searching knowledge base: {str(e)}"


@tool
def mandi_price_tool(crop: str, state: str) -> str:
    """Call this when farmer asks about crop prices, mandi rates, or where to sell their crop.
    Input: crop name in English, state name in English"""
    try:
        import os
        url = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
        params = {
            "api-key": os.getenv("DATA_GOV_API_KEY"),
            "format": "json",
            "filters[commodity]": crop,
            "filters[state]": state,
            "limit": 5
        }
        resp = requests.get(url, params=params, timeout=5)
        print("Mandi API status:", resp.status_code)
        data = resp.json()
        if data.get("records"):
            records = data["records"][:3]
            result = f"Latest mandi prices for {crop} in {state}:\n"
            for r in records:
                result += f"- {r.get('market','')}: Rs.{r.get('modal_price','N/A')} per quintal\n"
            return result
        return f"No current price data found for {crop} in {state}."
    except Exception as e:
        print("Mandi tool error (falling back to mock data):", e)
        # Mock fallback data so that the app remains functional during API outages
        mock_prices = {
            "wheat": [("Ludhiana", 2275), ("Amritsar", 2250), ("Patiala", 2260)],
            "rice": [("Karnal", 3500), ("Kurukshetra", 3450), ("Ambala", 3520)],
            "cotton": [("Bathinda", 6800), ("Fazilka", 6750), ("Mansa", 6820)],
            "mustard": [("Alwar", 5200), ("Bharatpur", 5150), ("Jaipur", 5250)],
        }
        
        crop_lower = crop.lower()
        # Find matching mock crop or just return some generic dummy data
        matched_data = mock_prices.get(crop_lower, [("Local Market 1", 2100), ("Local Market 2", 2150)])
        
        result = f"[Mock Data] Latest mandi prices for {crop} in {state}:\n"
        for market, price in matched_data:
            result += f"- {market}: Rs.{price} per quintal\n"
        
        return result

@tool
def weather_tool(location: str) -> str:
    """Call this when farmer asks about current weather, temperature, rain, or humidity.
    Input: city or district name in English."""
    try:
        api_key = os.getenv("OPEN_WEATHER_API_KEY")
        if not api_key:
            return "Weather service API key is missing."
        
        url = f"https://api.openweathermap.org/data/2.5/weather?q={location}&appid={api_key}&units=metric"
        resp = requests.get(url, timeout=10)
        
        if resp.status_code != 200:
            # Fallback: try just the first part (city) and remove "Tahsil"/"District"
            loc_clean = location.split(',')[0].replace("Tahsil", "").replace("Tehsil", "").replace("District", "").strip()
            url_clean = f"https://api.openweathermap.org/data/2.5/weather?q={loc_clean}&appid={api_key}&units=metric"
            resp = requests.get(url_clean, timeout=10)
            
            if resp.status_code != 200:
                return f"Could not fetch weather for {location}."
            
        data = resp.json()
        weather_desc = data.get("weather", [{}])[0].get("description", "Unknown")
        temp = data.get("main", {}).get("temp", "N/A")
        humidity = data.get("main", {}).get("humidity", "N/A")
        
        return f"Current weather in {location}: {weather_desc}, Temperature: {temp}°C, Humidity: {humidity}%."
    except Exception as e:
        return f"Error fetching weather data: {str(e)}"
