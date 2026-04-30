"""Tests for Crop Recommendation API endpoints."""
import requests
import json
import sys

BASE = "http://localhost:8001"
passed = 0
failed = 0

def test(name, func):
    global passed, failed
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print(f"{'='*60}")
    try:
        func()
        passed += 1
        print("  [PASS]")
    except AssertionError as e:  # noqa
        failed += 1
        print(f"  [FAIL]: {e}")
    except Exception as e:
        failed += 1
        print(f"  [ERROR]: {e}")

def test_recommend_basic():
    r = requests.post(f"{BASE}/recommend", json={
        "n": 200, "p": 12, "k": 100,
        "ph": 7.0, "rainfall": 120, "temperature": 28, "humidity": 65
    })
    assert r.status_code == 200, f"Status {r.status_code}"
    data = r.json()
    print(f"  Crop: {data['crop']}, Confidence: {data['confidence']}")
    assert "crop" in data, "Missing 'crop' field"
    assert "confidence" in data, "Missing 'confidence' field"

def test_fertilizer_basic():
    r = requests.post(f"{BASE}/fertilizer", json={
        "crop": "rice", "n": 200, "p": 12, "k": 100, "area": 2.5
    })
    assert r.status_code == 200, f"Status {r.status_code}"
    data = r.json()
    print(f"  Crop: {data['crop']}")
    print(f"  Soil Status: {data['soil_status']}")
    print(f"  Schedule: {data['application_schedule']}")
    # Check schedule strings are clean (no stray quotes from the bug)
    for s in data["application_schedule"]:
        assert '"' not in s, f"Stray quote in schedule: {s}"

def test_recommend_different_inputs():
    r = requests.post(f"{BASE}/recommend", json={
        "n": 90, "p": 42, "k": 43,
        "ph": 6.5, "rainfall": 80, "temperature": 22, "humidity": 82
    })
    assert r.status_code == 200, f"Status {r.status_code}"
    data = r.json()
    print(f"  Crop: {data['crop']}, Confidence: {data['confidence']}")

def test_fertilizer_unknown_crop():
    r = requests.post(f"{BASE}/fertilizer", json={
        "crop": "unicorn_fruit", "n": 50, "p": 30, "k": 60, "area": 1
    })
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"
    print(f"  Correctly rejected unknown crop (400)")

def test_recommend_optional_humidity():
    r = requests.post(f"{BASE}/recommend", json={
        "n": 40, "p": 60, "k": 40,
        "ph": 6.8, "rainfall": 200, "temperature": 30
    })
    assert r.status_code == 200, f"Status {r.status_code}"
    data = r.json()
    print(f"  Crop: {data['crop']}, Confidence: {data['confidence']}")
    # humidity should default to 50.0

def test_recommend_missing_required():
    r = requests.post(f"{BASE}/recommend", json={
        "n": 40, "p": 60
    })
    assert r.status_code == 422, f"Expected 422, got {r.status_code}"
    print(f"  Correctly rejected incomplete request (422)")

def test_fertilizer_multiple_crops():
    for crop in ["wheat", "maize", "cotton", "potato"]:
        r = requests.post(f"{BASE}/fertilizer", json={
            "crop": crop, "n": 150, "p": 15, "k": 110, "area": 1.0
        })
        assert r.status_code == 200, f"Status {r.status_code} for {crop}"
        data = r.json()
        print(f"  {crop}: total fertilizer/ha = {data['fertilizer_total_per_ha']} kg")

if __name__ == "__main__":
    test("Recommend - Basic", test_recommend_basic)
    test("Fertilizer - Basic (rice schedule fix)", test_fertilizer_basic)
    test("Recommend - Different inputs", test_recommend_different_inputs)
    test("Fertilizer - Unknown crop (400)", test_fertilizer_unknown_crop)
    test("Recommend - Optional humidity default", test_recommend_optional_humidity)
    test("Recommend - Missing required fields (422)", test_recommend_missing_required)
    test("Fertilizer - Multiple crops", test_fertilizer_multiple_crops)

    print(f"\n{'='*60}")
    print(f"RESULTS: {passed} passed, {failed} failed out of {passed+failed} tests")
    print(f"{'='*60}")
    sys.exit(0 if failed == 0 else 1)
