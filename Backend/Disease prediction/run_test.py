import os
import base64
import requests

p = r'd:\kisan-mitra-main\Backend\Disease prediction\dataset\processed\test'
classes = ['Tomato_Late_blight', 'Apple_Apple_scab', 'Corn_maize_healthy', 'Squash_Powdery_mildew', 'Grape_Black_rot']

for cls in classes:
    files = os.listdir(os.path.join(p, cls))
    img = os.path.join(p, cls, files[0])
    with open(img, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode('utf-8')
    res = requests.post('http://localhost:8000/detect', json={'image': b64}).json()
    
    print(f'Test Folder: {cls}')
    print(f'Image: {files[0]}')
    print(f'Prediction: {res.get("disease")}')
    print(f'Confidence: {res.get("confidence")}')
    print(f'Treatment: {res.get("treatment")}\n')
