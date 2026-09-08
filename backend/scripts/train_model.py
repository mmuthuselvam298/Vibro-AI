"""
Fault Classification Model Training Script

Trains a multi-class Random Forest Classifier on reproducible vibration features
extracted by the authoritative backend DSP engine.

Features:
- Time-domain moments (RMS, peak, crest factor, kurtosis, skewness, etc.)
- Spectral features (dominant frequency, spectral energy, 1X/2X/4X harmonics, BPFO/BSF band energies)
- 8-band spectral decomposition

Evaluates on a strictly held-out test split (train/test separated by seed family).
Saves model artifact (.pkl) and evaluation metadata (.json).
"""

import os
import sys
import json
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

DATASET_PATH = os.path.join(backend_dir, "data", "vibration_dataset.json")
MODELS_DIR = os.path.join(backend_dir, "models")
MODEL_ARTIFACT_PATH = os.path.join(MODELS_DIR, "fault_classifier.pkl")
METADATA_PATH = os.path.join(MODELS_DIR, "model_metadata.json")

TRAIN_SEED = 42

def load_dataset(dataset_path: str):
    with open(dataset_path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    meta = payload["metadata"]
    records = payload["data"]

    feature_names = meta["features"]
    classes = meta["classes"]

    X_train, y_train = [], []
    X_test, y_test = [], []

    for item in records:
        feat_vec = [item["features"][fn] for fn in feature_names]
        label = item["label"]
        class_idx = classes.index(label)

        if item["split_group"] == "test":
            X_test.append(feat_vec)
            y_test.append(class_idx)
        else:
            X_train.append(feat_vec)
            y_train.append(class_idx)

    return (
        np.array(X_train, dtype=np.float32),
        np.array(y_train, dtype=np.int32),
        np.array(X_test, dtype=np.float32),
        np.array(y_test, dtype=np.int32),
        feature_names,
        classes,
        meta,
    )

def train_and_evaluate():
    print(f"Loading dataset from: {DATASET_PATH}...")
    X_train, y_train, X_test, y_test, feature_names, classes, meta = load_dataset(DATASET_PATH)

    print(f"Training samples: {len(X_train)}, Test samples (held-out): {len(X_test)}")
    print(f"Features: {len(feature_names)}, Classes: {len(classes)} ({classes})")

    # Hyperparameters for reproducible, lightweight Random Forest
    rf_params = {
        "n_estimators": 100,
        "max_depth": 12,
        "min_samples_split": 2,
        "min_samples_leaf": 1,
        "random_state": TRAIN_SEED,
        "n_jobs": -1,
    }

    print(f"Training Random Forest Classifier (n_estimators=100, max_depth=12)...")
    clf = RandomForestClassifier(**rf_params)
    clf.fit(X_train, y_train)

    # Evaluate on held-out test set
    y_pred = clf.predict(X_test)
    y_pred_proba = clf.predict_proba(X_test)

    acc = float(accuracy_score(y_test, y_pred))
    prec_macro = float(precision_score(y_test, y_pred, average="macro", zero_division=0))
    rec_macro = float(recall_score(y_test, y_pred, average="macro", zero_division=0))
    f1_macro = float(f1_score(y_test, y_pred, average="macro", zero_division=0))

    prec_weighted = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
    rec_weighted = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
    f1_weighted = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))

    conf_matrix = confusion_matrix(y_test, y_pred).tolist()
    clf_report = classification_report(y_test, y_pred, target_names=classes, output_dict=True)

    # Feature importances
    feature_importances = {
        name: float(imp)
        for name, imp in sorted(
            zip(feature_names, clf.feature_importances_),
            key=lambda x: x[1],
            reverse=True,
        )
    }

    print("\n--- ACTUAL MEASURED HELD-OUT EVALUATION METRICS ---")
    print(f"Accuracy:           {acc * 100:.2f}%")
    print(f"Precision (Macro):  {prec_macro * 100:.2f}%")
    print(f"Recall (Macro):     {rec_macro * 100:.2f}%")
    print(f"F1 Score (Macro):   {f1_macro * 100:.2f}%")
    print(f"Precision (Weight): {prec_weighted * 100:.2f}%")
    print(f"Recall (Weight):    {rec_weighted * 100:.2f}%")
    print(f"F1 Score (Weight):  {f1_weighted * 100:.2f}%")
    print("\nConfusion Matrix:")
    print(np.array(conf_matrix))

    os.makedirs(MODELS_DIR, exist_ok=True)

    # Save model artifact
    print(f"\nSaving model artifact to: {MODEL_ARTIFACT_PATH}...")
    joblib.dump(clf, MODEL_ARTIFACT_PATH)

    # Save model metadata
    metadata_record = {
        "model_type": "RandomForestClassifier",
        "library": "scikit-learn",
        "library_version": "1.9.0",
        "dataset_version": meta["version"],
        "training_seed": TRAIN_SEED,
        "classes": classes,
        "feature_names": feature_names,
        "hyperparameters": rf_params,
        "dataset_statistics": {
            "total_samples": len(X_train) + len(X_test),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "samples_per_class_test": len(X_test) // len(classes),
        },
        "evaluation_metrics": {
            "accuracy": round(acc, 4),
            "precision_macro": round(prec_macro, 4),
            "recall_macro": round(rec_macro, 4),
            "f1_macro": round(f1_macro, 4),
            "precision_weighted": round(prec_weighted, 4),
            "recall_weighted": round(rec_weighted, 4),
            "f1_weighted": round(f1_weighted, 4),
            "confusion_matrix": conf_matrix,
            "classification_report": clf_report,
        },
        "feature_importances": feature_importances,
    }

    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata_record, f, indent=2)

    print(f"Model metadata saved to: {METADATA_PATH}")
    print("Training and evaluation completed successfully.")

if __name__ == "__main__":
    train_and_evaluate()
