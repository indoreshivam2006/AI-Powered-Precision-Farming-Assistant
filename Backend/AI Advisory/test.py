"""
Quick test script for KisanMitra agent.
Run: python test.py
"""

import sys
import io

# Force UTF-8 output on Windows (cp1252 console can't handle Hindi/Marathi)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from agent import ask_agent


def main():
    print("=" * 60)
    print("  [KisanMitra] Agent -- Test Suite")
    print("=" * 60)

    tests = [
        {
            "name": "Hindi — Crop disease query",
            "query": "मेरे गेहूं की पत्तियाँ पीली हो रही हैं, क्या करूँ?",
            "lang": "hi",
        },
        {
            "name": "English — Crop recommendation",
            "query": "What crop should I grow in black soil in Vidarbha?",
            "lang": "en",
        },
        {
            "name": "Hindi — Government scheme",
            "query": "PM-KISAN योजना में कैसे रजिस्टर करें?",
            "lang": "hi",
        },
        {
            "name": "English — Fertilizer advice",
            "query": "How much urea should I apply for wheat per acre?",
            "lang": "en",
        },
    ]

    for i, test in enumerate(tests, 1):
        print(f"\n{'-' * 60}")
        print(f"Test {i}: {test['name']}")
        print(f"[FARMER] Query: {test['query']}")
        print(f"   Language: {test['lang']}")
        print("-" * 60)

        try:
            result = ask_agent(test["query"], lang=test["lang"])
            print(f"[AGENT] Response ({result['language']}):") 
            print(result["response"])
            print("[OK] PASSED")
        except Exception as e:
            print(f"[FAIL] FAILED: {e}")

    print(f"\n{'=' * 60}")
    print("  Test suite complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
