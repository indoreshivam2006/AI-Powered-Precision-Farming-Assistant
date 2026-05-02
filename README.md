# 🌾 KisanMitra — AI-Powered Precision Farming Assistant

An intelligent farming companion built for Indian farmers. KisanMitra combines ML-based crop recommendation, ICAR-certified fertilizer optimization, plant disease detection, and a conversational AI advisory agent — all in one beautiful dashboard.

## 🚀 Features

| Feature | Description |
|---|---|
| **Crop Recommendation** | ML model recommends the best crop based on soil NPK, pH, climate data |
| **Fertilizer Optimizer** | ICAR-standard fertilizer dosage calculator with application schedules |
| **Plant Disease Detection** | Deep learning model identifies 38 plant diseases from leaf images |
| **Live Camera Detection** | Real-time plant disease detection via webcam |
| **AI Advisory Agent** | Conversational AI (Groq Llama 3 + Gemini fallback) with RAG knowledge base |
| **Voice Assistant** | Speak your question — Whisper transcribes, TTS reads the response |
| **Mandi Prices** | Live commodity prices from data.gov.in across 1000+ Indian mandis |
| **Weather** | Real-time weather via Open-Meteo with geolocation |
| **Multilingual** | Hindi, Marathi, and English support |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│            Next.js Frontend (3000)          │
│   Landing Page · Dashboard · Feature Pages  │
└──────┬──────────────┬──────────────┬────────┘
       │              │              │
       ▼              ▼              ▼
 ┌───────────┐ ┌────────────┐ ┌───────────┐
 │  Disease  │ │    Crop    │ │    AI     │
 │ Prediction│ │ Recommend  │ │ Advisory  │
 │  (8000)   │ │  (8001)    │ │  (8080)   │
 │ TF/Keras  │ │ sklearn    │ │ LangChain │
 └───────────┘ └────────────┘ └───────────┘
```

## 📋 Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- API Keys (see below)

## 🔑 API Keys Required

| Key | Service | Where |
|---|---|---|
| `GROQ_API_KEY` | Groq (LLM + Whisper) | `Backend/AI Advisory/.env` |
| `GEMINI_API_KEY` | Google Gemini (vision fallback) | `Backend/AI Advisory/.env` |
| `HF_API_KEY` | HuggingFace (embeddings) | `Backend/AI Advisory/.env` |
| `DATA_GOV_API_KEY` | data.gov.in (mandi prices) | `Frontend/.env.local` |
| `OPEN_WEATHER_API_KEY` | OpenWeather (optional) | `Backend/Crop recommendation/.env` |

## ⚡ Quick Start

### 1. Clone & Install Frontend

```bash
git clone https://github.com/indoreshivam2006/AI-Powered-Precision-Farming-Assistant.git
cd AI-Powered-Precision-Farming-Assistant/Frontend
npm install
```

### 2. Configure Environment Variables

```bash
# Frontend
cp Frontend/.env.local.example Frontend/.env.local
# Edit with your DATA_GOV_API_KEY

# AI Advisory Backend
cp Backend/AI\ Advisory/.env.example Backend/AI\ Advisory/.env
# Edit with your GROQ_API_KEY, GEMINI_API_KEY, HF_API_KEY
```

### 3. Start All Services (Windows)

```bash
# From project root
start_all.bat
```

Or start individually:

```bash
# Terminal 1: Frontend
cd Frontend && npm run dev

# Terminal 2: Disease Prediction (port 8000)
cd Backend/Disease\ prediction && python main.py

# Terminal 3: Crop Recommendation (port 8001)
cd Backend/Crop\ recommendation && python main.py

# Terminal 4: AI Advisory (port 8080)
cd Backend/AI\ Advisory && python main.py
```

### 4. Open Dashboard

Visit [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
├── Frontend/                    # Next.js 15 + Tailwind CSS
│   ├── src/app/                 # Pages (App Router)
│   │   ├── dashboard/           # Dashboard & feature pages
│   │   └── api/                 # API routes (chat, mandi, transcribe)
│   └── src/components/          # Reusable UI components
│
├── Backend/
│   ├── AI Advisory/             # LangChain agent + RAG + FastAPI
│   ├── Crop recommendation/     # sklearn crop model + ICAR fertilizer
│   └── Disease prediction/      # TensorFlow plant disease classifier
│
├── start_all.bat                # Windows launcher for all services
└── README.md
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS, Lucide Icons
- **AI Advisory**: LangChain, Groq (Llama 3.3), Gemini, ChromaDB
- **Crop Model**: scikit-learn (Random Forest), ICAR fertilizer formulas
- **Disease Model**: TensorFlow/Keras (EfficientNet), 38 plant diseases
- **APIs**: data.gov.in, Open-Meteo, Nominatim, OpenWeather

## 📄 License

MIT

---

*Built with ❤️ for India's farmers — Cultivating clarity, one field at a time. By Shivam Indore*
