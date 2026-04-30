# ═══════════════════════════════════════════════════════════════════════════════
# WEATHER DATA INTEGRATION MODULE
# Fetches real-time weather from OpenWeather API
# Provides fallback to manual input if API fails
# ═══════════════════════════════════════════════════════════════════════════════

import requests
import json
from typing import Dict, Optional, Tuple, List
from datetime import datetime


class WeatherDataProvider:
    """
    Fetches real-time weather data from OpenWeather API
    - Current weather conditions
    - Forecast data
    - Historical averages
    - Fallback to manual input
    """

    # OpenWeather API endpoints
    CURRENT_WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"
    FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"
    ONECALL_URL = "https://api.openweathermap.org/data/3.0/onecall"

    # Soil pH recommendations by region (default values if not available)
    REGION_PH_DEFAULTS = {
        'north': 6.5,
        'south': 6.8,
        'central': 7.0,
        'east': 6.9,
        'west': 7.2,
        'default': 7.0
    }

    def __init__(self, api_key: str = None):
        """
        Initialize Weather Provider

        Args:
            api_key: OpenWeather API key
                    If None, uses fallback manual input
        """
        self.api_key = api_key
        self.api_available = api_key is not None
        self.last_fetch_time = None
        self.cached_weather = None

    def get_weather_by_coordinates(self, latitude: float, longitude: float,
                                   use_cache: bool = True) -> Optional[Dict]:
        """
        Fetch weather by GPS coordinates

        Args:
            latitude: Farm latitude
            longitude: Farm longitude
            use_cache: Use cached data if available

        Returns:
            Weather dictionary or None if API fails
        """
        if not self.api_available:
            print("⚠️  No API key configured. Using manual input mode.")
            return None

        if use_cache and self.cached_weather:
            return self.cached_weather

        try:
            params = {
                'lat': latitude,
                'lon': longitude,
                'appid': self.api_key,
                'units': 'metric'  # Celsius
            }

            print(f"🌐 Fetching weather from OpenWeather API...")
            response = requests.get(
                self.CURRENT_WEATHER_URL, params=params, timeout=5)
            response.raise_for_status()

            data = response.json()
            self.cached_weather = self._parse_weather_response(data)
            self.last_fetch_time = datetime.now()

            print(f"✅ Weather data fetched successfully")
            return self.cached_weather

        except requests.exceptions.ConnectionError:
            print("❌ Connection error: Cannot reach OpenWeather API")
            return None
        except requests.exceptions.Timeout:
            print("❌ Timeout: API took too long to respond")
            return None
        except Exception as e:
            print(f"❌ Error fetching weather: {e}")
            return None

    def get_weather_by_city(self, city_name: str, country_code: str = None,
                            use_cache: bool = True) -> Optional[Dict]:
        """
        Fetch weather by city name

        Args:
            city_name: City name (e.g., "Mumbai")
            country_code: ISO 3166 country code (e.g., "IN" for India)
            use_cache: Use cached data

        Returns:
            Weather dictionary
        """
        if not self.api_available:
            print("⚠️  No API key configured.")
            return None

        if use_cache and self.cached_weather:
            return self.cached_weather

        try:
            query = f"{city_name},{country_code}" if country_code else city_name

            params = {
                'q': query,
                'appid': self.api_key,
                'units': 'metric'
            }

            print(f"🌐 Fetching weather for {query}...")
            response = requests.get(
                self.CURRENT_WEATHER_URL, params=params, timeout=5)
            response.raise_for_status()

            data = response.json()
            self.cached_weather = self._parse_weather_response(data)
            self.last_fetch_time = datetime.now()

            print(f"✅ Weather data fetched for {city_name}")
            return self.cached_weather

        except Exception as e:
            print(f"❌ Error: {e}")
            return None

    def _parse_weather_response(self, response_data: Dict) -> Dict:
        """
        Parse OpenWeather API response to standard format

        Args:
            response_data: Raw response from OpenWeather API

        Returns:
            Standardized weather dictionary
        """
        try:
            main_data = response_data.get('main', {})
            weather_data = response_data.get('weather', [{}])[0]

            weather = {
                'temperature': round(main_data.get('temp', 25), 1),  # °C
                'humidity': main_data.get('humidity', 50),  # %
                'pressure': main_data.get('pressure', 1013),  # hPa
                'feels_like': round(main_data.get('feels_like', 25), 1),
                'temp_min': round(main_data.get('temp_min', 20), 1),
                'temp_max': round(main_data.get('temp_max', 30), 1),
                'visibility': response_data.get('visibility', 10000),  # meters
                # m/s
                'wind_speed': response_data.get('wind', {}).get('speed', 0),
                'clouds': response_data.get('clouds', {}).get('all', 0),  # %
                'description': weather_data.get('description', 'clear'),
                'rain_1h': response_data.get('rain', {}).get('1h', 0),  # mm
                'ph': 7.0,  # Default pH (not available from weather API)
                # mm
                'rainfall': self._estimate_monthly_rainfall(response_data),
                'location': response_data.get('name', 'Unknown'),
                'country': response_data.get('sys', {}).get('country', ''),
                'timestamp': datetime.now().isoformat()
            }

            return weather

        except Exception as e:
            print(f"⚠️  Error parsing weather data: {e}")
            return None

    def _estimate_monthly_rainfall(self, response_data: Dict) -> float:
        """
        Estimate monthly rainfall from current conditions

        Args:
            response_data: OpenWeather response

        Returns:
            Estimated rainfall in mm
        """
        # This is an estimation based on current conditions
        # For accurate long-term rainfall, use weather history API
        clouds = response_data.get('clouds', {}).get('all', 0)
        rain_1h = response_data.get('rain', {}).get('1h', 0)

        # Rough estimation: if raining now, estimate monthly
        if rain_1h > 0:
            # Assuming rain duration of 6-12 hours per day
            estimated_monthly = rain_1h * 24 * 15  # 15 rain days/month
        elif clouds > 70:
            # High clouds suggest potential rain
            estimated_monthly = (clouds / 100) * 80
        else:
            estimated_monthly = (clouds / 100) * 40

        return round(max(estimated_monthly, 20), 1)  # Minimum 20mm

    def get_seasonal_forecast(self, latitude: float, longitude: float,
                              days: int = 7) -> Optional[Dict]:
        """
        Get weather forecast for next N days

        Args:
            latitude: Farm latitude
            longitude: Farm longitude
            days: Number of days to forecast (1-40, default 7)

        Returns:
            Forecast data
        """
        if not self.api_available:
            return None

        try:
            params = {
                'lat': latitude,
                'lon': longitude,
                'appid': self.api_key,
                'units': 'metric',
                'cnt': min(days * 8, 40)  # 3-hourly data
            }

            response = requests.get(
                self.FORECAST_URL, params=params, timeout=5)
            response.raise_for_status()

            data = response.json()
            forecast = self._parse_forecast_response(data)

            return forecast

        except Exception as e:
            print(f"❌ Error fetching forecast: {e}")
            return None

    def _parse_forecast_response(self, response_data: Dict) -> Dict:
        """Parse forecast response"""
        forecasts = response_data.get('list', [])

        summary = {
            'location': response_data.get('city', {}).get('name', 'Unknown'),
            'forecast_data': [],
            'average_temp': 0,
            'average_humidity': 0,
            'rain_probability': 0
        }

        temps = []
        humidities = []
        rain_count = 0

        for forecast_item in forecasts[:14]:  # Next 3-4 days
            temp = forecast_item.get('main', {}).get('temp', 25)
            humidity = forecast_item.get('main', {}).get('humidity', 50)
            rain = forecast_item.get('rain', {}).get('3h', 0)

            temps.append(temp)
            humidities.append(humidity)
            if rain > 0:
                rain_count += 1

            summary['forecast_data'].append({
                'time': forecast_item.get('dt_txt'),
                'temperature': round(temp, 1),
                'humidity': humidity,
                'rain_3h': rain
            })

        summary['average_temp'] = round(
            sum(temps) / len(temps), 1) if temps else 25
        summary['average_humidity'] = round(
            sum(humidities) / len(humidities), 1) if humidities else 50
        summary['rain_probability'] = round(
            (rain_count / len(forecasts)) * 100, 0) if forecasts else 0

        return summary

    def get_combined_weather(self, farm_data: Dict, force_api: bool = False) -> Dict:
        """
        Get combined weather data - prefer API, fallback to manual input

        Args:
            farm_data: Farm information (has manual weather input)
            force_api: Force API call even if manual data exists

        Returns:
            Complete weather dictionary
        """
        weather = {}

        # Try API first if available and forced
        if force_api and self.api_available:
            api_weather = None

            # Try by coordinates
            if 'latitude' in farm_data and 'longitude' in farm_data:
                api_weather = self.get_weather_by_coordinates(
                    farm_data['latitude'], farm_data['longitude'])

            # Try by city
            elif 'farm_location' in farm_data:
                parts = farm_data['farm_location'].split(',')
                city = parts[0].strip(
                ) if parts else farm_data['farm_location']
                api_weather = self.get_weather_by_city(city)

            if api_weather:
                print(f"✅ Using API weather data")
                return api_weather

        # Fallback to manual input or default values
        manual_weather = farm_data.get('weather', {})

        if manual_weather:
            print(f"✅ Using manual weather input")
            weather = manual_weather.copy()
        else:
            print(f"ℹ️ No weather data provided, using defaults")
            weather = {
                'temperature': 25,
                'humidity': 50,
                'ph': 7.0,
                'rainfall': 100
            }

        # Ensure all required fields
        weather.setdefault('temperature', 25)
        weather.setdefault('humidity', 50)
        weather.setdefault('ph', 7.0)
        weather.setdefault('rainfall', 100)

        return weather

    @staticmethod
    def get_imd_data_for_region(region_name: str) -> Dict:
        """
        Get India Meteorological Department (IMD) regional averages

        Args:
            region_name: Region name (North, South, East, West, Central)

        Returns:
            IMD regional weather averages
        """
        imd_data = {
            'north': {
                'avg_temperature': 22,
                'avg_humidity': 65,
                'avg_rainfall': 120,
                'soil_ph': 6.5,
                'description': 'North India - Monsoon influenced'
            },
            'south': {
                'avg_temperature': 28,
                'avg_humidity': 70,
                'avg_rainfall': 140,
                'soil_ph': 6.8,
                'description': 'South India - High humidity, coastal'
            },
            'central': {
                'avg_temperature': 26,
                'avg_humidity': 60,
                'avg_rainfall': 100,
                'soil_ph': 7.0,
                'description': 'Central India - Semi-arid'
            },
            'east': {
                'avg_temperature': 24,
                'avg_humidity': 68,
                'avg_rainfall': 130,
                'soil_ph': 6.9,
                'description': 'East India - Delta region'
            },
            'west': {
                'avg_temperature': 27,
                'avg_humidity': 72,
                'avg_rainfall': 150,
                'soil_ph': 7.2,
                'description': 'West India - Coastal'
            }
        }

        return imd_data.get(region_name.lower(), imd_data['central'])

    def validate_weather_data(self, weather: Dict) -> Tuple[bool, List[str]]:
        """
        Validate weather data against ICAR ranges

        Args:
            weather: Weather dictionary

        Returns:
            Tuple of (is_valid, list_of_warnings)
        """
        warnings = []
        icar_ranges = {
            'temperature': (8, 45),    # °C
            'humidity': (14, 100),     # %
            'ph': (3.5, 9.5),
            'rainfall': (20, 300)      # mm
        }

        for param, (min_val, max_val) in icar_ranges.items():
            value = weather.get(param)
            if value is not None:
                if not (min_val <= value <= max_val):
                    warnings.append(
                        f"⚠️ {param}: {value} is outside ICAR range ({min_val}-{max_val})")

        is_valid = len(warnings) == 0

        return is_valid, warnings


