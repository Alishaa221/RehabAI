"""RehabAI research inference API. Trained artifacts must be supplied by a trusted operator."""

from __future__ import annotations

import hmac
import os
from pathlib import Path
from typing import Annotated, Any, Literal

import joblib
import pandas as pd
from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sklearn.pipeline import Pipeline

app = FastAPI(title="RehabAI research inference", version="0.1.0")
MODEL_DIR = Path(os.getenv("REHABAI_MODEL_DIR", "models")).resolve()

TASKS = {
    "fatigue": {"artifact": "fatigue_risk_model.joblib", "target": "fatigue_risk", "kind": "classification"},
    "stress": {"artifact": "stress_risk_model.joblib", "target": "stress_risk", "kind": "classification"},
    "recovery": {"artifact": "recovery_score_model.joblib", "target": "recovery_score_0_100", "kind": "regression"},
}
NUMERIC_FEATURES = {
    "age", "months_since_diagnosis", "day_number", "steps", "resting_heart_rate_bpm",
    "avg_heart_rate_bpm", "max_heart_rate_bpm", "hrv_rmssd_ms", "lf_power", "hf_power",
    "lf_hf_ratio", "bvp", "eda", "skin_temperature_c", "sleep_hours",
    "sleep_quality_score_0_10", "acc_x", "acc_y", "acc_z", "yoga_duration_min",
    "environment_temperature_c",
}
CATEGORICAL_FEATURES = {"gender", "cancer_type", "treatment_stage", "did_yoga_session", "yoga_type_practiced"}
ALLOWED_FEATURES = NUMERIC_FEATURES | CATEGORICAL_FEATURES
CATEGORIES = {
    "gender": {"Female", "Male"},
    "cancer_type": {"Breast", "Colorectal", "Lung", "Lymphoma", "Prostate"},
    "treatment_stage": {"Active Treatment - Chemotherapy", "Active Treatment - Radiotherapy", "Post-Treatment Survivorship"},
    "yoga_type_practiced": {"Active Vinyasa", "Gentle Hatha", "Pranayama / Breathing", "Restorative"},
}
NUMERIC_RANGES = {
    "age": (0, 120), "months_since_diagnosis": (0, 1200), "day_number": (1, 100000),
    "steps": (0, 200000), "resting_heart_rate_bpm": (25, 250), "avg_heart_rate_bpm": (25, 250),
    "max_heart_rate_bpm": (25, 300), "hrv_rmssd_ms": (0, 2000), "lf_power": (0, 1_000_000),
    "hf_power": (0, 1_000_000), "lf_hf_ratio": (0, 1000), "bvp": (0, 1_000_000),
    "eda": (0, 1000), "skin_temperature_c": (-20, 80), "sleep_hours": (0, 24),
    "sleep_quality_score_0_10": (0, 10), "acc_x": (-100, 100), "acc_y": (-100, 100),
    "acc_z": (-100, 100), "yoga_duration_min": (0, 1440), "environment_temperature_c": (-80, 80),
}


def require_service_token(token: Annotated[str | None, Header(alias="X-RehabAI-Service-Token")] = None) -> None:
    expected = os.getenv("REHABAI_INFERENCE_API_TOKEN", "")
    if len(expected) < 32 or not token or not hmac.compare_digest(token, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


class PredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    features: dict[str, Any] = Field(min_length=1, max_length=len(ALLOWED_FEATURES))

    @field_validator("features")
    @classmethod
    def validate_research_features(cls, features: dict[str, Any]) -> dict[str, Any]:
        unknown = set(features) - ALLOWED_FEATURES
        if unknown:
            raise ValueError("Unknown or outcome-leaking feature supplied")
        missing = ALLOWED_FEATURES - set(features)
        if missing:
            raise ValueError(f"Missing features required by the saved preprocessing pipeline: {', '.join(sorted(missing))}")
        for name in NUMERIC_FEATURES:
            value = features.get(name)
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not pd.notna(value):
                raise ValueError(f"{name} must be a finite number")
            low, high = NUMERIC_RANGES[name]
            if not low <= value <= high:
                raise ValueError(f"{name} is outside the accepted input range")
        for name, choices in CATEGORIES.items():
            if features.get(name) not in choices:
                raise ValueError(f"{name} is outside the observed research dataset categories")
        if features.get("did_yoga_session") not in (0, 1):
            raise ValueError("did_yoga_session must be 0 or 1")
        return features


def load_pipeline(task: str) -> Pipeline:
    config = TASKS[task]
    artifact = (MODEL_DIR / config["artifact"]).resolve()
    if artifact.parent != MODEL_DIR or not artifact.is_file():
        raise HTTPException(status_code=503, detail="Original trained model artifact is not installed; research inference is unavailable.")
    try:
        model = joblib.load(artifact)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Trained model artifact could not be loaded.") from exc
    if not isinstance(model, Pipeline) or not hasattr(model, "predict"):
        raise HTTPException(status_code=503, detail="Model artifact must be the original fitted preprocessing and prediction pipeline.")
    if set(getattr(model, "feature_names_in_", [])) != ALLOWED_FEATURES:
        raise HTTPException(status_code=503, detail="Model feature schema does not match the reviewed, leakage-excluded research feature set.")
    return model


def predict(task: str, request: PredictionRequest) -> dict[str, Any]:
    model = load_pipeline(task)
    row = pd.DataFrame([request.features], columns=sorted(ALLOWED_FEATURES))
    result = model.predict(row)[0]
    if hasattr(result, "item"):
        result = result.item()
    return {
        "task": task,
        "result": result,
        "target": TASKS[task]["target"],
        "dataset_type": "synthetic_research",
        "model_version": "original-artifact",
        "clinical_use": False,
        "notice": "Experimental research output from a synthetic cohort; not clinically validated and not for diagnosis or treatment decisions.",
    }


@app.get("/health")
def health() -> dict[str, Any]:
    available = {task: (MODEL_DIR / details["artifact"]).is_file() for task, details in TASKS.items()}
    return {
        "status": "ready" if all(available.values()) else "placeholder",
        "artifacts": available,
        "dataset_type": "synthetic_research",
        "clinical_use": False,
    }


@app.post("/predict/fatigue", dependencies=[Depends(require_service_token)])
def predict_fatigue(request: PredictionRequest) -> dict[str, Any]:
    return predict("fatigue", request)


@app.post("/predict/stress", dependencies=[Depends(require_service_token)])
def predict_stress(request: PredictionRequest) -> dict[str, Any]:
    return predict("stress", request)


@app.post("/predict/recovery", dependencies=[Depends(require_service_token)])
def predict_recovery(request: PredictionRequest) -> dict[str, Any]:
    return predict("recovery", request)


@app.post("/predict/all", dependencies=[Depends(require_service_token)])
def predict_all(request: PredictionRequest) -> dict[str, Any]:
    return {task: predict(task, request) for task in TASKS}
