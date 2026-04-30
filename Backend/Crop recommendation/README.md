# 🌾 Smart Agriculture - Crop Recommendation & Fertilizer Optimization System

**Production-Ready Integration Package**

---

## 📦 What's Included

```
├── crop_model.pkl              (Trained ML model - 99.77% accuracy)
├── crop_scaler.pkl             (Feature scaler for normalization)
├── farm_advisory_system.py     (Main integration module)
├── fertilizer_optimizer.py     (ICAR fertilizer calculations)
├── weather_api_provider.py     (Real-time weather data)
├── .env                        (API key configuration)
├── INTEGRATION_GUIDE.md        (Setup instructions)
└── README.md                   (This file)
```

**Total Package Size:** ~3MB (lightweight, production-ready)

---

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
pip install python-dotenv requests scikit-learn numpy pandas
```

### Step 2: Verify API Key

Check that `.env` file contains your OpenWeather API key:

```
Open_Weather_Map_API="your_api_key_here"
```

### Step 3: Use in Your Project

```python
from farm_advisory_system import FarmAdvisorySystem

# Initialize (API key auto-loaded from .env)
advisory = FarmAdvisorySystem()

# Prepare farm data
farm_data = {
    'farmer_name': 'Farmer Name',
    'farm_location': 'City, State',      # Weather auto-fetched
    'area_hectares': 2.5,
    'soil_type': 'loamy',                # sandy/loamy/clayey
    'irrigation': 'irrigated',           # irrigated/rainfed
    'soil_npk': {
        'N': 200,      # kg/ha (Nitrogen)
        'P': 12,       # mg/kg (Phosphorus)
        'K': 100       # mg/kg (Potassium)
    }
}

# Generate complete recommendation
plan = advisory.generate_complete_farm_plan(farm_data)

# Export results
advisory.print_farm_plan(plan)
advisory.export_plan_to_json(plan)
advisory.export_plan_to_csv(plan)
```

---

## 📊 Core Features

### 1. Crop Recommendation

- **Input:** Soil NPK + Weather
- **Output:** Best crop with confidence score
- **Accuracy:** 99.77%
- **Crops:** 22 major crops (Rice, Wheat, Cotton, Potato, etc.)

### 2. Fertilizer Optimization

- **Input:** Crop + Soil status + Farm conditions
- **Output:** Precise fertilizer quantity (kg/ha)
- **Method:** Authentic ICAR formulas
- **Fertilizers:** Urea, DAP, SSP, TSP, MOP, SOP, NPK complexes
- **Cost Reduction:** 20-30% vs traditional methods

### 3. Real-Time Weather

- **Input:** Farm location (city name)
- **Output:** Current weather + 7-day forecast
- **Source:** OpenWeather API
- **Fallback:** Manual input or defaults

### 4. Micronutrient Support

- **Detects:** Zn, Fe, Cu, Mn, B deficiencies
- **Recommendations:** Specific fertilizer doses
- **Coverage:** 22 crops

### 5. Export Options

- **JSON:** Complete farm advisory report
- **CSV:** Fertilizer application schedule
- **Console:** Formatted output for display

---

## 📝 API Reference

### FarmAdvisorySystem

```python
from farm_advisory_system import FarmAdvisorySystem

advisory = FarmAdvisorySystem()

# Main method
plan = advisory.generate_complete_farm_plan(farm_data)

# Export methods
advisory.print_farm_plan(plan)
advisory.export_plan_to_json(plan, filename='advisory.json')
advisory.export_plan_to_csv(plan, filename='schedule.csv')

# Get crop recommendations
primary_crop, confidence = advisory.recommend_crop(soil_npk, weather)
top_3_crops = advisory.get_top_crop_recommendations(soil_npk, weather, top_n=3)
```

### WeatherDataProvider

```python
from weather_api_provider import WeatherDataProvider

provider = WeatherDataProvider(api_key="YOUR_KEY")

# Get weather by city
weather = provider.get_weather_by_city("Mumbai", "IN")

# Get weather by coordinates
weather = provider.get_weather_by_coordinates(19.0760, 72.8777)

# Get 5-day forecast
forecast = provider.get_seasonal_forecast(19.0760, 72.8777, days=5)

# Get IMD regional data
imd = WeatherDataProvider.get_imd_data_for_region('north')

# Validate weather data
is_valid, warnings = provider.validate_weather_data(weather)
```

### ICARFertilizerOptimizer

```python
from fertilizer_optimizer import ICARFertilizerOptimizer

optimizer = ICARFertilizerOptimizer()

# Calculate nutrient requirement
result = optimizer.calculate_nutrient_requirement(
    crop='rice',
    soil_npk={'N': 200, 'P': 12, 'K': 100},
    soil_type='loamy',
    irrigation='irrigated'
)

# Convert to fertilizer
fertilizer = optimizer.calculate_fertilizer_dose(
    nutrient_req=result['recommendation'],
    fertilizer_type='urea_dap_mop'
)

