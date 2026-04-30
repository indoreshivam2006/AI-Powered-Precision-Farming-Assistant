# ═══════════════════════════════════════════════════════════════════════════════
# INTEGRATED FARM ADVISORY SYSTEM
# Combines Crop Recommendation Model + Fertilizer Optimization
# ═══════════════════════════════════════════════════════════════════════════════

import pickle
import os
import json
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from datetime import datetime
from dotenv import load_dotenv
from fertilizer_optimizer import ICARFertilizerOptimizer

# Load API key from .env file
load_dotenv()
OPENWEATHER_API_KEY = os.getenv('OPEN_WEATHER_API_KEY')


class FarmAdvisorySystem:
    """
    Complete AI-Powered Farm Advisory System
    Integrates:
    1. Crop Recommendation (ML Model)
    2. Fertilizer Optimization (ICAR Formulas)
    3. Farm Planning & Scheduling
    """

    def __init__(self, model_path: str = None, scaler_path: str = None):
        """
        Initialize Farm Advisory System

        Args:
            model_path: Path to crop_model.pkl
            scaler_path: Path to crop_scaler.pkl
        """
        self.project_root = os.path.dirname(os.path.abspath(__file__))
        self.model_path = model_path or os.path.join(
            self.project_root, 'crop_model.pkl')
        self.scaler_path = scaler_path or os.path.join(
            self.project_root, 'crop_scaler.pkl')

        # Load models
        self.crop_model = self._load_model(self.model_path)
        self.scaler = self._load_model(self.scaler_path)

        # Initialize ICAR Fertilizer Optimizer
        self.fertilizer_optimizer = ICARFertilizerOptimizer()

        try:
            from weather_api_provider import WeatherDataProvider
            self.weather_provider = WeatherDataProvider(api_key=OPENWEATHER_API_KEY)
            if OPENWEATHER_API_KEY:
                print(f"  [OK] Weather API configured (real-time weather enabled)")
            else:
                print(f"  [INFO] No API key in .env, using manual weather input")
        except ImportError:
            print(f"  [WARN] weather_api_provider not found, weather API disabled")
            self.weather_provider = None

        # Feature order (must match training)
        self.feature_order = ['N', 'P', 'K', 'temperature',
                              'humidity', 'ph', 'rainfall', 'avg_yield']

        print("[OK] Farm Advisory System initialized successfully!")

    def _load_model(self, path: str):
        """Load pickled model/scaler"""
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model not found: {path}")

        with open(path, 'rb') as f:
            model = pickle.load(f)
        print(f"  [OK] Loaded: {os.path.basename(path)}")
        return model

    def recommend_crop(self, soil_npk: Dict[str, float],
                       weather: Dict[str, float]) -> Tuple[str, float]:
        """
        Recommend best crop based on soil and weather

        Args:
            soil_npk: {'N': value, 'P': value, 'K': value}
            weather: {'temperature': value, 'humidity': value, 'ph': value, 'rainfall': value}

        Returns:
            Tuple of (crop_name, confidence)
        """
        # Prepare input features
        features_dict = {**soil_npk, **weather}

        # Create feature vector in correct order
        feature_vector = np.array([
            # Exclude avg_yield
            features_dict[feat] for feat in self.feature_order[:-1]
        ]).reshape(1, -1)

        # Add dummy avg_yield (not used for prediction)
        feature_vector = np.hstack([feature_vector, [[2000]]])

        # Scale features
        X_scaled = self.scaler.transform(feature_vector)

        # Get prediction and probability
        crop_prediction = self.crop_model.predict(X_scaled)[0]
        crop_probability = self.crop_model.predict_proba(X_scaled)[0]
        confidence = np.max(crop_probability)

        return crop_prediction, float(confidence)

    def get_top_crop_recommendations(self, soil_npk: Dict[str, float],
                                     weather: Dict[str, float],
                                     top_n: int = 3) -> List[Tuple[str, float]]:
        """
        Get top N crop recommendations with confidence scores

        Args:
            soil_npk: Soil nutrients
            weather: Weather parameters
            top_n: Number of recommendations

        Returns:
            List of (crop, confidence) tuples
        """
        # Prepare features
        features_dict = {**soil_npk, **weather}
        feature_vector = np.array([
            features_dict[feat] for feat in self.feature_order[:-1]
        ]).reshape(1, -1)
        feature_vector = np.hstack([feature_vector, [[2000]]])

        X_scaled = self.scaler.transform(feature_vector)

        # Get probabilities for all classes
        probabilities = self.crop_model.predict_proba(X_scaled)[0]
        classes = self.crop_model.classes_

        # Sort by probability
        crop_probs = list(zip(classes, probabilities))
        crop_probs.sort(key=lambda x: x[1], reverse=True)

        return crop_probs[:top_n]

    def generate_complete_farm_plan(self, farm_data: Dict) -> Dict:
        """
        Generate complete farm advisory plan

        Args:
            farm_data: Dictionary containing:
                - 'soil_npk': {'N': x, 'P': x, 'K': x}
                - 'weather': {'temperature': x, 'humidity': x, 'ph': x, 'rainfall': x}
                - 'area_hectares': float
                - 'soil_type': 'sandy', 'loamy', 'clayey'
                - 'irrigation': 'irrigated', 'rainfed'
                - 'farmer_name': str (optional)
                - 'farm_location': str (optional)

        Returns:
            Complete farm plan with recommendations
        """
        plan_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Extract data
        soil_npk = farm_data.get('soil_npk', {})
        weather = farm_data.get('weather', {})
        area = farm_data.get('area_hectares', 1.0)
        soil_type = farm_data.get('soil_type', 'loamy')
        irrigation = farm_data.get('irrigation', 'irrigated')

        # Auto-fetch weather from API if not provided
        if not weather and self.weather_provider:
            farm_location = farm_data.get('farm_location', '')
            if farm_location:
                print(f"  [FETCH] Fetching real-time weather for {farm_location}...")
                api_weather = self.weather_provider.get_weather_by_city(
                    farm_location.split(',')[0])
                if api_weather:
                    weather = api_weather
                    print(
                        f"  [OK] Weather fetched: {weather['temperature']}°C, {weather['humidity']}% humidity")
            else:
                print(
                    f"  [INFO] No farm_location provided, weather will be manual or default")

        # Ensure weather has required fields
        weather.setdefault('temperature', 25)
        weather.setdefault('humidity', 50)
        weather.setdefault('ph', 7.0)
        weather.setdefault('rainfall', 100)

        # Step 1: Get crop recommendation
        primary_crop, confidence = self.recommend_crop(soil_npk, weather)
        top_crops = self.get_top_crop_recommendations(
            soil_npk, weather, top_n=3)

        # Step 2: Get fertilizer recommendation
        fertilizer_rec = self.fertilizer_optimizer.generate_complete_recommendation(
            crop=primary_crop,
            soil_npk=soil_npk,
            soil_type=soil_type,
            irrigation=irrigation,
            fertilizer_brand='urea_dap_mop',
            area_hectares=area
        )

        # Compile plan
        plan = {
            'timestamp': plan_date,
            'farmer_info': {
                'name': farm_data.get('farmer_name', 'Not provided'),
                'location': farm_data.get('farm_location', 'Not provided'),
                'farm_area': area
            },
            'soil_analysis': {
                'nitrogen': {
                    'value': soil_npk.get('N'),
                    'unit': 'kg/ha',
                    'status': fertilizer_rec['soil_status']['N']
                },
                'phosphorus': {
                    'value': soil_npk.get('P'),
                    'unit': 'mg/kg',
                    'status': fertilizer_rec['soil_status']['P']
                },
                'potassium': {
                    'value': soil_npk.get('K'),
                    'unit': 'mg/kg',
                    'status': fertilizer_rec['soil_status']['K']
                }
            },
            'weather_analysis': {
                'temperature': {
                    'value': weather.get('temperature'),
                    'unit': '°C'
                },
                'humidity': {
                    'value': weather.get('humidity'),
                    'unit': '%'
                },
                'ph': {
                    'value': weather.get('ph'),
                    'status': 'optimal' if 6.0 <= weather.get('ph', 7) <= 7.5 else 'needs_adjustment'
                },
                'rainfall': {
                    'value': weather.get('rainfall'),
                    'unit': 'mm'
                }
            },
            'crop_recommendations': {
                'primary_crop': primary_crop,
                'confidence_score': f"{confidence*100:.1f}%",
                'alternative_crops': [
                    {'crop': crop, 'confidence': f"{prob*100:.1f}%"}
                    for crop, prob in top_crops[1:3]
                ]
            },
            'fertilizer_plan': {
                'crop': fertilizer_rec['crop'],
                'total_fertilizer_per_ha': fertilizer_rec['fertilizer_total_per_ha'],
                'fertilizer_details': fertilizer_rec['fertilizer_dose_per_ha'],
                'total_for_farm': fertilizer_rec['fertilizer_for_area'],
                'application_schedule': fertilizer_rec['application_schedule'],
                'micronutrient_recommendations': fertilizer_rec['micronutrients']
            },
            'farm_conditions': {
                'soil_type': soil_type,
                'irrigation_type': irrigation,
                'area_hectares': area
            },
            'icar_recommendations': fertilizer_rec['notes']
        }

        return plan

    def export_plan_to_json(self, plan: Dict, filename: str = None) -> str:
        """Export farm plan to JSON file"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"farm_plan_{timestamp}.json"

        filepath = os.path.join(self.project_root, filename)

        with open(filepath, 'w') as f:
            json.dump(plan, f, indent=2)

        print(f"[OK] Farm plan exported to: {filepath}")
        return filepath

    def export_plan_to_csv(self, plan: Dict, filename: str = None) -> str:
        """Export fertilizer details to CSV for easy reference"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"fertilizer_schedule_{timestamp}.csv"

        filepath = os.path.join(self.project_root, filename)

        # Create DataFrame from fertilizer details
        fertilizer_data = []

        for stage, schedule in enumerate(plan['fertilizer_plan']['application_schedule'], 1):
            fertilizer_data.append({
                'Stage': f"Stage {stage}",
                'Schedule': schedule,
                'Crop': plan['fertilizer_plan']['crop'],
                'Area (ha)': plan['farmer_info']['farm_area']
            })

        df = pd.DataFrame(fertilizer_data)
        df.to_csv(filepath, index=False)

        print(f"[OK] Fertilizer schedule exported to: {filepath}")
        return filepath

    def print_farm_plan(self, plan: Dict):
        """Pretty print farm plan to console"""
        print("\n" + "="*80)
        print("  AI-POWERED FARM ADVISORY PLAN")
        print("="*80)

        print(f"\n  Generated: {plan['timestamp']}")
        print(f"\n  FARMER INFORMATION")
        print(f"  Name: {plan['farmer_info']['name']}")
        print(f"  Location: {plan['farmer_info']['location']}")
        print(f"  Farm Area: {plan['farmer_info']['farm_area']} hectares")

        print(f"\n  SOIL ANALYSIS")
        soil = plan['soil_analysis']
        print(
            f"  Nitrogen (N):     {soil['nitrogen']['value']} {soil['nitrogen']['unit']} [{soil['nitrogen']['status'].upper()}]")
        print(
            f"  Phosphorus (P):   {soil['phosphorus']['value']} {soil['phosphorus']['unit']} [{soil['phosphorus']['status'].upper()}]")
        print(
            f"  Potassium (K):    {soil['potassium']['value']} {soil['potassium']['unit']} [{soil['potassium']['status'].upper()}]")

        print(f"\n  WEATHER ANALYSIS")
        weather = plan['weather_analysis']
        print(f"  Temperature:  {weather['temperature']['value']}°C")
        print(f"  Humidity:     {weather['humidity']['value']}%")
        print(
            f"  pH:           {weather['ph']['value']} [{weather['ph']['status']}]")
        print(f"  Rainfall:     {weather['rainfall']['value']} mm")

        print(f"\n  CROP RECOMMENDATION")
        crop_rec = plan['crop_recommendations']
        print(f"  Primary Crop: {crop_rec['primary_crop']}")
        print(f"  Confidence:   {crop_rec['confidence_score']}")
        if crop_rec['alternative_crops']:
            print(f"\n  Alternative Options:")
            for alt in crop_rec['alternative_crops']:
                print(f"    • {alt['crop']}: {alt['confidence']}")

        print(f"\n  FERTILIZER RECOMMENDATION")
        fert = plan['fertilizer_plan']
        print(f"  Per Hectare:")
        print(f"    • Total Fertilizer: {fert['total_fertilizer_per_ha']} kg")
        print(f"    • Details: {fert['fertilizer_details']}")

        print(f"\n  For {plan['farmer_info']['farm_area']} Hectares:")
        for fertilizer, qty in fert['total_for_farm'].items():
            if fertilizer != 'total':
                print(f"    • {fertilizer}: {qty} kg")
        if 'total' in fert['total_for_farm']:
            print(
                f"    TOTAL FERTILIZER NEEDED: {fert['total_for_farm']['total']} kg")

        print(f"\n  APPLICATION SCHEDULE")
        for i, schedule in enumerate(fert['application_schedule'], 1):
            print(f"  {i}. {schedule}")

        if fert['micronutrient_recommendations']:
            print(f"\n  MICRONUTRIENT RECOMMENDATIONS")
            for micro, rec in fert['micronutrient_recommendations'].items():
                print(f"  • {micro}: {rec}")

        print(f"\n  ICAR EXPERT RECOMMENDATIONS")
        for note in plan['icar_recommendations']:
            print(f"  {note}")

        print(f"\n  FARM CONDITIONS")
        print(f"  Soil Type:    {plan['farm_conditions']['soil_type']}")
        print(f"  Irrigation:   {plan['farm_conditions']['irrigation_type']}")

        print("\n" + "="*80)
        print("[OK] Farm Plan Complete - Follow recommendations for optimal yield!")
        print("="*80 + "\n")


