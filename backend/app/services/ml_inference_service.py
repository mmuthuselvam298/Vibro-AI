"""
Machine Learning Inference Service

Provides inference using the trained Random Forest Classifier on vibration DSP features.
Returns class probabilities, derived confidence, and feature schema.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
import numpy as np

logger = logging.getLogger(__name__)

# Resolve model directories relative to backend root
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_MODEL_PATH = os.path.join(_BACKEND_DIR, "models", "fault_classifier.pkl")
_METADATA_PATH = os.path.join(_BACKEND_DIR, "models", "model_metadata.json")

class MLInferenceService:
    _instance: Optional["MLInferenceService"] = None

    def __init__(self, model_path: str = _MODEL_PATH, metadata_path: str = _METADATA_PATH):
        self.model_path = model_path
        self.metadata_path = metadata_path
        self.model = None
        self.metadata: Dict[str, Any] = {}
        self.classes: List[str] = []
        self.feature_names: List[str] = []
        self.is_loaded = False
        self._load_model()

    def _load_model(self):
        """Loads model artifact and metadata if available."""
        if not os.path.exists(self.model_path) or not os.path.exists(self.metadata_path):
            logger.warning(
                f"ML model artifact or metadata not found at {self.model_path}. "
                "Inference service will run in fallback rule mode."
            )
            return

        try:
            import joblib
            self.model = joblib.load(self.model_path)
            with open(self.metadata_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)

            self.classes = self.metadata.get("classes", [])
            self.feature_names = self.metadata.get("feature_names", [])
            self.is_loaded = True
            logger.info(f"Loaded ML model: {self.metadata.get('model_type')} with {len(self.classes)} classes.")
        except Exception as e:
            logger.error(f"Failed to load ML model artifact: {e}")
            self.is_loaded = False

    def predict(self, feature_dict: Dict[str, float]) -> Dict[str, Any]:
        """
        Executes inference on a vibration feature dictionary.
        Returns predicted fault_type, class probabilities, and confidence derived from model output.
        """
        if not self.is_loaded or self.model is None:
            return {
                "fault_type": "UNKNOWN",
                "probabilities": {},
                "confidence": 0.0,
                "model_version": "NOT_LOADED",
                "features_used": [],
                "error": "ML model artifact not loaded",
            }

        # Build ordered feature vector
        vector = []
        for fn in self.feature_names:
            vector.append(float(feature_dict.get(fn, 0.0)))

        X = np.array([vector], dtype=np.float32)

        # Run inference
        probs = self.model.predict_proba(X)[0]
        pred_idx = int(np.argmax(probs))
        predicted_class = self.classes[pred_idx]
        raw_confidence = float(probs[pred_idx])

        probabilities_dict = {
            self.classes[i]: round(float(probs[i]), 4)
            for i in range(len(self.classes))
        }

        return {
            "fault_type": predicted_class,
            "probabilities": probabilities_dict,
            "confidence": round(raw_confidence, 4),
            "model_version": self.metadata.get("dataset_version", "1.0.0"),
            "model_type": self.metadata.get("model_type", "RandomForestClassifier"),
            "features_used": self.feature_names,
        }

# Global singleton
_ml_service_singleton: Optional[MLInferenceService] = None

def get_ml_inference_service() -> MLInferenceService:
    global _ml_service_singleton
    if _ml_service_singleton is None:
        _ml_service_singleton = MLInferenceService()
    return _ml_service_singleton
