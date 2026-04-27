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

app = FastAPI(title="Predictive Maintenance API")
model = joblib.load(MODEL_PATH)


class PredictionInput(BaseModel):
    temp: float
    process_temp: float
    rpm: float
    torque: float
    wear: float


@app.get("/")
def root():
    return {"message": "Predictive Maintenance API is running"}


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
        columns=FEATURE_COLUMNS,
    )

    probability = float(model.predict_proba(features)[0][1])
    status = "Critical" if probability > 0.7 else "Normal"

    return {
        "fault_probability": round(probability, 4),
        "status": status,
    }
