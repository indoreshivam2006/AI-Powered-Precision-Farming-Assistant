# Plant Disease Detection — Project & Training Report

## 1. Project Overview
This project is an end-to-end Machine Learning pipeline designed to detect agricultural plant diseases from leaf images. The goal is to provide a highly accurate, web-based tool where users (such as farmers or agronomists) can upload an image of a leaf and receive an instant diagnosis along with recommended remedies.

The system is built using **Python, TensorFlow/Keras** for the Deep Learning model, and **Flask** for the web application interface.

---

## 2. Dataset Preparation & Cleaning
To build a robust model, we combined two distinct datasets to achieve both high accuracy and real-world resilience:

*   **PlantVillage:** The gold standard dataset containing over 50,000 highly standardized, laboratory-quality images of healthy and diseased leaves.
*   **PlantDoc:** A specialized dataset of images taken "in the wild" with messy backgrounds (soil, overlapping leaves, varied lighting). 

### Data Cleaning Process (`cleaning.py`)
1. **Merging & Filtering:** The script extracted relevant image classes from both datasets.
2. **Balancing:** Machine learning models suffer when data is imbalanced (e.g., 5,000 images for one disease, but only 200 for another). The script enforced a `MAX_IMAGES_PER_CLASS = 1500` limit to ensure the AI did not become biased.
3. **Splitting:** The merged data was split into three distinct directories to prevent data leakage:
    *   **Train Set (70%):** Used to teach the model.
    *   **Validation Set (15%):** Used to tune the model during training.
    *   **Test Set (15%):** A strict hold-out set the model never sees until the very end, ensuring an unbiased final accuracy score.
4. **Final Location:** The cleaned data was saved into the `dataset/processed/` directory.

---

## 3. Model Architecture
The training pipeline (`plant_disease_detection_model.ipynb`) was upgraded to use a state-of-the-art Deep Learning architecture: **EfficientNetB0**.

### Why EfficientNetB0?
*   **Transfer Learning:** Instead of training a model from scratch (which takes weeks and millions of images), we used Transfer Learning. EfficientNet was pre-trained by Google on the ImageNet dataset (1.2 million images).
*   **Scaling:** EfficientNet scales depth, width, and resolution uniformly, meaning it achieves incredibly high accuracy while requiring significantly fewer computational parameters than older architectures like ResNet or VGG16.
*   **Custom Head:** The "top" classification layer of EfficientNet was removed and replaced with a custom Neural Network head consisting of Global Average Pooling, Batch Normalization, Dropout (to prevent overfitting), and a final Softmax dense layer to output the 38 specific plant disease classes.

---

## 4. How the Model is Trained
The model was trained using the following advanced strategies:

### A. Data Augmentation
Because we want the model to work in real-world agricultural fields, we applied heavy Data Augmentation to the training images. The `ImageDataGenerator` randomly applies:
*   Rotations (up to 40 degrees)
*   Width and Height shifting
*   Zooming and Shearing
*   Horizontal and Vertical flipping
*This forces the model to memorize the biological features of the disease rather than memorizing the background.*

### B. Two-Phase Training Approach
1. **Phase 1: Feature Extraction (10 Epochs)**
   The core layers of EfficientNet were "frozen" (locked). The model only trained our newly added custom classification head. This allows the head to learn the broad categories without destroying the valuable edge-detection features Google already trained into EfficientNet.
2. **Phase 2: Fine-Tuning (25 Epochs)**
   The top 30 layers of the EfficientNet base model were "unfrozen." The Learning Rate was lowered significantly (`1e-4`). This allows the network to make tiny, precise adjustments to adapt its internal logic specifically to plant leaves rather than generic objects.

### C. Advanced Callbacks
*   **Early Stopping:** If the model stops improving for 5 epochs, training halts automatically to prevent overfitting.
*   **ReduceLROnPlateau:** If the model struggles to improve, the learning rate is automatically cut in half to help the optimizer settle into the lowest possible loss.
*   **ModelCheckpoint:** The weights are only saved when the Validation Accuracy hits a new all-time high.

---

## 5. Final Output & Deployment
Upon completing training:
1. The model is evaluated against the strict **Hold-out Test Set** to generate a final accuracy score and Classification Report.
2. The optimized weights and architecture are saved together as `plant_disease_model.keras` inside the `model/` folder.
3. The Flask web application (`run.py` / `predict.py`) loads this `.keras` file into memory. When a user uploads an image on the website, OpenCV preprocesses the image to 224x224 pixels, and the EfficientNet model returns a real-time prediction along with agricultural remedies.
