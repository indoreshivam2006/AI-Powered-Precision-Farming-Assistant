"""
FastAPI application for KisanMitra advisory agent.
Exposes POST /chat endpoint for receiving farmer queries.
"""

import os
from dotenv import load_dotenv

load_dotenv(override=True)

from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import AliasChoices, BaseModel, Field
from typing import Optional
import groq
import tempfile

try:
    from .agent import ask_agent, build_mandi_response
    from .language import detect_language
    from .whatsapp import handle_whatsapp
except ImportError:
    from agent import ask_agent, build_mandi_response
    from language import detect_language
    from whatsapp import handle_whatsapp

from twilio.twiml.messaging_response import MessagingResponse

# ── App Setup ───────────────────────────────────────────────────────
app = FastAPI(
    title="KisanMitra Advisory Agent",
    description="AI-powered farming assistant for Indian farmers. "
                "Supports Hindi, Marathi, and English.",
    version="1.0.0",
)

# CORS — allow frontend / mobile app to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        os.getenv("FRONTEND_URL", ""),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ──────────────────────────────────────
class HistoryMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    query: str = Field(
        ...,
        min_length=1,
        validation_alias=AliasChoices("query", "message"),
        description="Farmer's question in any supported language",
    )
    language: Optional[str] = Field(
        None,
        description="Language code: 'hi', 'mr', or 'en'. Auto-detected if not provided.",
    )
    image: Optional[str] = Field(
        None,
        description="Base64 encoded image string (optional) for multimodal queries",
    )
    history: Optional[list[HistoryMessage]] = Field(
        None,
        description="Previous conversation history (list of role/content pairs)"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "query": "मेरे गेहूं की पत्तियाँ पीली हो रही हैं",
                    "language": "hi",
                },
                {
                    "query": "What crop should I grow in black soil?",
                },
            ]
        }
    }


class ChatResponse(BaseModel):
    response: str = Field(..., description="Agent's response to the farmer")
    language: str = Field(..., description="Detected/used language code")


# ── Endpoints ───────────────────────────────────────────────────────
@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "service": "KisanMitra Advisory Agent",
        "status": "running",
        "version": "1.0.0",
        "supported_languages": ["hi", "mr", "en"],
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint — send a farmer's query, get an AI-powered response.

    The agent will:
    1. Detect the language (or use the provided one)
    2. Route to the appropriate tool (crop advisor, disease detector, or RAG)
    3. Respond in the farmer's language
    """
    # Fast-path: direct mandi price lookup before invoking the full agent
    mandi_response = build_mandi_response(request.query)
    if mandi_response is not None:
        return ChatResponse(
            response=mandi_response,
            language=request.language or detect_language(request.query),
        )

    try:
        result = ask_agent(
            query=request.query,
            lang=request.language,
            image=request.image,
            history=request.history,
        )
        return ChatResponse(
            response=result["response"],
            language=result["language"],
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent error: {str(e)}",
        )


@app.post("/detect-language")
async def detect_lang(request: ChatRequest):
    """Utility endpoint to detect the language of a text."""
    lang = detect_language(request.query)
    return {"language": lang, "query": request.query}

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe an audio file using Groq Whisper."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured")
        
    client = groq.Groq(api_key=api_key)
    
    # Save uploaded file to a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
        content = await file.read()
        temp_audio.write(content)
        temp_path = temp_audio.name
        
    try:
        with open(temp_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                file=(file.filename or "audio.webm", audio_file.read()),
                model="whisper-large-v3",
                response_format="json",
            )
        return {"text": transcription.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.post("/whatsapp", response_class=PlainTextResponse)
async def whatsapp_webhook(request: Request):
    form = await request.form()
    incoming_msg = form.get("Body", "").strip()
    sender = form.get("From", "")
    reply = handle_whatsapp(incoming_msg, sender)
    resp = MessagingResponse()
    resp.message(reply)
    return str(resp)


# ── Run with: uvicorn main:app --reload ─────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
