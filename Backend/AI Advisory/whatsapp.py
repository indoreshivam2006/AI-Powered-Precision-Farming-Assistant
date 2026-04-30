"""
WhatsApp webhook handler for KisanMitra.
Receives incoming messages from Twilio and forwards them to the /chat endpoint.
"""

import os
import requests


def handle_whatsapp(incoming_msg: str, sender: str) -> str:
    """Forward a WhatsApp message to the chat endpoint and return the response."""
    base_url = os.getenv("BACKEND_URL", "http://localhost:8080")
    try:
        r = requests.post(
            f"{base_url}/chat",
            json={"query": incoming_msg},
            timeout=30,
        )
        return r.json().get("response", "Sorry, try again.")
    except requests.exceptions.RequestException:
        return "KisanMitra service unavailable. Call 1800-180-1551"
