from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "ml" / "model.pkl"
FEATURE_COLUMNS = [
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]",
]
FRONTEND_LABELS = {
    "Air temperature [K]": "Air Temperature",
    "Process temperature [K]": "Process Temperature",
    "Rotational speed [rpm]": "Rotational Speed",
    "Torque [Nm]": "Torque",
    "Tool wear [min]": "Tool Wear",
}

app = FastAPI(title="Predictive Maintenance API")
artifact = joblib.load(MODEL_PATH)
if isinstance(artifact, dict) and "model" in artifact:
    model = artifact["model"]
    selected_model_name = artifact.get("selected_model_name", "RandomForestClassifier")
    feature_columns = artifact.get("feature_columns", FEATURE_COLUMNS)
    model_input_columns = artifact.get("model_input_columns", feature_columns)
    feature_importances = artifact.get("feature_importances", {})
    training_stats = artifact.get("training_stats", {})
    model_metrics = artifact.get("metrics", {})
    model_comparison = artifact.get("model_comparison", {})
else:
    model = artifact
    selected_model_name = "RandomForestClassifier"
    feature_columns = FEATURE_COLUMNS
    model_input_columns = FEATURE_COLUMNS
    feature_importances = {}
    training_stats = {}
    model_metrics = {}
    model_comparison = {}


class PredictionInput(BaseModel):
    temp: float
    process_temp: float
    rpm: float
    torque: float
    wear: float


@app.get("/")
def root():
    return {"message": "Predictive Maintenance API is running"}


@app.get("/metrics")
def metrics():
    return {
        "model_type": selected_model_name,
        "feature_importances": feature_importances,
        "evaluation": model_metrics,
        "model_comparison": model_comparison,
    }


def build_factor_summary(column: str, value: float):
    stats = training_stats.get(column, {})
    std = stats.get("std") or 1.0
    mean = stats.get("mean") or value
    z_score = abs((value - mean) / std) if std else 0.0
    weighted_impact = z_score * float(feature_importances.get(column, 0.0))

    return {
        "key": column,
        "name": FRONTEND_LABELS.get(column, column),
        "value": round(float(value), 2),
        "mean": round(float(mean), 2),
        "z_score": round(float(z_score), 3),
        "importance": round(float(feature_importances.get(column, 0.0)), 4),
        "impact_score": round(float(weighted_impact), 4),
    }


def risk_window(probability: float) -> str:
    if probability >= 0.85:
        return "Immediate attention recommended"
    if probability >= 0.7:
        return "Inspect within 12 hours"
    if probability >= 0.45:
        return "Review within 24-48 hours"
    return "Continue scheduled monitoring"


def maintenance_priority(probability: float) -> str:
    if probability >= 0.85:
        return "High"
    if probability >= 0.55:
        return "Medium"
    return "Low"


def recommendations(top_factor_name: str, probability: float):
    guidance = {
        "Air Temperature": [
            "Inspect ambient cooling and airflow around the machine.",
            "Verify that intake filters and ventilation paths are not blocked.",
        ],
        "Process Temperature": [
            "Review thermal stability of the production process.",
            "Check coolant or lubrication effectiveness under current load.",
        ],
        "Rotational Speed": [
            "Inspect spindle or motor speed control for instability.",
            "Check for overspeed or abnormal operating cycles in the drive system.",
        ],
        "Torque": [
            "Inspect load balance and friction sources on the drive train.",
            "Check for abnormal resistance or component wear under load.",
        ],
        "Tool Wear": [
            "Schedule tool inspection or replacement at the next maintenance window.",
            "Verify wear progression against recent production hours.",
        ],
    }
    result = guidance.get(top_factor_name, [
        "Review the machine condition against the latest sensor profile.",
        "Schedule a targeted maintenance inspection for the affected subsystem.",
    ])

    if probability >= 0.7:
        result.append("Escalate this asset for technician review before the next long run.")

    return result


@app.post("/predict")
def predict(payload: PredictionInput):
    # Keep the feature order exactly the same as training.
    features = pd.DataFrame(
        [[
            payload.temp,
            payload.process_temp,
            payload.rpm,
            payload.torque,
            payload.wear,
        ]],
        columns=model_input_columns,
    )

    probability = float(model.predict_proba(features)[0][1])
    decision_threshold = float(model_metrics.get("decision_threshold", 0.5))
    failure_prediction = int(probability >= decision_threshold)
    status = "Critical" if probability > 0.7 else "Normal"
    confidence = max(probability, 1 - probability)
    health_score = max(0.0, 1 - probability)

    factor_summaries = [
        build_factor_summary(column, float(value))
        for column, value in zip(feature_columns, [payload.temp, payload.process_temp, payload.rpm, payload.torque, payload.wear])
    ]
    ranked_factors = sorted(
        factor_summaries,
        key=lambda item: item["impact_score"],
        reverse=True,
    )
    top_factor = ranked_factors[0] if ranked_factors else None
    priority = maintenance_priority(probability)
    top_factor_name = top_factor["name"] if top_factor else "Machine Condition"

    return {
        "fault_probability": round(probability, 4),
        "status": status,
        "failure_prediction": failure_prediction,
        "confidence": round(float(confidence), 4),
        "health_score": round(float(health_score), 4),
        "risk_band": priority,
        "maintenance_priority": priority,
        "decision_threshold": round(decision_threshold, 2),
        "estimated_risk_window": risk_window(probability),
        "top_influencing_factor": top_factor,
        "contributing_factors": ranked_factors[:3],
        "maintenance_recommendations": recommendations(top_factor_name, probability),
        "explanation": (
            f"{top_factor_name} shows the strongest contribution in the current "
            f"sensor pattern, and the model confidence is {round(confidence * 100)}%."
            if top_factor
            else "Prediction generated successfully."
        ),
        "model_metrics": model_metrics,
        "model_name": selected_model_name,
        "model_comparison": model_comparison,
    }
