# ═══════════════════════════════════════════════════════════════════════════════
# ICAR FERTILIZER OPTIMIZATION MODULE
# Indian Council of Agricultural Research (ICAR) - Based Recommendations
# Authentic Fertilizer Quantity Calculation using Soil NPK & Crop Requirements
# ═══════════════════════════════════════════════════════════════════════════════

import numpy as np
import pandas as pd
from typing import Dict, Tuple, List


class ICARFertilizerOptimizer:
    """
    ICAR-based Fertilizer Optimization System
    References:
    - ICAR Nutrient Management Manual
    - ICAR Technical Bulletin No. 46 (Soil Testing and Recommendations)
    - ICAR Fertilizer Use Efficiency Standards
    """

    # ═════════════════════════════════════════════════════════════════════════
    # ICAR SOIL TEST INTERPRETATION CATEGORIES
    # (Based on mg/kg in soil)
    # ═════════════════════════════════════════════════════════════════════════

    SOIL_TEST_CATEGORIES = {
        'N': {  # Available Nitrogen (kg/ha)
            'low': (0, 280),
            'medium': (280, 560),
            'high': (560, float('inf'))
        },
        'P': {  # Available Phosphorus (mg/kg)
            'low': (0, 10),
            'medium': (10, 25),
            'high': (25, float('inf'))
        },
        'K': {  # Available Potassium (mg/kg)
            'low': (0, 120),
            'medium': (120, 240),
            'high': (240, float('inf'))
        }
    }

    # ═════════════════════════════════════════════════════════════════════════
    # CROP NUTRIENT REQUIREMENT TABLE (ICAR Standards)
    # Units: kg/ha for N, P, K
    # ═════════════════════════════════════════════════════════════════════════

    CROP_NUTRIENT_REQUIREMENTS = {
        'rice': {'N': 120, 'P2O5': 60, 'K2O': 40, 'category': 'cereal'},
        'wheat': {'N': 120, 'P2O5': 60, 'K2O': 40, 'category': 'cereal'},
        'maize': {'N': 150, 'P2O5': 75, 'K2O': 40, 'category': 'cereal'},
        'cotton': {'N': 120, 'P2O5': 60, 'K2O': 60, 'category': 'cash'},
        'sugarcane': {'N': 150, 'P2O5': 75, 'K2O': 75, 'category': 'cash'},
        'potato': {'N': 150, 'P2O5': 75, 'K2O': 150, 'category': 'vegetable'},
        'onion': {'N': 120, 'P2O5': 60, 'K2O': 120, 'category': 'vegetable'},
        'tomato': {'N': 120, 'P2O5': 90, 'K2O': 120, 'category': 'vegetable'},
        'chickpea': {'N': 20, 'P2O5': 50, 'K2O': 40, 'category': 'pulse'},
        'soybean': {'N': 20, 'P2O5': 60, 'K2O': 40, 'category': 'pulse'},
        'groundnut': {'N': 25, 'P2O5': 50, 'K2O': 40, 'category': 'oilseed'},
        'sunflower': {'N': 60, 'P2O5': 40, 'K2O': 40, 'category': 'oilseed'},
        'bajra': {'N': 80, 'P2O5': 40, 'K2O': 40, 'category': 'cereal'},
        'jowar': {'N': 80, 'P2O5': 40, 'K2O': 40, 'category': 'cereal'},
        'barley': {'N': 100, 'P2O5': 50, 'K2O': 40, 'category': 'cereal'},
        'mustard': {'N': 60, 'P2O5': 40, 'K2O': 40, 'category': 'oilseed'},
        'linseed': {'N': 50, 'P2O5': 40, 'K2O': 40, 'category': 'oilseed'},
        'cabbage': {'N': 150, 'P2O5': 75, 'K2O': 100, 'category': 'vegetable'},
        'carrot': {'N': 120, 'P2O5': 60, 'K2O': 100, 'category': 'vegetable'},
        'bean': {'N': 20, 'P2O5': 50, 'K2O': 40, 'category': 'pulse'},
        'pea': {'N': 20, 'P2O5': 50, 'K2O': 40, 'category': 'pulse'},
        'apple': {'N': 100, 'P2O5': 50, 'K2O': 100, 'category': 'fruit'},
    }

    # ═════════════════════════════════════════════════════════════════════════
    # ICAR FERTILIZER ADJUSTMENT FACTORS
    # Based on soil test categories and residual nutrient availability
    # ═════════════════════════════════════════════════════════════════════════

    ADJUSTMENT_FACTORS = {
        'low': 1.0,      # Full dose needed
        'medium': 0.75,  # 75% of recommended dose
        'high': 0.5      # 50% of recommended dose (surplus nutrients present)
    }

    # ═════════════════════════════════════════════════════════════════════════
    # NUTRIENT CONVERSION FACTORS
    # Convert fertilizer compounds to elemental nutrients
    # ═════════════════════════════════════════════════════════════════════════

    FERTILIZER_CONVERSION = {
        'urea': {'N': 0.46},                    # Urea 46% N
        'DAP': {'N': 0.18, 'P2O5': 0.46},      # DAP (18% N, 46% P2O5)
        # Single Super Phosphate 16% P2O5
        'SSP': {'P2O5': 0.16},
        # Triple Super Phosphate 46% P2O5
        'TSP': {'P2O5': 0.46},
        'MOP': {'K2O': 0.60},                   # Muriate of Potash 60% K2O
        'SOP': {'K2O': 0.50},                   # Sulphate of Potash 50% K2O
        'NPK_10_26_26': {'N': 0.10, 'P2O5': 0.26, 'K2O': 0.26},
        'NPK_12_32_16': {'N': 0.12, 'P2O5': 0.32, 'K2O': 0.16},
    }

    # ═════════════════════════════════════════════════════════════════════════
    # ICAR RESIDUAL NUTRIENT FACTORS
    # Soil residual nutrients available (% of total soil nutrient)
    # ═════════════════════════════════════════════════════════════════════════

    RESIDUAL_NUTRIENT_AVAILABLE = {
        'N': 0.02,      # 2% of organic matter releases N per season
        'P': 0.25,      # 25% of residual P available
        'K': 0.15       # 15% of residual K available
    }

    # ═════════════════════════════════════════════════════════════════════════
    # ICAR CORRECTION FACTORS FOR SPECIFIC CONDITIONS
    # ═════════════════════════════════════════════════════════════════════════

    CONDITION_FACTORS = {
        'irrigated': 1.0,
        'rainfed': 0.85,           # 15% reduction in rainfed
        'organic_rich_soil': 0.9,  # 10% reduction in organic-rich soils
        'sandy_soil': 1.15,        # 15% increase in sandy soils
        'clayey_soil': 0.95,       # 5% reduction in clayey soils
    }

    # ═════════════════════════════════════════════════════════════════════════
    # ICAR MICRONUTRIENT DEFICIENCY RANGES
    # ═════════════════════════════════════════════════════════════════════════

    MICRONUTRIENT_STATUS = {
        # mg/kg
        'Zn': {'low': (0, 0.6), 'medium': (0.6, 1.2), 'high': (1.2, float('inf'))},
        'Fe': {'low': (0, 2.5), 'medium': (2.5, 5.0), 'high': (5.0, float('inf'))},
        'Cu': {'low': (0, 0.2), 'medium': (0.2, 0.8), 'high': (0.8, float('inf'))},
        'Mn': {'low': (0, 1.0), 'medium': (1.0, 4.0), 'high': (4.0, float('inf'))},
        'B': {'low': (0, 0.5), 'medium': (0.5, 1.0), 'high': (1.0, float('inf'))},
    }

    def __init__(self):
        """Initialize ICAR Fertilizer Optimizer"""
        self.last_recommendation = None

    # ═════════════════════════════════════════════════════════════════════════
    # CORE METHODS
    # ═════════════════════════════════════════════════════════════════════════

    def get_soil_test_category(self, nutrient: str, value: float) -> str:
        """
        Classify soil nutrient status based on ICAR standards

        Args:
            nutrient: 'N', 'P', or 'K'
            value: Soil test value (kg/ha for N, mg/kg for P and K)

        Returns:
            Category: 'low', 'medium', or 'high'
        """
        if nutrient not in self.SOIL_TEST_CATEGORIES:
            raise ValueError(f"Unknown nutrient: {nutrient}")

        if value < 0:
            raise ValueError(f"Soil nutrient level for {nutrient} cannot be negative (provided: {value})")

        categories = self.SOIL_TEST_CATEGORIES[nutrient]
        for category, (min_val, max_val) in categories.items():
            if min_val <= value < max_val:
                return category

        return 'high'  # If value exceeds all ranges

    def calculate_nutrient_requirement(self, crop: str, soil_npk: Dict[str, float],
                                       soil_type: str = 'loamy',
                                       irrigation: str = 'irrigated') -> Dict[str, float]:
        """
        Calculate recommended fertilizer quantity using ICAR methodology

        Args:
            crop: Crop name (must match CROP_NUTRIENT_REQUIREMENTS)
            soil_npk: Dictionary with 'N', 'P', 'K' soil test values
            soil_type: 'sandy', 'loamy', 'clayey'
            irrigation: 'irrigated' or 'rainfed'

        Returns:
            Dictionary with recommended N, P2O5, K2O in kg/ha
        """
        crop_lower = crop.lower().strip()

        # Get base crop requirement
        if crop_lower not in self.CROP_NUTRIENT_REQUIREMENTS:
            raise ValueError(f"Crop '{crop}' not in ICAR database. "
                             f"Available: {list(self.CROP_NUTRIENT_REQUIREMENTS.keys())}")

        base_req = self.CROP_NUTRIENT_REQUIREMENTS[crop_lower].copy()

        # Step 1: Get soil test categories
        N_category = self.get_soil_test_category('N', soil_npk.get('N', 280))
        P_category = self.get_soil_test_category('P', soil_npk.get('P', 10))
        K_category = self.get_soil_test_category('K', soil_npk.get('K', 120))

        # Step 2: Apply ICAR adjustment factors
        adjustment = {
            'N': self.ADJUSTMENT_FACTORS.get(N_category, 1.0),
            'P2O5': self.ADJUSTMENT_FACTORS.get(P_category, 1.0),
            'K2O': self.ADJUSTMENT_FACTORS.get(K_category, 1.0)
        }

        # Step 3: Apply soil type correction factors
        soil_factor = self.CONDITION_FACTORS.get(f"{soil_type}_soil", 1.0)
        if soil_factor == 1.0:  # Default for loamy
            soil_factor = 1.0

        # Step 4: Apply irrigation correction factor
        irr_factor = self.CONDITION_FACTORS.get(irrigation, 1.0)

        # Step 5: Calculate final recommendation
        recommendation = {
            'N': round(base_req['N'] * adjustment['N'] * irr_factor * soil_factor, 1),
            'P2O5': round(base_req['P2O5'] * adjustment['P2O5'] * irr_factor * soil_factor, 1),
            'K2O': round(base_req['K2O'] * adjustment['K2O'] * irr_factor * soil_factor, 1),
        }

        return {
            'recommendation': recommendation,
            'soil_status': {
                'N': N_category,
                'P': P_category,
                'K': K_category
            },
            'adjustments': adjustment,
            'correction_factors': {
                'soil_type': soil_factor,
                'irrigation': irr_factor
            }
        }

    def calculate_fertilizer_dose(self, nutrient_req: Dict[str, float],
                                  fertilizer_type: str = 'urea_dap_mop') -> Dict[str, float]:
        """
        Convert nutrient requirement to fertilizer quantity

        Args:
            nutrient_req: Dictionary with 'N', 'P2O5', 'K2O' in kg/ha
            fertilizer_type: Fertilizer combination to use
                - 'urea_dap_mop': Urea + DAP + MOP
                - 'urea_ssp_mop': Urea + SSP + MOP
                - 'npk_complex': Complex NPK fertilizer

        Returns:
            Dictionary with fertilizer quantities in kg/ha
        """
        result = {}

        if fertilizer_type == 'urea_dap_mop':
            # Urea (46% N), DAP (18% N, 46% P2O5), MOP (60% K2O)
            # Priority: Meet P requirement with DAP, then add Urea for remaining N

            # DAP provides both N and P
            dap_for_p = nutrient_req['P2O5'] / 0.46
            n_from_dap = dap_for_p * 0.18

            # Remaining N from Urea
            urea_n = (nutrient_req['N'] - n_from_dap)
            urea = urea_n / 0.46 if urea_n > 0 else 0

            # K from MOP
            mop = nutrient_req['K2O'] / 0.60

            result = {
                'Urea': round(urea, 1),
                'DAP': round(dap_for_p, 1),
                'MOP': round(mop, 1),
                'total': round(urea + dap_for_p + mop, 1)
            }

        elif fertilizer_type == 'urea_ssp_mop':
            # Urea (46% N), SSP (16% P2O5), MOP (60% K2O)
            urea = nutrient_req['N'] / 0.46
            ssp = nutrient_req['P2O5'] / 0.16
            mop = nutrient_req['K2O'] / 0.60

            result = {
                'Urea': round(urea, 1),
                'SSP': round(ssp, 1),
                'MOP': round(mop, 1),
                'total': round(urea + ssp + mop, 1)
            }

        elif fertilizer_type == 'npk_complex':
            # Generic NPK 12:32:16 complex
            total_npk = (nutrient_req['N'] / 0.12 +
                         nutrient_req['P2O5'] / 0.32 +
                         nutrient_req['K2O'] / 0.16) / 3

            result = {
                'NPK_12_32_16': round(total_npk, 1),
                'total': round(total_npk, 1)
            }

        return result

    def recommend_micronutrients(self, crop: str,
                                 micronutrient_values: Dict[str, float] = None) -> Dict[str, str]:
        """
        Recommend micronutrient supplementation based on crop requirements

        Args:
            crop: Crop name
            micronutrient_values: Dictionary with Zn, Fe, Cu, Mn, B values (mg/kg)

        Returns:
            Micronutrient recommendations
        """
        recommendations = {}

        # Default micronutrient values (if not provided)
        if micronutrient_values is None:
            micronutrient_values = {
                'Zn': 0.5,   # Low Zn
                'Fe': 2.0,   # Low Fe
                'Cu': 0.3,   # Low Cu
                'Mn': 2.5,   # Medium Mn
                'B': 0.4     # Low B
            }

        crop_micronutrient_requirement = {
            'rice': {'Zn': 2.0, 'Fe': 0.5, 'Cu': 0.3, 'Mn': 0.5, 'B': 0.3},
            'wheat': {'Zn': 2.0, 'Fe': 0.5, 'Cu': 0.3, 'Mn': 0.5, 'B': 0.3},
            'maize': {'Zn': 2.0, 'Fe': 0.5, 'Cu': 0.3, 'Mn': 0.5, 'B': 0.3},
            'cotton': {'Zn': 3.0, 'Fe': 0.5, 'Cu': 0.5, 'Mn': 1.0, 'B': 0.5},
            'potato': {'Zn': 2.0, 'Fe': 0.5, 'Cu': 0.3, 'Mn': 0.5, 'B': 0.5},
            'groundnut': {'Zn': 2.0, 'Fe': 0.5, 'Cu': 0.3, 'Mn': 0.5, 'B': 0.8},
        }

        default_req = {'Zn': 2.0, 'Fe': 0.5, 'Cu': 0.3, 'Mn': 0.5, 'B': 0.3}
        requirements = crop_micronutrient_requirement.get(
            crop.lower(), default_req)

        for micronutrient, required_value in requirements.items():
            actual_value = micronutrient_values.get(micronutrient, 0)

            if micronutrient in self.MICRONUTRIENT_STATUS:
                category = self._get_micronutrient_category(
                    micronutrient, actual_value)

                if category == 'low':
                    if micronutrient == 'Zn':
                        recommendations[micronutrient] = "Zinc Sulphate: 25 kg/ha"
                    elif micronutrient == 'Fe':
                        recommendations[micronutrient] = "FeSO4: 25 kg/ha"
                    elif micronutrient == 'Cu':
                        recommendations[micronutrient] = "CuSO4: 5 kg/ha"
                    elif micronutrient == 'Mn':
                        recommendations[micronutrient] = "MnSO4: 15 kg/ha"
                    elif micronutrient == 'B':
                        recommendations[micronutrient] = "Borax: 10 kg/ha"
                elif category == 'medium':
                    recommendations[micronutrient] = "Adequate (Spray if deficiency symptoms observed)"

        return recommendations

    def _get_micronutrient_category(self, nutrient: str, value: float) -> str:
        """Classify micronutrient status"""
        if nutrient not in self.MICRONUTRIENT_STATUS:
            return 'medium'

        ranges = self.MICRONUTRIENT_STATUS[nutrient]
        for category, (min_val, max_val) in ranges.items():
            if min_val <= value < max_val:
                return category
        return 'high'

    def generate_complete_recommendation(self,
                                         crop: str,
                                         soil_npk: Dict[str, float],
                                         soil_type: str = 'loamy',
                                         irrigation: str = 'irrigated',
                                         fertilizer_brand: str = 'urea_dap_mop',
                                         area_hectares: float = 1.0) -> Dict:
        """
        Generate complete fertilizer recommendation with all details

        Args:
            crop: Crop name
            soil_npk: Soil NPK values
            soil_type: 'sandy', 'loamy', 'clayey'
            irrigation: 'irrigated' or 'rainfed'
            fertilizer_brand: Fertilizer combination
            area_hectares: Area in hectares

        Returns:
            Complete recommendation report
        """
        # Step 1: Calculate nutrient requirement
        nutrient_calc = self.calculate_nutrient_requirement(
            crop, soil_npk, soil_type, irrigation)

        recommendation = nutrient_calc['recommendation']

        # Step 2: Convert to fertilizer
        fertilizer = self.calculate_fertilizer_dose(
            recommendation, fertilizer_brand)

        # Step 3: Scale to area
        fertilizer_scaled = {
            key: round(value * area_hectares, 1)
            for key, value in fertilizer.items()
        }

        # Step 4: Micronutrient recommendation
        micronutrients = self.recommend_micronutrients(crop)

        # Store recommendation
        self.last_recommendation = {
            'crop': crop,
            'soil_npk': soil_npk,
            'soil_type': soil_type,
            'irrigation': irrigation,
            'area': area_hectares
        }

        return {
            'crop': crop,
            'area_hectares': area_hectares,
            'soil_status': nutrient_calc['soil_status'],
            'nutrient_requirement_per_ha': recommendation,
            'fertilizer_dose_per_ha': {k: v for k, v in fertilizer.items() if k != 'total'},
            'fertilizer_total_per_ha': fertilizer.get('total', sum([v for k, v in fertilizer.items() if k != 'total'])),
            'fertilizer_for_area': fertilizer_scaled,
            'micronutrients': micronutrients,
            'application_schedule': self._get_application_schedule(crop),
            'notes': self._get_icar_notes(crop, nutrient_calc['soil_status'])
        }

    def _get_application_schedule(self, crop: str) -> List[str]:
        """Get ICAR recommended application schedule for crop"""
        schedules = {
            'rice': [
                '1/3 N + Full P + Full K as basal (at planting)',
                '1/3 N at 4 weeks',
                '1/3 N at 8 weeks'
            ],
            'wheat': [
                'Full P + Full K + 1/2 N at sowing',
                '1/2 N at 3-4 leaf stage'
            ],
            'maize': [
                'Full P + Full K + 1/2 N at planting',
                '1/2 N at 4-6 leaf stage'
            ],
            'potato': [
                'Full P + Full K + N at planting',
                'N top dress at 6-8 weeks if needed'
            ],
            'cotton': [
                'Full P + Full K + 1/3 N at sowing',
                '1/3 N at 6 weeks',
                '1/3 N at 10 weeks'
            ],
        }

        return schedules.get(crop.lower(), [
            '50% N + Full P + Full K at sowing',
            '50% N at 4-6 weeks after sowing'
        ])

    def _get_icar_notes(self, crop: str, soil_status: Dict[str, str]) -> List[str]:
        """Get ICAR-specific recommendations and notes"""
        notes = []

        notes.append(f"✅ Recommendation based on ICAR soil testing standards")

        # Nitrogen status note
        if soil_status['N'] == 'high':
            notes.append(
                "⚠️ High soil N detected - Reduce N dose to minimize environmental impact")
        elif soil_status['N'] == 'low':
            notes.append(
                "🔴 Low soil N - Ensure timely N application for maximum yield")

        # Phosphorus status note
        if soil_status['P'] == 'high':
            notes.append(
                "ℹ️ P level is adequate - Monitor for any deficiency symptoms")
        elif soil_status['P'] == 'low':
            notes.append(
                "🔴 Low soil P - Critical for root development, apply at sowing")

        # Potassium status note
        if soil_status['K'] == 'high':
            notes.append("ℹ️ K level is adequate - No additional K needed")
        elif soil_status['K'] == 'low':
            notes.append(
                "🔴 Low soil K - Important for fruit quality and disease resistance")

        # Crop-specific notes
        crop_notes = {
            'cotton': "Cotton requires high K for better fiber quality and disease resistance",
            'rice': "Rice requires split N application for maximum nutrient use efficiency",
            'sugarcane': "Sugarcane is K-intensive - ensure adequate K for higher sugar content",
            'groundnut': "Groundnut requires adequate Ca and S along with NPK",
            'potato': "Potato requires balanced nutrition - avoid excess N to prevent hollow heart",
        }

        if crop.lower() in crop_notes:
            notes.append(f"💡 {crop_notes[crop.lower()]}")

        notes.append(
            "📌 Always conduct soil testing annually for optimal recommendations")

        return notes


