import os
import uuid
import cv2
import numpy as np
from PIL import Image
try:
    import tensorflow as tf
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
from config import Config

# ── Load model once at import time ───────────────────────────────────────────
_model = None

def get_model():
    global _model
    if not TF_AVAILABLE:
        return None
    if _model is None:
        # Support both .h5 (legacy) and .keras (Keras 3) formats
        model_path = Config.MODEL_PATH
        keras_path = str(model_path).replace('.h5', '.keras')
        if os.path.exists(keras_path):
            _model = tf.keras.models.load_model(keras_path)
        elif os.path.exists(model_path):
            _model = tf.keras.models.load_model(model_path)
    return _model


# ── Disease metadata lookup ───────────────────────────────────────────────────
DISEASE_META = {
    'Apple___Apple_scab':             {'plant': 'Apple',      'disease': 'Apple Scab',                'severity': 'Medium', 'healthy': False,  'remedy':'Apply myclobutanil or captan fungicide at bud break. Remove fallen leaves.', 'description':'Caused by Venturia inaequalis. Olive-green/brown scabs on leaves and fruit.'},
    'Apple___Black_rot':              {'plant': 'Apple',      'disease': 'Black Rot',                 'severity': 'High',   'healthy': False,  'remedy':'Prune infected branches. Apply fungicide containing thiophanate-methyl.', 'description':'Caused by Botryosphaeria obtusa. Purple spots enlarging to brown rot on fruit.'},
    'Apple___Cedar_apple_rust':       {'plant': 'Apple',      'disease': 'Cedar Apple Rust',          'severity': 'Medium', 'healthy': False,  'remedy':'Apply myclobutanil fungicide. Remove nearby juniper/cedar trees if possible.', 'description':'Caused by Gymnosporangium juniperi-virginianae. Bright orange lesions on leaves.'},
    'Apple___healthy':                {'plant': 'Apple',      'disease': 'Healthy',                   'severity': 'Healthy','healthy': True,   'remedy':'No treatment needed. Maintain proper watering and nutrition.', 'description':'Plant is healthy with no signs of disease.'},
    'Blueberry___healthy':            {'plant': 'Blueberry',  'disease': 'Healthy',                   'severity': 'Healthy','healthy': True,   'remedy':'No treatment needed.', 'description':'Plant is healthy.'},
    'Cherry_(including_sour)___Powdery_mildew': {'plant':'Cherry','disease':'Powdery Mildew',         'severity': 'Medium', 'healthy': False,  'remedy':'Apply sulfur-based fungicide. Improve air circulation around plants.', 'description':'Caused by Podosphaera clandestina. White powdery coating on young leaves.'},
    'Cherry_(including_sour)___healthy':        {'plant':'Cherry','disease':'Healthy',                'severity': 'Healthy','healthy': True,   'remedy':'No treatment needed.', 'description':'Plant is healthy.'},
    'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot': {'plant':'Corn','disease':'Gray Leaf Spot', 'severity': 'High',   'healthy': False,  'remedy':'Apply strobilurin fungicides. Plant resistant hybrids.', 'description':'Caused by Cercospora zeae-maydis. Rectangular gray lesions on leaves.'},
    'Corn_(maize)___Common_rust_':    {'plant': 'Corn',       'disease': 'Common Rust',               'severity': 'Medium', 'healthy': False,  'remedy':'Apply propiconazole or azoxystrobin early. Plant resistant varieties.', 'description':'Caused by Puccinia sorghi. Rusty-brown pustules on leaf surfaces.'},
    'Corn_(maize)___Northern_Leaf_Blight': {'plant':'Corn',   'disease': 'Northern Leaf Blight',      'severity': 'High',   'healthy': False,  'remedy':'Use resistant varieties. Apply strobilurin fungicides at early stages.', 'description':'Caused by Exserohilum turcicum. Long grayish-green lesions on leaves.'},
    'Corn_(maize)___healthy':         {'plant': 'Corn',       'disease': 'Healthy',                   'severity': 'Healthy','healthy': True,   'remedy':'No treatment needed.', 'description':'Plant is healthy.'},
    'Grape___Black_rot':              {'plant': 'Grape',      'disease': 'Black Rot',                 'severity': 'High',   'healthy': False,  'remedy':'Apply mancozeb or myclobutanil before and after bloom.', 'description':'Caused by Guignardia bidwellii. Brown lesions and black mummified berries.'},
    'Grape___Esca_(Black_Measles)':   {'plant': 'Grape',      'disease': 'Esca (Black Measles)',      'severity': 'High',   'healthy': False,  'remedy':'Prune infected wood. Apply wound sealants. No complete cure known.', 'description':'Complex fungal disease causing tiger-stripe patterns on leaves.'},
    'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)': {'plant':'Grape','disease':'Leaf Blight',           'severity': 'Medium', 'healthy': False,  'remedy':'Apply copper-based or mancozeb fungicides.', 'description':'Caused by Isariopsis clavispora. Dark brown irregular spots on leaves.'},
    'Grape___healthy':                {'plant': 'Grape',      'disease': 'Healthy',                   'severity': 'Healthy','healthy': True,   'remedy':'No treatment needed.', 'description':'Plant is healthy.'},
    'Orange___Haunglongbing_(Citrus_greening)': {'plant':'Orange','disease':'Citrus Greening (HLB)',  'severity': 'High',   'healthy': False,  'remedy':'Remove and destroy infected trees. Control psyllid vector with insecticides.', 'description':'Caused by Candidatus Liberibacter. Yellowing of leaves, misshapen fruit.'},
    'Peach___Bacterial_spot':         {'plant': 'Peach',      'disease': 'Bacterial Spot',            'severity': 'Medium', 'healthy': False,  'remedy':'Apply copper-based bactericide. Use resistant varieties.', 'description':'Caused by Xanthomonas campestris. Water-soaked spots on leaves and fruit.'},
    'Peach___healthy':                {'plant': 'Peach',      'disease': 'Healthy',                   'severity': 'Healthy','healthy': True,   'remedy':'No treatment needed.', 'description':'Plant is healthy.'},
    'Pepper,_bell___Bacterial_spot':  {'plant': 'Pepper',     'disease': 'Bacterial Spot',            'severity': 'Medium', 'healthy': False,  'remedy':'Apply copper-based bactericide. Avoid overhead irrigation.', 'description':'Caused by Xanthomonas campestris. Small, water-soaked spots on leaves.'},
    'Pepper,_bell___healthy':         {'plant': 'Pepper',     'disease': 'Healthy',                   'severity': 'Healthy','healthy': True,   'remedy':'No treatment needed.', 'description':'Plant is healthy.'},
    'Potato___Early_blight':          {'plant': 'Potato',     'disease': 'Early Blight',              'severity': 'Medium', 'healthy': False,  'remedy':'Apply mancozeb or chlorothalonil fungicide. Remove infected leaves.', 'description':'Caused by Alternaria solani. Dark brown spots with concentric rings.'},
    'Potato___Late_blight':           {'plant': 'Potato',     'disease': 'Late Blight',               'severity': 'High',   'healthy': False,  'remedy':'Apply metalaxyl or cymoxanil fungicide immediately. Remove infected plants.', 'description':'Caused by Phytophthora infestans. Dark brown lesions on leaves and stems.'},
    'Potato___healthy':               {'plant': 'Potato',     'disease': 'Healthy',                   'severity': 'Healthy','healthy': True,   'remedy':'No treatment needed.', 'description':'Plant is healthy.'},
    'Raspberry___healthy':            {'plant': 'Raspberry',  'disease': 'Healthy',                   'severity': 'Healthy','healthy': True,   'remedy':'No treatment needed.', 'description':'Plant is healthy.'},
    'Soybean___healthy':              {'plant': 'Soybean',    'disease': 'Healthy',                   'severity': 'Healthy','healthy': True,   'remedy':'No treatment needed.', 'description':'Plant is healthy.'},
    'Squash___Powdery_mildew':        {'plant': 'Squash',     'disease': 'Powdery Mildew',            'severity': 'Medium', 'healthy': False,  'remedy':'Apply potassium bicarbonate or neem oil. Improve ventilation.', 'description':'Caused by Podosphaera xanthii. White powdery spots on leaves.'},
    'Strawberry___Leaf_scorch':       {'plant': 'Strawberry', 'disease': 'Leaf Scorch',               'severity': 'Medium', 'healthy': False,  'remedy':'Apply captan or thiram fungicide. Remove infected leaves.', 'description':'Caused by Diplocarpon earlianum. Small purplish spots on upper leaf surface.'},
    'Strawberry___healthy':           {'plant': 'Strawberry', 'disease': 'Healthy',                   'severity': 'Healthy','healthy': True,   'remedy':'No treatment needed.', 'description':'Plant is healthy.'},
    'Tomato___Bacterial_spot':        {'plant': 'Tomato',     'disease': 'Bacterial Spot',            'severity': 'Medium', 'healthy': False,  'remedy':'Apply copper-based bactericide. Avoid working with wet plants.', 'description':'Caused by Xanthomonas species. Small, circular water-soaked spots.'},
    'Tomato___Early_blight':          {'plant': 'Tomato',     'disease': 'Early Blight',              'severity': 'Medium', 'healthy': False,  'remedy':'Apply copper-based fungicide. Remove lower infected leaves.', 'description':'Caused by Alternaria solani. Dark concentric rings on lower leaves.'},
    'Tomato___Late_blight':           {'plant': 'Tomato',     'disease': 'Late Blight',               'severity': 'High',   'healthy': False,  'remedy':'Apply Mancozeb or Metalaxyl fungicides immediately. Destroy infected plants.', 'description':'Caused by Phytophthora infestans. Water-soaked brown lesions on leaves.'},
    'Tomato___Leaf_Mold':             {'plant': 'Tomato',     'disease': 'Leaf Mold',                 'severity': 'Medium', 'healthy': False,  'remedy':'Improve ventilation. Apply chlorothalonil or mancozeb fungicide.', 'description':'Caused by Passalora fulva. Yellow patches on upper surface, mold below.'},
    'Tomato___Septoria_leaf_spot':    {'plant': 'Tomato',     'disease': 'Septoria Leaf Spot',        'severity': 'Medium', 'healthy': False,  'remedy':'Apply mancozeb or chlorothalonil. Remove infected leaves immediately.', 'description':'Caused by Septoria lycopersici. Small circular spots with dark borders.'},
    'Tomato___Spider_mites Two-spotted_spider_mite': {'plant':'Tomato','disease':'Spider Mites',      'severity': 'Low',    'healthy': False,  'remedy':'Apply miticide or neem oil. Spray underside of leaves.', 'description':'Pest infestation. Yellow stippling and webbing on leaf undersides.'},
    'Tomato___Target_Spot':           {'plant': 'Tomato',     'disease': 'Target Spot',               'severity': 'Medium', 'healthy': False,  'remedy':'Apply fungicide. Improve air circulation. Avoid overhead irrigation.', 'description':'Caused by Corynespora cassiicola. Concentric-ring target-like spots on leaves.'},
    'Tomato___Tomato_Yellow_Leaf_Curl_Virus': {'plant':'Tomato','disease':'Yellow Leaf Curl Virus',   'severity': 'High',   'healthy': False,  'remedy':'Control whitefly with insecticides. Remove infected plants.', 'description':'Viral disease spread by whiteflies. Causes severe leaf curling and yellowing.'},
    'Tomato___Tomato_mosaic_virus':   {'plant': 'Tomato',     'disease': 'Mosaic Virus',              'severity': 'High',   'healthy': False,  'remedy':'Remove and destroy infected plants. Disinfect tools. Control aphids.', 'description':'Caused by Tomato mosaic virus. Mosaic pattern of light and dark green areas.'},
    'Tomato___healthy':               {'plant': 'Tomato',     'disease': 'Healthy',                   'severity': 'Healthy','healthy': True,   'remedy':'No treatment needed.', 'description':'Plant is healthy with no signs of disease.'},
}


