from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from typing import Optional
from farm_advisory_system import FarmAdvisorySystem

# Initialize the system globally so the model is only loaded once
advisory_system = None

@asynccontextmanager
async def lifespan(app):
    global advisory_system
    advisory_system = FarmAdvisorySystem()
    yield

app = FastAPI(title="Crop Recommendation API", lifespan=lifespan)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CropRequest(BaseModel):
    n: float
    p: float
    k: float
    ph: float
    rainfall: float
    temperature: float
    humidity: Optional[float] = 50.0

@app.post("/recommend")
async def recommend_crop(req: CropRequest):
    if not advisory_system:
        raise HTTPException(status_code=500, detail="Model not loaded")
        
    soil_npk = {
        'N': req.n,
        'P': req.p,
        'K': req.k
    }
    
    weather = {
        'temperature': req.temperature,
        'humidity': req.humidity,
        'ph': req.ph,
        'rainfall': req.rainfall
    }
    
    try:
        # Get crop recommendation
        primary_crop, confidence = advisory_system.recommend_crop(soil_npk, weather)
        
        return {
            "crop": primary_crop,
            "confidence": f"{confidence * 100:.1f}%"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class FertilizerRequest(BaseModel):
    crop: str
    n: float
    p: float
    k: float
    area: float

@app.post("/fertilizer")
async def optimize_fertilizer(req: FertilizerRequest):
    if not advisory_system:
        raise HTTPException(status_code=500, detail="Model not loaded")
        
    soil_npk = {
        'N': req.n,
        'P': req.p,
        'K': req.k
    }
    
    try:
        # Frontend provides area in acres, convert to hectares
        area_ha = req.area * 0.404686
        
        rec = advisory_system.fertilizer_optimizer.generate_complete_recommendation(
            crop=req.crop,
            soil_npk=soil_npk,
            area_hectares=area_ha
        )
        
        # We need to return specific format or the whole dict
        return rec
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    # Start on port 8001 to avoid conflicting with Disease Prediction (8000)
    # But wait! Start_all.bat might be using something else or it isn't starting this yet.
    # We will use port 8001.
    uvicorn.run(app, host="0.0.0.0", port=8001)
