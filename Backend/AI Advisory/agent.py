"""
KisanMitra Agent — LangChain agent powered by Groq Llama 3.
This is the core reasoning engine that routes farmer queries to the right tool.
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv(override=True)

from langchain_groq import ChatGroq
from langchain_classic.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

try:
    from .tools import crop_fertilizer_tool, disease_detector_tool, rag_search_tool, mandi_price_tool, weather_tool
    from .language import detect_language, get_language_instruction
except ImportError:
    from tools import crop_fertilizer_tool, disease_detector_tool, rag_search_tool, mandi_price_tool, weather_tool
    from language import detect_language, get_language_instruction

# ── Mandi Query Detection (shared with main.py) ────────────────────
MANDI_QUERY_HINTS = (
    "भाव",
    "मंडी",
    "price",
    "rate",
    "market price",
    "market rate",
    "mandi",
)

CROP_KEYWORDS = {
    "गेहूं": "Wheat",
    "wheat": "Wheat",
    "धान": "Paddy",
    "paddy": "Paddy",
    "चावल": "Rice",
    "rice": "Rice",
    "जौ": "Barley",
    "barley": "Barley",
    "सरसों": "Mustard",
    "mustard": "Mustard",
    "चना": "Gram",
    "gram": "Gram",
    "मक्का": "Maize",
    "maize": "Maize",
    "कपास": "Cotton",
    "cotton": "Cotton",
}

STATE_KEYWORDS = {
    "पंजाब": "Punjab",
    "punjab": "Punjab",
    "हरियाणा": "Haryana",
    "haryana": "Haryana",
    "राजस्थान": "Rajasthan",
    "rajasthan": "Rajasthan",
    "उत्तर प्रदेश": "Uttar Pradesh",
    "uttar pradesh": "Uttar Pradesh",
    "मध्य प्रदेश": "Madhya Pradesh",
    "madhya pradesh": "Madhya Pradesh",
    "महाराष्ट्र": "Maharashtra",
    "maharashtra": "Maharashtra",
    "गुजरात": "Gujarat",
    "gujarat": "Gujarat",
    "बिहार": "Bihar",
    "bihar": "Bihar",
    "कर्नाटक": "Karnataka",
    "karnataka": "Karnataka",
    "तेलंगाना": "Telangana",
    "telangana": "Telangana",
    "आंध्र प्रदेश": "Andhra Pradesh",
    "andhra pradesh": "Andhra Pradesh",
    "तमिलनाडु": "Tamil Nadu",
    "tamil nadu": "Tamil Nadu",
    "पश्चिम बंगाल": "West Bengal",
    "west bengal": "West Bengal",
    "ओडिशा": "Odisha",
    "odisha": "Odisha",
    "छत्तीसगढ़": "Chhattisgarh",
    "chhattisgarh": "Chhattisgarh",
    "असम": "Assam",
    "assam": "Assam",
}

def extract_keyword(text: str, mapping: dict[str, str]) -> str | None:
    """Extract a normalized keyword from text using the given mapping."""
    lowered = text.lower()
    for keyword, normalized_value in mapping.items():
        if keyword in lowered:
            return normalized_value
    return None

def build_mandi_response(query: str) -> str | None:
    """
    Detect if the query is a mandi price query and return a direct response.
    Returns None if the query is not a mandi price query.
    Shared between agent.py (direct call) and main.py (FastAPI endpoint).
    """
    lowered = query.lower()
    if not any(hint in lowered for hint in MANDI_QUERY_HINTS):
        return None

    crop = extract_keyword(query, CROP_KEYWORDS)
    state = extract_keyword(query, STATE_KEYWORDS)
    if not crop or not state:
        return None

    try:
        url = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
        params = {
            "api-key": os.getenv("DATA_GOV_API_KEY"),
            "format": "json",
            "filters[commodity]": crop,
            "filters[state]": state,
            "limit": 5,
        }
        resp = requests.get(url, params=params, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        records = data.get("records", [])

        if not records:
            return f"No current price data found for {crop} in {state}."

        lines = [f"Latest mandi prices for {crop} in {state}:"]
        for record in records[:5]:
            market = record.get("market", "")
            district = record.get("district", "")
            arrival_date = record.get("arrival_date", "")
            modal_price = record.get("modal_price", "N/A")
            place_bits = ", ".join(bit for bit in [district, arrival_date] if bit)
            place_suffix = f" ({place_bits})" if place_bits else ""
            lines.append(f"- {market}{place_suffix}: Rs.{modal_price} per quintal")

        return "\n".join(lines)
    except Exception as exc:
        print("Mandi fast-path error (falling back to mock data):", exc)
        # Mock fallback data
        mock_prices = {
            "wheat": [("Ludhiana", "Ludhiana", 2275), ("Amritsar", "Amritsar", 2250)],
            "rice": [("Karnal", "Karnal", 3500), ("Kurukshetra", "Kurukshetra", 3450)],
            "cotton": [("Bathinda", "Bathinda", 6800), ("Fazilka", "Fazilka", 6750)],
            "mustard": [("Alwar", "Alwar", 5200), ("Bharatpur", "Bharatpur", 5150)],
            "paddy": [("Karnal", "Karnal", 2200), ("Kurukshetra", "Kurukshetra", 2180)],
        }
        
        crop_lower = crop.lower()
        matched_data = mock_prices.get(crop_lower, [("Local Market 1", "District 1", 2100), ("Local Market 2", "District 2", 2150)])
        
        lines = [f"[Mock Data] Latest mandi prices for {crop} in {state}:"]
        for market, district, price in matched_data:
            lines.append(f"- {market} ({district}): Rs.{price} per quintal")
            
        return "\n".join(lines)

# ── LLM / Agent Configuration ───────────────────────────────────────
_AGENT_EXECUTOR = None

def _build_llm() -> ChatGroq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.2,
        max_tokens=1024,
        api_key=api_key,
    )


def _build_fallback_context(query: str) -> str:
    """Return small local knowledge context for Gemini fallback."""
    try:
        try:
            from .rag import retriever
        except ImportError:
            from rag import retriever
        docs = retriever.invoke(query)
        return "\n\n".join(d.page_content for d in docs[:3])
    except Exception:
        return ""


def _extract_gemini_text(data: dict) -> str:
    candidates = data.get("candidates") or []
    if not candidates:
        return ""

    parts = candidates[0].get("content", {}).get("parts", [])
    text_parts = [part.get("text", "") for part in parts if part.get("text")]
    return "\n".join(text_parts).strip()


def _call_gemini_fallback(query: str, lang: str) -> str | None:
    """
    Use Gemini only when the primary Groq/LangChain advisory path is unavailable.
    Requires GEMINI_API_KEY in the environment.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    language_instruction = get_language_instruction(lang)
    context = _build_fallback_context(query)

    prompt_text = f"""You are KisanMitra, a practical AI farming assistant for Indian farmers.

{language_instruction}
Answer in simple farmer-friendly language. Give specific, actionable agriculture guidance.
If you are unsure, say so and recommend the farmer contact the nearest KVK or Kisan Call Centre: 1800-180-1551.

Local knowledge context:
{context or "No local knowledge context was available."}

Farmer question:
{query}
"""

    try:
        resp = requests.post(
            url,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": api_key,
            },
            json={
                "contents": [
                    {
                        "parts": [
                            {"text": prompt_text}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 1024,
                },
            },
            timeout=30,
        )
        resp.raise_for_status()
        text = _extract_gemini_text(resp.json())
        return text or None
    except Exception:
        return None

def _call_gemini_with_image(query: str, image_b64: str, lang: str) -> str | None:
    """
    Use Gemini for multimodal queries (image + text).
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "Image analysis requires GEMINI_API_KEY to be set."

    mime_type = "image/jpeg"
    if image_b64.startswith("data:"):
        try:
            header, image_b64 = image_b64.split(",", 1)
            mime_type = header.split(";")[0].split(":")[1]
        except:
            pass

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    language_instruction = get_language_instruction(lang)

    prompt_text = f"You are KisanMitra, an AI farming assistant.\n{language_instruction}\n\nFarmer question: {query}"

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt_text},
                {
                    "inlineData": {
                        "mimeType": mime_type,
                        "data": image_b64
                    }
                }
            ]
        }]
    }

    try:
        resp = requests.post(
            url,
            headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
            json=payload,
            timeout=30
        )
        resp.raise_for_status()
        text = _extract_gemini_text(resp.json())
        return text or None
    except Exception as e:
        return f"Error analyzing image: {str(e)}"


# ── System Prompt ───────────────────────────────────────────────────
SYSTEM_PROMPT = """You are KisanMitra (किसान मित्र), a friendly AI farming assistant built for Indian farmers.

## Language Rules
- You support three languages: Hindi (hi), Marathi (mr), and English (en).
- {language_instruction}
- ALWAYS reply in the SAME language the farmer used in their query. If the query is in Hindi, your full response must be in Hindi. If Marathi, respond in Marathi. If English, respond in English.

## IMPORTANT — For Disease or Symptom Queries
- NEVER assume the disease from symptoms alone. First ask 1–2 short clarifying questions to narrow down the problem.
- Example: if a farmer says 'leaves are turning yellow', ask: 'क्या पत्तियों पर पीले धब्बे या धारियाँ हैं, या पूरी पत्ती एक जैसी पीली है?' (Are there yellow spots/stripes on the leaves, or is the entire leaf uniformly yellow?)
- Only AFTER the farmer confirms the specific symptoms, give the specific disease name and treatment with exact dosages.
- If you cannot ask (e.g. first message with enough detail), use the tool result to list the 2–3 most likely causes with their distinguishing symptoms so the farmer can self-identify.

## What You Know
- Crop recommendations based on soil type, climate, and region
- Fertilizer dosage advice (NPK values, urea, DAP, MOP quantities)
- Plant disease identification from symptoms or leaf descriptions
- Mandi prices and market linkage guidance
- Government schemes: PM-KISAN, PMFBY (Pradhan Mantri Fasal Bima Yojana), Kisan Credit Card (KCC), e-NAM, and other agricultural welfare programs

## How to Use Tools
- If a farmer describes plant symptoms (yellowing, spots, wilting, pests), call the **disease_detector_tool**.
- If a farmer asks what to grow or how much fertilizer to use, call the **crop_fertilizer_tool**.
- If a farmer asks about crop prices, mandi rates, or where to sell their crop, call the **mandi_price_tool**.
- If a farmer asks about the current weather, temperature, or humidity, call the **weather_tool**.
- For government schemes or general farming knowledge, call the **rag_search_tool**.

## CRITICAL — Answering After a Tool Call
- After you receive a result from ANY tool, you MUST immediately synthesize that result into a helpful, complete final answer for the farmer.
- NEVER call the same tool again with the same or similar input. One tool call is enough.
- Even if the tool result is a fallback or partial, use whatever data you received to compose your answer.
- If the tool returned an error or no data, tell the farmer politely and suggest they contact their nearest Krishi Vigyan Kendra (KVK) or call Kisan Call Centre: 1800-180-1551.

## Tone and Style
- Keep your language simple and practical — farmers may not know technical jargon.
- Give specific, actionable advice: mention exact dosages, timings, product names, and steps.
- Be warm, respectful, and encouraging. Farming is hard work — acknowledge that.
- When unsure, be honest and recommend the farmer visit their nearest KVK or call 1800-180-1551.

## RAG Fallback Rule
- If your RAG tool returns no relevant results or says it cannot find information, DO NOT say you cannot answer. Instead use your own farming knowledge to answer, but add this line at the end:
  - In Hindi queries: 'यह जानकारी सामान्य ज्ञान पर आधारित है। कृपया अपने स्थानीय कृषि विभाग से भी सलाह लें।'
  - In English queries: 'This is based on general knowledge. Please also consult your local agriculture department.'
"""

# ── Prompt Template ─────────────────────────────────────────────────
prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])

# ── Tools ───────────────────────────────────────────────────────────
tools = [crop_fertilizer_tool, disease_detector_tool, rag_search_tool, mandi_price_tool, weather_tool]

def get_agent_executor():
    global _AGENT_EXECUTOR
    if _AGENT_EXECUTOR is None:
        llm = _build_llm()
        agent = create_tool_calling_agent(llm, tools, prompt)
        _AGENT_EXECUTOR = AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=5,
            early_stopping_method="generate",
        )
    return _AGENT_EXECUTOR


def ask_agent(query: str, lang: str = None, image: str = None) -> dict:
    """
    Main entry point — send a farmer's query to the agent.

    Args:
        query: The farmer's question (in any supported language).
        lang:  Detected language code ('hi', 'mr', 'en').
               If None, auto-detected from query text.
        image: Base64 string of an image (optional).

    Returns:
        dict with 'response' (str) and 'language' (str).
    """
    if lang is None:
        lang = detect_language(query)

    if image:
        resp = _call_gemini_with_image(query, image, lang)
        if resp:
            return {"response": resp, "language": lang}


    mandi_response = build_mandi_response(query)
    if mandi_response is not None:
        return {
            "response": mandi_response,
            "language": lang,
        }

    language_instruction = get_language_instruction(lang)

    try:
        agent_executor = get_agent_executor()
        result = agent_executor.invoke({
            "input": query,
            "language_instruction": language_instruction,
        })
        return {
            "response": result["output"],
            "language": lang,
        }
    except RuntimeError as exc:
        fallback_response = _call_gemini_fallback(query, lang)
        if fallback_response:
            return {
                "response": fallback_response,
                "language": lang,
            }
        return {
            "response": (
                "The advisory service is not configured yet. "
                "Please set GROQ_API_KEY or GEMINI_API_KEY to enable AI responses."
            ),
            "language": lang,
        }
    except Exception as exc:
        fallback_response = _call_gemini_fallback(query, lang)
        if fallback_response:
            return {
                "response": fallback_response,
                "language": lang,
            }
        return {
            "response": (
                "Sorry, I couldn't process your request right now. "
                "Please try again later."
            ),
            "language": lang,
        }


# Quick CLI test
if __name__ == "__main__":
    print("=" * 60)
    print("  KisanMitra Agent -- CLI Test")
    print("=" * 60)

    test_queries = [
        ("What crop should I grow in black soil in Vidarbha?", "en"),
        ("मेरे गेहूं की पत्तियाँ पीली हो रही हैं, क्या करूँ?", "hi"),
        ("PM-KISAN योजना में कैसे रजिस्टर करें?", "hi"),
    ]

    for query, expected_lang in test_queries:
        print(f"\n{'-' * 60}")
        print(f"[FARMER] Query: {query}")
        print(f"   Expected lang: {expected_lang}")
        result = ask_agent(query)
        print(f"   Detected lang: {result['language']}")
        print(f"[AGENT] Response:\n{result['response']}")