# ═════════════════════════════════════════════════════════════════════════════
# INTEGRATION WITH CROP RECOMMENDATION MODEL
# ═════════════════════════════════════════════════════════════════════════════

def integrate_with_crop_model(crop_recommendation: str, soil_npk: Dict[str, float],
                              soil_type: str = 'loamy', irrigation: str = 'irrigated',
                              area_hectares: float = 1.0) -> Dict:
    """
    Complete farm advisory - from crop recommendation to fertilizer optimization

    Args:
        crop_recommendation: Crop recommended by crop_model.pkl
        soil_npk: Soil test values {'N': x, 'P': x, 'K': x}
        soil_type: Type of soil
        irrigation: Irrigation type
        area_hectares: Farm area

    Returns:
        Complete fertilizer recommendation
    """
    optimizer = ICARFertilizerOptimizer()
    return optimizer.generate_complete_recommendation(
        crop_recommendation, soil_npk, soil_type, irrigation, area_hectares=area_hectares)


# ═════════════════════════════════════════════════════════════════════════════
# EXAMPLE USAGE
# ═════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("="*80)
    print("ICAR FERTILIZER OPTIMIZATION SYSTEM - DEMO")
    print("="*80)

    # Initialize optimizer
    optimizer = ICARFertilizerOptimizer()

    # Example 1: Rice with low N, medium P, low K
    print("\n📋 EXAMPLE 1: RICE CULTIVATION")
    print("-" * 80)

    rice_soil = {'N': 200, 'P': 12, 'K': 100}
    rice_rec = optimizer.generate_complete_recommendation(
        crop='Rice',
        soil_npk=rice_soil,
        soil_type='loamy',
        irrigation='irrigated',
        fertilizer_brand='urea_dap_mop',
        area_hectares=2.0
    )

    print(f"Crop: {rice_rec['crop']}")
    print(f"Area: {rice_rec['area_hectares']} hectares")
    print(f"\nSoil Status:")
    for nutrient, status in rice_rec['soil_status'].items():
        print(f"  {nutrient}: {status}")

    print(f"\nNutrient Requirement (per ha):")
    for nutrient, value in rice_rec['nutrient_requirement_per_ha'].items():
        print(f"  {nutrient}: {value} kg/ha")

    print(f"\nFertilizer Recommendation (for {rice_rec['area_hectares']} ha):")
    for fertilizer, qty in rice_rec['fertilizer_for_area'].items():
        if fertilizer != 'total':
            print(f"  {fertilizer}: {qty} kg")
    print(f"  TOTAL: {rice_rec['fertilizer_for_area'].get('total', 'N/A')} kg")

    print(f"\nApplication Schedule:")
    for step, schedule in enumerate(rice_rec['application_schedule'], 1):
        print(f"  Stage {step}: {schedule}")

    print(f"\nMicronutrients:")
    if rice_rec['micronutrients']:
        for micronutrient, recommendation in rice_rec['micronutrients'].items():
            print(f"  {micronutrient}: {recommendation}")
    else:
        print("  ✅ No deficiencies detected")

    print(f"\n📌 ICAR Notes:")
    for note in rice_rec['notes']:
        print(f"  {note}")

    # Example 2: Cotton with different soil conditions
    print("\n" + "="*80)
    print("📋 EXAMPLE 2: COTTON CULTIVATION (Rainfed)")
    print("-" * 80)

    cotton_soil = {'N': 150, 'P': 8, 'K': 80}
    cotton_rec = optimizer.generate_complete_recommendation(
        crop='Cotton',
        soil_npk=cotton_soil,
        soil_type='sandy',
        irrigation='rainfed',
        fertilizer_brand='urea_ssp_mop',
        area_hectares=1.5
    )

    print(f"Crop: {cotton_rec['crop']}")
    print(f"Area: {cotton_rec['area_hectares']} hectares (Sandy, Rainfed)")
    print(f"\nFertilizer Recommendation:")
    for fertilizer, qty in cotton_rec['fertilizer_for_area'].items():
        if fertilizer != 'total':
            print(f"  {fertilizer}: {qty} kg")
    print(
        f"  TOTAL: {cotton_rec['fertilizer_for_area'].get('total', 'N/A')} kg")

    print("\n✅ Demo complete!")