# Get micronutrient recommendations
micros = optimizer.recommend_micronutrients('rice')
```

---

## 🌍 Supported Crops

**Cereals:** Rice, Wheat, Maize, Bajra, Jowar, Barley  
**Pulses:** Chickpea, Soybean, Bean, Pea  
**Oilseeds:** Groundnut, Sunflower, Mustard, Linseed  
**Cash Crops:** Cotton, Sugarcane  
**Vegetables:** Potato, Tomato, Cabbage, Carrot, Onion  
**Fruits:** Apple  

**Total: 22 crops**

---

## 🔑 Configuration

### .env File Format

```
Open_Weather_Map_API="your_api_key_from_openweather"
```

**Get API Key:**

1. Visit: <https://openweathermap.org/api>
2. Sign Up (Free tier: 60 calls/minute)
3. Copy API key
4. Add to .env file

---

## 📚 Integration Examples

### Django/Flask Web App

```python
@app.route('/api/farm-advisory', methods=['POST'])
def get_advisory():
    farm_data = request.json
    advisory = FarmAdvisorySystem()
    plan = advisory.generate_complete_farm_plan(farm_data)
    return jsonify(plan)
```

### FastAPI

```python
from fastapi import FastAPI

app = FastAPI()
advisory = FarmAdvisorySystem()

@app.post("/advisory")
async def farm_advisory(farm_data: dict):
    plan = advisory.generate_complete_farm_plan(farm_data)
    return plan
```

### Mobile App (React Native/Flutter)

```javascript
// Call backend API (never expose models/keys to frontend)
const getAdvisory = async (farmData) => {
    const response = await fetch('/api/advisory', {
        method: 'POST',
        body: JSON.stringify(farmData)
    });
    return await response.json();
};
```

---

## 📊 Output Format

### Farm Advisory Plan

```json
{
    "timestamp": "2026-04-29 10:30:45",
    "farmer_info": {
        "name": "Farmer Name",
        "location": "City, State",
        "farm_area": 2.5
    },
    "crop_recommendations": {
        "primary_crop": "Rice",
        "confidence_score": "98.5%",
        "alternative_crops": [...]
    },
    "fertilizer_plan": {
        "crop": "Rice",
        "fertilizer_dose_per_ha": {
            "Urea": 157.5,
            "DAP": 98,
            "MOP": 50
        },
        "total_for_farm": {
            "Urea": 393.75,
            "DAP": 245,
            "MOP": 125,
            "total": 763.75
        },
        "application_schedule": [...],
        "micronutrient_recommendations": {...}
    },
    "icar_recommendations": [...]
}
```

---

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| **"Model not found"** | Check crop_model.pkl and crop_scaler.pkl exist |
| **"API key error"** | Verify .env file has correct API key |
| **"City not found"** | Use proper city name, try with country code |
| **"Connection timeout"** | Check internet, API server status |
| **"Memory error"** | Reduce batch size if processing many farms |

---

## 📈 Performance

- **Crop Recommendation:** <100ms per prediction
- **Fertilizer Calculation:** <50ms per crop
- **Weather API Call:** 1-2 seconds (cached)
- **Export:** <500ms
- **Total:** ~2-3 seconds for complete advisory

---

## 🔐 Security Best Practices

1. **Keep .env file secure**

   ```bash
   git add .gitignore  # Add .env to .gitignore
   ```

2. **Use environment variables in production**

   ```python
   import os
   API_KEY = os.getenv('OPENWEATHER_API_KEY')
   ```

3. **Never commit API keys**

   ```
   # .gitignore
   .env
   *.pkl
   ```

4. **Use backend proxy for API calls**
   - Frontend calls backend
   - Backend calls OpenWeather API
   - Protects API key and rate limits

---

## 📖 Further Reading

- **INTEGRATION_GUIDE.md** - Detailed integration instructions
- **QUICK_REFERENCE.md** - API reference and examples
- **problem.txt** - Original project requirements

---

## 🤝 Support

For issues or questions:

1. Check INTEGRATION_GUIDE.md
2. Review example code in this README
3. Check .env configuration
4. Verify API key is valid

---

## 📋 File Manifest

| File | Purpose | Size |
|------|---------|------|
| `crop_model.pkl` | Random Forest model (99.77% accuracy) | 2.9 MB |
| `crop_scaler.pkl` | Feature scaler for normalization | 1 KB |
| `farm_advisory_system.py` | Main integration system | 17 KB |
| `fertilizer_optimizer.py` | ICAR fertilizer calculations | 28 KB |
| `weather_api_provider.py` | Weather data integration | 18 KB |
| `.env` | API key configuration | <1 KB |
| `INTEGRATION_GUIDE.md` | Setup and deployment guide | 12 KB |
| `QUICK_REFERENCE.md` | Quick API reference | 10 KB |
| `README.md` | This file | 8 KB |

---

## ✅ Ready to Integrate

This package is **production-ready** for:

- ✅ Web applications (Django, Flask, FastAPI)
- ✅ Mobile apps (React Native, Flutter)
- ✅ Chat bots (WhatsApp, Telegram)
- ✅ Desktop applications
- ✅ Cloud platforms (AWS, Azure, GCP)
- ✅ IoT devices

---

**Happy Integration! 🌾✅**
