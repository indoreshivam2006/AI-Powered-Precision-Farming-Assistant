import base64
import io
import json
import os
import cv2
import numpy as np
from PIL import Image, ImageOps
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tensorflow as tf

app = FastAPI(title="Plant Disease Prediction API")

# Add CORS to allow the Next.js frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model and class names
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model', 'plant_disease_model.keras')
CLASS_NAMES_PATH = os.path.join(os.path.dirname(__file__), 'model', 'class_names.json')

if os.path.exists(MODEL_PATH):
    model = tf.keras.models.load_model(MODEL_PATH)
else:
    model = None

if os.path.exists(CLASS_NAMES_PATH):
    with open(CLASS_NAMES_PATH, 'r') as f:
        CLASS_NAMES = json.load(f)
else:
    CLASS_NAMES = []

# Map class_names.json to metadata. 
# We'll use a flattened name matcher to map json classes to metadata keys.
DISEASE_META = {
    'Apple___Apple_scab': {'disease': 'Apple Scab', 'treatment': 'Apply myclobutanil or captan fungicide at bud break. Remove fallen leaves.'},
    'Apple___Black_rot': {'disease': 'Black Rot', 'treatment': 'Prune infected branches. Apply fungicide containing thiophanate-methyl.'},
    'Apple___Cedar_apple_rust': {'disease': 'Cedar Apple Rust', 'treatment': 'Apply myclobutanil fungicide. Remove nearby juniper/cedar trees if possible.'},
    'Apple___healthy': {'disease': 'Healthy Apple', 'treatment': 'No treatment needed. Maintain proper watering and nutrition.'},
    'Blueberry___healthy': {'disease': 'Healthy Blueberry', 'treatment': 'No treatment needed.'},
    'Cherry_(including_sour)___Powdery_mildew': {'disease': 'Powdery Mildew', 'treatment': 'Apply sulfur-based fungicide. Improve air circulation around plants.'},
    'Cherry_(including_sour)___healthy': {'disease': 'Healthy Cherry', 'treatment': 'No treatment needed.'},
    'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot': {'disease': 'Gray Leaf Spot', 'treatment': 'Apply strobilurin fungicides. Plant resistant hybrids.'},
    'Corn_(maize)___Common_rust_': {'disease': 'Common Rust', 'treatment': 'Apply propiconazole or azoxystrobin early. Plant resistant varieties.'},
    'Corn_(maize)___Northern_Leaf_Blight': {'disease': 'Northern Leaf Blight', 'treatment': 'Use resistant varieties. Apply strobilurin fungicides at early stages.'},
    'Corn_(maize)___healthy': {'disease': 'Healthy Corn', 'treatment': 'No treatment needed.'},
    'Grape___Black_rot': {'disease': 'Black Rot', 'treatment': 'Apply mancozeb or myclobutanil before and after bloom.'},
    'Grape___Esca_(Black_Measles)': {'disease': 'Esca (Black Measles)', 'treatment': 'Prune infected wood. Apply wound sealants. No complete cure known.'},
    'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)': {'disease': 'Leaf Blight', 'treatment': 'Apply copper-based or mancozeb fungicides.'},
    'Grape___healthy': {'disease': 'Healthy Grape', 'treatment': 'No treatment needed.'},
    'Orange___Haunglongbing_(Citrus_greening)': {'disease': 'Citrus Greening (HLB)', 'treatment': 'Remove and destroy infected trees. Control psyllid vector with insecticides.'},
    'Peach___Bacterial_spot': {'disease': 'Bacterial Spot', 'treatment': 'Apply copper-based bactericide. Use resistant varieties.'},
    'Peach___healthy': {'disease': 'Healthy Peach', 'treatment': 'No treatment needed.'},
    'Pepper,_bell___Bacterial_spot': {'disease': 'Bacterial Spot', 'treatment': 'Apply copper-based bactericide. Avoid overhead irrigation.'},
    'Pepper,_bell___healthy': {'disease': 'Healthy Pepper', 'treatment': 'No treatment needed.'},
    'Potato___Early_blight': {'disease': 'Early Blight', 'treatment': 'Apply mancozeb or chlorothalonil fungicide. Remove infected leaves.'},
    'Potato___Late_blight': {'disease': 'Late Blight', 'treatment': 'Apply metalaxyl or cymoxanil fungicide immediately. Remove infected plants.'},
    'Potato___healthy': {'disease': 'Healthy Potato', 'treatment': 'No treatment needed.'},
    'Raspberry___healthy': {'disease': 'Healthy Raspberry', 'treatment': 'No treatment needed.'},
    'Soybean___healthy': {'disease': 'Healthy Soybean', 'treatment': 'No treatment needed.'},
    'Squash___Powdery_mildew': {'disease': 'Powdery Mildew', 'treatment': 'Apply potassium bicarbonate or neem oil. Improve ventilation.'},
    'Strawberry___Leaf_scorch': {'disease': 'Leaf Scorch', 'treatment': 'Apply captan or thiram fungicide. Remove infected leaves.'},
    'Strawberry___healthy': {'disease': 'Healthy Strawberry', 'treatment': 'No treatment needed.'},
    'Tomato___Bacterial_spot': {'disease': 'Bacterial Spot', 'treatment': 'Apply copper-based bactericide. Avoid working with wet plants.'},
    'Tomato___Early_blight': {'disease': 'Early Blight', 'treatment': 'Apply copper-based fungicide. Remove lower infected leaves.'},
    'Tomato___Late_blight': {'disease': 'Late Blight', 'treatment': 'Apply Mancozeb or Metalaxyl fungicides immediately. Destroy infected plants.'},
    'Tomato___Leaf_Mold': {'disease': 'Leaf Mold', 'treatment': 'Improve ventilation. Apply chlorothalonil or mancozeb fungicide.'},
    'Tomato___Septoria_leaf_spot': {'disease': 'Septoria Leaf Spot', 'treatment': 'Apply mancozeb or chlorothalonil. Remove infected leaves immediately.'},
    'Tomato___Spider_mites Two-spotted_spider_mite': {'disease': 'Spider Mites', 'treatment': 'Apply miticide or neem oil. Spray underside of leaves.'},
    'Tomato___Target_Spot': {'disease': 'Target Spot', 'treatment': 'Apply fungicide. Improve air circulation. Avoid overhead irrigation.'},
    'Tomato___Tomato_Yellow_Leaf_Curl_Virus': {'disease': 'Yellow Leaf Curl Virus', 'treatment': 'Control whitefly with insecticides. Remove infected plants.'},
    'Tomato___Tomato_mosaic_virus': {'disease': 'Mosaic Virus', 'treatment': 'Remove and destroy infected plants. Disinfect tools. Control aphids.'},
    'Tomato___healthy': {'disease': 'Healthy Tomato', 'treatment': 'No treatment needed.'},
}

