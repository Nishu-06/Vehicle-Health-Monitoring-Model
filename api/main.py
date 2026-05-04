from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "ml" / "model.pkl"

FAULT_LABELS = {
    "Air temperature [K]": "Air Temperature",
    "Process temperature [K]": "Process Temperature",
    "Rotational speed [rpm]": "Rotational Speed",
    "Torque [Nm]": "Torque",
    "Tool wear [min]": "Tool Wear",
}

app = FastAPI(title="Predictive Maintenance API")
artifact = joblib.load(MODEL_PATH)

fault_model = artifact["fault_model"]
selected_model_name = artifact.get("selected_model_name", "RandomForestClassifier")
fault_feature_columns = artifact.get("fault_feature_columns", [])
fault_model_input_columns = artifact.get("fault_model_input_columns", fault_feature_columns)
feature_importances = artifact.get("feature_importances", {})
fault_training_stats = artifact.get("fault_training_stats", {})
model_metrics = artifact.get("metrics", {})
model_comparison = artifact.get("model_comparison", {})

rul_model = artifact["rul_model"]
selected_rul_model_name = artifact.get("selected_rul_model_name", "GradientBoostingRegressor")
rul_feature_columns = artifact.get("rul_feature_columns", [])
rul_frontend_labels = artifact.get("rul_frontend_labels", {})
rul_training_stats = artifact.get("rul_training_stats", {})
rul_metrics = artifact.get("rul_metrics", {})


class PredictionInput(BaseModel):
    temp: float
    process_temp: float
    rpm: float
    torque: float
    wear: float
    cycle: float
    vibration_index: float
    thermal_load: float
    pressure_margin: float
    efficiency_index: float
    flow_index: float


@app.get("/")
def root():
    return {"message": "Predictive Maintenance API is running"}


@app.get("/metrics")
def metrics():
    return {
        "model_type": selected_model_name,
        "rul_model_type": selected_rul_model_name,
        "feature_importances": feature_importances,
        "evaluation": model_metrics,
        "model_comparison": model_comparison,
        "rul_evaluation": rul_metrics,
        "rul_feature_labels": rul_frontend_labels,
    }


def build_fault_factor_summary(column: str, value: float):
    stats = fault_training_stats.get(column, {})
    std = stats.get("std") or 1.0
    mean = stats.get("mean") or value
    z_score = abs((value - mean) / std) if std else 0.0
    weighted_impact = z_score * float(feature_importances.get(column, 0.0))
    return {
        "key": column,
        "name": FAULT_LABELS.get(column, column),
        "value": round(float(value), 2),
        "mean": round(float(mean), 2),
        "z_score": round(float(z_score), 3),
        "importance": round(float(feature_importances.get(column, 0.0)), 4),
        "impact_score": round(float(weighted_impact), 4),
    }


def build_rul_factor_summary(column: str, value: float):
    stats = rul_training_stats.get(column, {})
    std = stats.get("std") or 1.0
    mean = stats.get("mean") or value
    z_score = abs((value - mean) / std) if std else 0.0
    return {
        "key": column,
        "name": rul_frontend_labels.get(column, column),
        "value": round(float(value), 2),
        "mean": round(float(mean), 2),
        "z_score": round(float(z_score), 3),
    }


def risk_window(probability: float, predicted_rul: float) -> str:
    if probability >= 0.85 or predicted_rul <= 20:
        return "Immediate attention recommended"
    if probability >= 0.7 or predicted_rul <= 45:
        return "Inspect within 12 hours"
    if probability >= 0.45 or predicted_rul <= 90:
        return "Review within 24-48 hours"
    return "Continue scheduled monitoring"


def maintenance_priority(probability: float, predicted_rul: float) -> str:
    if probability >= 0.85 or predicted_rul <= 20:
        return "High"
    if probability >= 0.55 or predicted_rul <= 60:
        return "Medium"
    return "Low"


def classify_rul_band(predicted_rul: float) -> str:
    if predicted_rul <= 20:
        return "End-of-life"
    if predicted_rul <= 45:
        return "Short Horizon"
    if predicted_rul <= 90:
        return "Planned Service"
    return "Healthy Runway"