def allowed_file(filename: str) -> bool:
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS


def save_upload(file) -> str:
    """Save uploaded file with unique name. Returns filename."""
    ext = file.filename.rsplit('.', 1)[1].lower()
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    save_path = os.path.join(Config.UPLOAD_FOLDER, unique_name)
    file.save(save_path)
    return unique_name


def preprocess_image(image_path: str) -> np.ndarray:
    """Load image via OpenCV, resize, normalize → ready for CNN input."""
    img = cv2.imread(image_path)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, Config.IMG_SIZE)
    img = img.astype(np.float32) / 255.0
    img = np.expand_dims(img, axis=0)   # shape: (1, 224, 224, 3)
    return img


def predict_disease(image_path: str) -> dict:
    """
    Run CNN inference on the image.
    Returns a dict with plant, disease, confidence, remedy, etc.
    """
    model = get_model()
    if model is None:
        return _demo_prediction()

    img = preprocess_image(image_path)
    preds = model.predict(img, verbose=0)          # shape: (1, 38)
    top_idx = int(np.argmax(preds[0]))
    confidence = float(preds[0][top_idx])
    class_name = Config.CLASS_NAMES[top_idx]

    meta = DISEASE_META.get(class_name, {
        'plant': 'Unknown', 'disease': 'Unknown',
        'severity': 'Medium', 'healthy': False,
        'remedy': 'Consult an agronomist.',
        'description': 'No information available.'
    })

    # Top-3 predictions
    top3_idx = np.argsort(preds[0])[::-1][:3]
    top3 = [
        {'class': Config.CLASS_NAMES[i], 'confidence': round(float(preds[0][i]) * 100, 2)}
        for i in top3_idx
    ]

    return {
        'class_name':   class_name,
        'plant_type':   meta['plant'],
        'disease_name': meta['disease'],
        'confidence':   confidence,
        'confidence_pct': round(confidence * 100, 2),
        'is_healthy':   meta['healthy'],
        'severity':     meta['severity'],
        'remedy':       meta['remedy'],
        'description':  meta['description'],
        'top3':         top3,
    }


def _demo_prediction() -> dict:
    """Fallback when model is not yet trained — returns demo result."""
    return {
        'class_name':   'Tomato___Late_blight',
        'plant_type':   'Tomato',
        'disease_name': 'Late Blight (Demo Mode)',
        'confidence':   0.9423,
        'confidence_pct': 94.23,
        'is_healthy':   False,
        'severity':     'High',
        'remedy':       'Apply Mancozeb or Metalaxyl fungicides immediately. Destroy infected plants.',
        'description':  'Demo mode active — train the CNN model first using the Jupyter Notebook.',
        'top3': [
            {'class': 'Tomato___Late_blight',  'confidence': 94.23},
            {'class': 'Tomato___Early_blight', 'confidence': 3.11},
            {'class': 'Tomato___healthy',      'confidence': 1.42},
        ],
    }