# ═════════════════════════════════════════════════════════════════════════════
# EXAMPLE USAGE
# ═════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":

    print("="*80)
    print("🌐 WEATHER DATA PROVIDER - DEMO")
    print("="*80)

    # Option 1: Manual Input (No API key needed)
    print("\n📌 OPTION 1: Manual Weather Input (No API)")
    print("-" * 80)

    manual_weather = {
        'temperature': 28,
        'humidity': 65,
        'ph': 7.0,
        'rainfall': 120
    }

    provider = WeatherDataProvider()  # No API key
    combined = provider.get_combined_weather({'weather': manual_weather})
    print(f"✅ Using manual weather: {combined}")

    # Option 2: With API Key (requires sign-up at openweathermap.org)
    print("\n📌 OPTION 2: API-Based Weather (Requires Free API Key)")
    print("-" * 80)
    print("""
    Steps to get Free OpenWeather API:
    1. Go to: https://openweathermap.org/api
    2. Click 'Sign Up' (Free tier available)
    3. Verify email
    4. Copy API Key from dashboard
    5. Paste below to test
    """)

    # Example with API (would need real key)
    api_key = input(
        "Enter your OpenWeather API key (or press Enter to skip): ").strip()

    if api_key:
        provider_api = WeatherDataProvider(api_key=api_key)

        # Get weather by city
        weather_mumbai = provider_api.get_weather_by_city("Mumbai", "IN")
        if weather_mumbai:
            print(f"\n📍 Mumbai Weather:")
            print(f"  Temperature: {weather_mumbai['temperature']}°C")
            print(f"  Humidity: {weather_mumbai['humidity']}%")
            print(f"  Description: {weather_mumbai['description']}")
            print(f"  Wind Speed: {weather_mumbai['wind_speed']} m/s")

        # Get forecast
        forecast = provider_api.get_seasonal_forecast(19.0760, 72.8777, days=5)
        if forecast:
            print(f"\n📅 5-Day Forecast:")
            print(f"  Average Temp: {forecast['average_temp']}°C")
            print(f"  Average Humidity: {forecast['average_humidity']}%")
            print(f"  Rain Probability: {forecast['rain_probability']}%")
    else:
        print("⏭️ Skipping API test (no key provided)")

    # IMD Regional Data
    print("\n📊 IMD Regional Data:")
    print("-" * 80)
    for region in ['north', 'south', 'central', 'east', 'west']:
        imd = WeatherDataProvider.get_imd_data_for_region(region)
        print(f"\n{region.upper()}:")
        for key, value in imd.items():
            print(f"  {key}: {value}")

    print("\n✅ Demo Complete!")
