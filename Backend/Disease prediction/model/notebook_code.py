import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

import tensorflow as tf
from tensorflow.keras import layers, models, optimizers, callbacks
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.metrics import classification_report, confusion_matrix

print(f'TensorFlow : {tf.__version__}')
print(f'GPU(s)     : {tf.config.list_physical_devices("GPU")}')

# ── Configuration ─────────────────────────────────────────────
# Upgraded to point to the new processed dataset splits
TRAIN_DIR    = Path('../dataset/processed/train')
VAL_DIR      = Path('../dataset/processed/val')
TEST_DIR     = Path('../dataset/processed/test')

MODEL_DIR    = Path('../model')
MODEL_PATH   = MODEL_DIR / 'plant_disease_model.keras'  # Modern Keras format
IMG_SIZE     = (224, 224)
BATCH_SIZE   = 16
EPOCHS       = 25
SEED         = 42

# Fix random seeds for reproducibility
np.random.seed(SEED)
tf.random.set_seed(SEED)

print('Configuration ready.')

# ── ImageDataGenerators ──────────────────────────────────
# Training: strong augmentation to generalize to real-world data
train_datagen = ImageDataGenerator(
    rotation_range    = 40,
    width_shift_range = 0.2,
    height_shift_range= 0.2,
    shear_range       = 0.2,
    zoom_range        = 0.2,
    horizontal_flip   = True,
    vertical_flip     = True,
    fill_mode         = 'nearest'
)

# Validation & Test: NO augmentation
val_datagen  = ImageDataGenerator()
test_datagen = ImageDataGenerator()

print("Loading Training Data...")
train_generator = train_datagen.flow_from_directory(
    TRAIN_DIR,
    target_size   = IMG_SIZE,
    batch_size    = BATCH_SIZE,
    class_mode    = 'categorical',
    shuffle       = True,
    seed          = SEED
)

print("Loading Validation Data...")
val_generator = val_datagen.flow_from_directory(
    VAL_DIR,
    target_size   = IMG_SIZE,
    batch_size    = BATCH_SIZE,
    class_mode    = 'categorical',
    shuffle       = False
)

print("Loading Test Data...")
test_generator = test_datagen.flow_from_directory(
    TEST_DIR,
    target_size   = IMG_SIZE,
    batch_size    = BATCH_SIZE,
    class_mode    = 'categorical',
    shuffle       = False
)

CLASS_NAMES = list(train_generator.class_indices.keys())
NUM_CLASSES = len(CLASS_NAMES)

def build_model(num_classes):
    # EfficientNetB0 expects inputs in range [0, 255]
    base_model = EfficientNetB0(
        input_shape=(*IMG_SIZE, 3),
        include_top=False,
        weights='imagenet'
    )
    
    # Freeze base model initially
    base_model.trainable = False

    inputs = layers.Input(shape=(*IMG_SIZE, 3))
    x = base_model(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.4)(x)
    
    # Classification Head
    outputs = layers.Dense(num_classes, activation='softmax')(x)
    
    model = models.Model(inputs, outputs, name='PlantDisease_EfficientNet')
    return model, base_model

model, base_model = build_model(NUM_CLASSES)
model.compile(
    optimizer=optimizers.Adam(learning_rate=1e-3),
    loss='categorical_crossentropy',
    metrics=['accuracy', tf.keras.metrics.TopKCategoricalAccuracy(k=3, name='top3_acc')]
)
model.summary()

# ── Callbacks ────────────────────────────────────────────────
checkpoint_cb = callbacks.ModelCheckpoint(str(MODEL_PATH), monitor='val_accuracy', save_best_only=True, verbose=1)
early_stop_cb = callbacks.EarlyStopping(monitor='val_accuracy', patience=5, restore_best_weights=True, verbose=1)
reduce_lr_cb  = callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=3, min_lr=1e-6, verbose=1)

print('\n🚀 Starting Phase 1 Training (Feature Extraction)...')
history1 = model.fit(
    train_generator,
    epochs          = 10,
    validation_data = val_generator,
    callbacks       = [checkpoint_cb, early_stop_cb, reduce_lr_cb],
    verbose         = 1
)

# Unfreeze the top 30 layers
base_model.trainable = True
for layer in base_model.layers[:-30]:
    layer.trainable = False

model.compile(
    optimizer=optimizers.Adam(learning_rate=1e-4), # Lower LR for fine-tuning
    loss='categorical_crossentropy',
    metrics=['accuracy', tf.keras.metrics.TopKCategoricalAccuracy(k=3, name='top3_acc')]
)

print('\n🔥 Starting Phase 2 Fine-Tuning...')
history2 = model.fit(
    train_generator,
    epochs          = EPOCHS,
    initial_epoch   = len(history1.history['accuracy']),
    validation_data = val_generator,
    callbacks       = [checkpoint_cb, early_stop_cb, reduce_lr_cb],
    verbose         = 1
)

# Load the absolute best weights saved by ModelCheckpoint
best_model = tf.keras.models.load_model(str(MODEL_PATH))

print('\n🧪 Evaluating on Test Data...')
test_loss, test_acc, test_top3 = best_model.evaluate(test_generator, verbose=1)
print(f'\nFinal Test Accuracy: {test_acc:.4f}')

# Detailed Classification Report
print('Generating detailed predictions...')
test_generator.reset()
y_pred_proba = best_model.predict(test_generator, verbose=1)
y_pred = np.argmax(y_pred_proba, axis=1)
y_true = test_generator.classes


# Find only the classes that actually have images (ignores the 3 empty folders)
active_classes = np.unique(np.concatenate([y_true, y_pred]))
active_class_names = [CLASS_NAMES[i] for i in active_classes]

print('\nClassification Report:\n')
print(classification_report(y_true, y_pred, labels=active_classes, target_names=active_class_names, zero_division=0))


import json
with open('../model/class_names.json', 'w') as f:
    json.dump(CLASS_NAMES, f, indent=2)
print('✅ class_names.json saved successfully! Model is ready for deployment.')





