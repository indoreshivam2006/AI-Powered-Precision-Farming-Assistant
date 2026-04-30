import json

def extract():
    with open('d:/kisan-mitra-main/Backend/Disease prediction/model/plant_disease_detection_model.ipynb', 'r', encoding='utf-8') as f:
        nb = json.load(f)
    with open('d:/kisan-mitra-main/Backend/Disease prediction/model/notebook_code.py', 'w', encoding='utf-8') as f:
        for cell in nb['cells']:
            if cell['cell_type'] == 'code':
                f.write(''.join(cell['source']) + '\n\n')

if __name__ == '__main__':
    extract()