def normalize_string(s):
    # Remove all non-alphanumeric chars for robust matching
    return ''.join(c for c in s.lower() if c.isalnum())

META_MAP = {normalize_string(k): v for k, v in DISEASE_META.items()}

class ImageRequest(BaseModel):
    image: str

@app.post("/detect")
async def detect_disease(request: ImageRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        # Extract base64 part
        base64_data = request.image
        if "," in base64_data:
            base64_data = base64_data.split(",")[1]
            
        image_bytes = base64.b64decode(base64_data)
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = ImageOps.exif_transpose(img)
        img = np.array(img)
        
        # Preprocess
        img = cv2.resize(img, (224, 224))
        # EfficientNet expects [0, 255] pixels, not [0, 1]. Do not divide by 255.
        img = img.astype(np.float32)
        img = np.expand_dims(img, axis=0)
        
        # Predict
        preds = model.predict(img, verbose=0)
        top_idx = int(np.argmax(preds[0]))
        confidence = float(preds[0][top_idx])
        class_name = CLASS_NAMES[top_idx]
        
        if class_name in ['test', 'train', 'valid']:
            return {
                "disease": "Unknown (Invalid Output)",
                "confidence": f"{confidence*100:.1f}%",
                "treatment": "The model produced an unexpected class. Please try again."
            }
            
        meta = META_MAP.get(normalize_string(class_name), {
            "disease": class_name.replace("_", " "),
            "treatment": "Consult an agronomist for appropriate treatment."
        })
        
        return {
            "disease": meta["disease"],
            "confidence": f"{confidence*100:.1f}%",
            "treatment": meta["treatment"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class LiveFrameRequest(BaseModel):
    frame: str  # base64-encoded JPEG frame

@app.post("/detect-live")
async def detect_live_frame(request: LiveFrameRequest):
    """Optimized endpoint for live video frame inference.
    Returns class label, confidence score, and treatment — minimal overhead."""
    if model is None:
        raise HTTPException(status_code=503, detail="Model is still loading")

    try:
        base64_data = request.frame
        if "," in base64_data:
            base64_data = base64_data.split(",")[1]

        image_bytes = base64.b64decode(base64_data)
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = np.array(img)

        # Preprocess: resize + float32 (EfficientNet uses 0-255 range)
        img = cv2.resize(img, (224, 224))
        img = img.astype(np.float32)
        img = np.expand_dims(img, axis=0)

        # Predict
        preds = model.predict(img, verbose=0)
        top_idx = int(np.argmax(preds[0]))
        confidence = float(preds[0][top_idx])
        class_name = CLASS_NAMES[top_idx]

        if class_name in ['test', 'train', 'valid']:
            return {
                "label": "Unknown",
                "confidence": 0.0,
                "treatment": "Could not identify. Please adjust camera angle.",
                "healthy": False,
            }

        meta = META_MAP.get(normalize_string(class_name), {
            "disease": class_name.replace("_", " "),
            "treatment": "Consult an agronomist for appropriate treatment."
        })

        is_healthy = "healthy" in class_name.lower()

        return {
            "label": meta["disease"],
            "confidence": round(confidence, 4),
            "treatment": meta["treatment"],
            "healthy": is_healthy,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/model-status")
async def model_status():
    """Check if the model is loaded and ready for inference."""
    return {
        "loaded": model is not None,
        "num_classes": len(CLASS_NAMES),
        "input_shape": "(1, 224, 224, 3)",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