def recommendations(top_factor_name: str, probability: float, predicted_rul: float):
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
        "Vibration Index": [
            "Inspect vibration isolation and mount stability for the affected subsystem.",
            "Review whether vibration growth is appearing across consecutive inspection cycles.",
        ],
        "Brake Thermal Load": [
            "Inspect brake temperature buildup and cooling efficiency during high-load operation.",
            "Check whether repeated thermal peaks are accelerating subsystem degradation.",
        ],
        "Battery Efficiency Index": [
            "Review battery efficiency drift and check for charge-discharge imbalance.",
            "Inspect supporting power electronics for sustained performance losses.",
        ],
    }
    result = guidance.get(top_factor_name, [
        "Review the machine condition against the latest sensor profile.",
        "Schedule a targeted maintenance inspection for the affected subsystem.",
    ])

    if predicted_rul <= 30:
        result.append("Predicted remaining life is short, so prepare maintenance capacity now.")
    if probability >= 0.7:
        result.append("Escalate this asset for technician review before the next long run.")
    return result


@app.post("/predict")
def predict(payload: PredictionInput):
    fault_values = [
        payload.temp,
        payload.process_temp,
        payload.rpm,
        payload.torque,
        payload.wear,
    ]
    fault_features = pd.DataFrame([fault_values], columns=fault_model_input_columns)

    probability = float(fault_model.predict_proba(fault_features)[0][1])
    decision_threshold = float(model_metrics.get("decision_threshold", 0.5))
    failure_prediction = int(probability >= decision_threshold)
    confidence = max(probability, 1 - probability)

    rul_values = [
        payload.cycle,
        payload.vibration_index,
        payload.thermal_load,
        payload.pressure_margin,
        payload.efficiency_index,
        payload.flow_index,
    ]
    rul_features = pd.DataFrame([rul_values], columns=rul_feature_columns)
    predicted_rul = max(0.0, float(rul_model.predict(rul_features)[0]))

    status = "Critical" if probability > 0.7 or predicted_rul <= 20 else "Normal"
    health_score = max(
        0.0,
        min(
            1.0,
            ((1 - probability) * 0.6)
            + ((predicted_rul / max(float(rul_metrics.get("rul_reference_max", 150)), 1.0)) * 0.4),
        ),
    )

    fault_factors = [
        build_fault_factor_summary(column, float(value))
        for column, value in zip(fault_feature_columns, fault_values)
    ]
    ranked_fault_factors = sorted(fault_factors, key=lambda item: item["impact_score"], reverse=True)
    top_fault_factor = ranked_fault_factors[0] if ranked_fault_factors else None

    rul_factors = [
        build_rul_factor_summary(column, float(value))
        for column, value in zip(rul_feature_columns, rul_values)
    ]
    ranked_rul_factors = sorted(rul_factors, key=lambda item: item["z_score"], reverse=True)
    top_rul_factor = ranked_rul_factors[0] if ranked_rul_factors else None

    subsystem_health = [
        {"name": "Engine", "score": round(max(0.0, min(100.0, 100 - probability * 90)), 1)},
        {"name": "Battery", "score": round(max(0.0, min(100.0, payload.efficiency_index * 2.1)), 1)},
        {"name": "Brake", "score": round(max(0.0, min(100.0, 100 - ((payload.thermal_load - 300) * 0.16))), 1)},
        {"name": "Vibration", "score": round(max(0.0, min(100.0, 100 - payload.vibration_index)), 1)},
        {"name": "Lifecycle", "score": round(max(0.0, min(100.0, predicted_rul / 3.6)), 1)},
    ]

    priority = maintenance_priority(probability, predicted_rul)
    top_factor_name = (
        top_fault_factor["name"]
        if (top_fault_factor and top_fault_factor["impact_score"] >= 0.05)
        else (top_rul_factor["name"] if top_rul_factor else "Machine Condition")
    )

    return {
        "fault_probability": round(probability, 4),
        "status": status,
        "failure_prediction": failure_prediction,
        "confidence": round(float(confidence), 4),
        "health_score": round(float(health_score), 4),
        "risk_band": priority,
        "maintenance_priority": priority,
        "decision_threshold": round(decision_threshold, 2),
        "estimated_risk_window": risk_window(probability, predicted_rul),
        "top_influencing_factor": top_fault_factor,
        "contributing_factors": ranked_fault_factors[:3],
        "predicted_rul": round(predicted_rul, 2),
        "rul_band": classify_rul_band(predicted_rul),
        "rul_reference_max": int(rul_metrics.get("rul_reference_max", 361)),
        "rul_contributing_factors": ranked_rul_factors[:3],
        "subsystem_health": subsystem_health,
        "maintenance_recommendations": recommendations(top_factor_name, probability, predicted_rul),
        "explanation": (
            f"{top_factor_name} is the strongest signal right now. "
            f"The fault model confidence is {round(confidence * 100)}% and the estimated remaining life is {round(predicted_rul)} cycles."
        ),
        "model_metrics": model_metrics,
        "rul_metrics": rul_metrics,
        "model_name": selected_model_name,
        "rul_model_name": selected_rul_model_name,
        "model_comparison": model_comparison,
    }