# ═════════════════════════════════════════════════════════════════════════════
# DEMO & TESTING
# ═════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":

    print("\n" + "="*80)
    print("  INITIALIZING FARM ADVISORY SYSTEM")
    print("="*80 + "\n")

    # Initialize system
    advisory_system = FarmAdvisorySystem()

    # Sample farm data
    farmer_data = {
        'farmer_name': 'Rajesh Kumar',
        'farm_location': 'Maharashtra, India',
        'area_hectares': 2.5,
        'soil_type': 'loamy',
        'irrigation': 'irrigated',
        'soil_npk': {
            'N': 200,      # kg/ha
            'P': 12,       # mg/kg
            'K': 100       # mg/kg
        },
        'weather': {
            'temperature': 28,    # °C
            'humidity': 65,       # %
            'ph': 7.0,            # pH
            'rainfall': 120       # mm
        }
    }

    print("  GENERATING COMPREHENSIVE FARM PLAN...")
    print("-" * 80)

    # Generate plan
    farm_plan = advisory_system.generate_complete_farm_plan(farmer_data)

    # Print plan
    advisory_system.print_farm_plan(farm_plan)

    # Export plan
    print("\n  EXPORTING RECOMMENDATIONS...")
    advisory_system.export_plan_to_json(farm_plan)
    advisory_system.export_plan_to_csv(farm_plan)

    print("\n[OK] Demo Complete! System is ready for deployment.")
