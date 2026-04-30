"""Send two test requests to the running server."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import requests

print("=" * 60)
print("TEST 1: What is the current price of wheat in Punjab?")
print("=" * 60)
r1 = requests.post("http://localhost:8080/chat", json={
    "query": "What is the current price of wheat in Punjab?"
})
d1 = r1.json()
print(f"Status: {r1.status_code}")
print(f"Language: {d1.get('language','')}")
print(f"Response:\n{d1.get('response','')}")

print("\n" + "=" * 60)
print("TEST 2: Non-farming Hindi query")
print("=" * 60)
r2 = requests.post("http://localhost:8080/chat", json={
    "query": "मुझे कोई अजीब सवाल पूछना है जो farming से related नहीं है"
})
d2 = r2.json()
print(f"Status: {r2.status_code}")
print(f"Language: {d2.get('language','')}")
print(f"Response:\n{d2.get('response','')}")
