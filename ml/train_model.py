from pathlib import Path
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

PROJECT_DIR = Path(__file__).resolve().parent.parent
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))

from ml.lstm_model import LSTMClassifier


BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "dataset.csv"
CMAPS_DIR = PROJECT_DIR / "CMaps"
TRAIN_PATH = CMAPS_DIR / "train_FD001.txt"
MODEL_PATH = BASE_DIR / "model.pkl"

FAULT_FEATURE_COLUMNS = [
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]",
]
XGBOOST_FEATURE_COLUMNS = [
    "air_temperature_k",
    "process_temperature_k",
    "rotational_speed_rpm",
    "torque_nm",
    "tool_wear_min",
]
TARGET_COLUMN = "Machine failure"

RUL_FEATURE_COLUMNS = [
    "cycle",
    "vibration_index",
    "thermal_load",
    "pressure_margin",
    "efficiency_index",
    "flow_index",
]
RUL_FRONTEND_LABELS = {
    "cycle": "Operating Cycles",
    "vibration_index": "Vibration Index",
    "thermal_load": "Brake Thermal Load",
    "pressure_margin": "Pressure Margin",
    "efficiency_index": "Battery Efficiency Index",
    "flow_index": "Flow Stability",
}


def evaluate_model(model, x_test, y_test):
    predictions = model.predict(x_test)
    accuracy = accuracy_score(y_test, predictions)
    precision = precision_score(y_test, predictions, zero_division=0)
    recall = recall_score(y_test, predictions, zero_division=0)
    f1 = f1_score(y_test, predictions, zero_division=0)
    matrix = confusion_matrix(y_test, predictions).tolist()
    return {
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1_score": round(float(f1), 4),
        "confusion_matrix": matrix,
    }


def tune_threshold(probabilities, y_true):
    best = None
    for threshold in np.arange(0.2, 0.81, 0.02):
        predictions = (probabilities >= threshold).astype(int)
        precision = precision_score(y_true, predictions, zero_division=0)
        recall = recall_score(y_true, predictions, zero_division=0)
        f1 = f1_score(y_true, predictions, zero_division=0)

        candidate = {
            "threshold": round(float(threshold), 2),
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "f1_score": round(float(f1), 4),
        }

        if best is None:
            best = candidate
            continue

        current_rank = (candidate["f1_score"], candidate["recall"], candidate["precision"])
        best_rank = (best["f1_score"], best["recall"], best["precision"])
        if current_rank > best_rank:
            best = candidate

    return best


def load_rul_training_data():
    columns = (
        ["unit", "cycle"]
        + [f"op_setting_{index}" for index in range(1, 4)]
        + [f"sensor_{index}" for index in range(1, 22)]
    )
    raw = np.loadtxt(TRAIN_PATH, dtype=np.float32)
    data = pd.DataFrame(raw[:, : len(columns)], columns=columns)
    data["unit"] = data["unit"].astype(int)
    data["cycle"] = data["cycle"].astype(int)
    data["rul"] = data.groupby("unit")["cycle"].transform("max") - data["cycle"]

    # Friendly subsystem proxies so the frontend can expose vehicle-like inputs.
    data["vibration_index"] = ((data["sensor_11"] - data["sensor_11"].mean()) / data["sensor_11"].std()).abs() * 25 + 20
    data["thermal_load"] = data["sensor_4"]
    data["pressure_margin"] = data["sensor_21"]
    data["efficiency_index"] = data["sensor_20"]
    data["flow_index"] = data["sensor_12"]
    return data


def evaluate_regressor(model, features, target):
    predictions = np.clip(model.predict(features), 0, None)
    mae = mean_absolute_error(target, predictions)
    rmse = float(np.sqrt(mean_squared_error(target, predictions)))
    r2 = r2_score(target, predictions)
    return {
        "mae": round(float(mae), 4),
        "rmse": round(rmse, 4),
        "r2_score": round(float(r2), 4),
    }


def main() -> None:
    # Fault classifier training on the original dataset so the old experience stays intact.
    data = pd.read_csv(DATASET_PATH, engine="python")
    x = data[FAULT_FEATURE_COLUMNS]
    y = data[TARGET_COLUMN]

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )
    x_train_xgb = x_train.copy()
    x_test_xgb = x_test.copy()
    x_train_xgb.columns = XGBOOST_FEATURE_COLUMNS
    x_test_xgb.columns = XGBOOST_FEATURE_COLUMNS

    positive_count = int(y_train.sum())
    negative_count = int(len(y_train) - positive_count)
    scale_pos_weight = round(negative_count / max(positive_count, 1), 4)

    random_forest = RandomForestClassifier(
        n_estimators=180,
        max_depth=14,
        random_state=42,
        class_weight="balanced",
        n_jobs=1,
    )
    random_forest.fit(x_train, y_train)

    xgboost_model = XGBClassifier(
        n_estimators=220,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=42,
        scale_pos_weight=scale_pos_weight,
        n_jobs=1,
    )
    xgboost_model.fit(x_train_xgb, y_train)

    lstm_model = LSTMClassifier(
        epochs=18,
        batch_size=32,
        lstm_units=24,
        dense_units=12,
        learning_rate=0.001,
        random_state=42,
    )
    lstm_model.fit(x_train, y_train)

    random_forest_metrics = evaluate_model(random_forest, x_test, y_test)
    xgboost_metrics = evaluate_model(xgboost_model, x_test_xgb, y_test)
    lstm_metrics = evaluate_model(lstm_model, x_test, y_test)
    random_forest_threshold = tune_threshold(random_forest.predict_proba(x_test)[:, 1], y_test)
    xgboost_threshold = tune_threshold(xgboost_model.predict_proba(x_test_xgb)[:, 1], y_test)
    lstm_threshold = tune_threshold(lstm_model.predict_proba(x_test)[:, 1], y_test)

    classifier_candidates = {
        "RandomForestClassifier": {
            "model": random_forest,
            "metrics": random_forest_metrics,
            "model_input_columns": FAULT_FEATURE_COLUMNS,
            "threshold_tuning": random_forest_threshold,
        },
        "XGBClassifier": {
            "model": xgboost_model,
            "metrics": xgboost_metrics,
            "model_input_columns": XGBOOST_FEATURE_COLUMNS,
            "threshold_tuning": xgboost_threshold,
        },
        "LSTMClassifier": {
            "model": lstm_model,
            "metrics": lstm_metrics,
            "model_input_columns": FAULT_FEATURE_COLUMNS,
            "threshold_tuning": lstm_threshold,
        },
    }

    selected_classifier_name = max(
        classifier_candidates,
        key=lambda name: (
            classifier_candidates[name]["threshold_tuning"]["f1_score"],
            classifier_candidates[name]["threshold_tuning"]["recall"],
            classifier_candidates[name]["metrics"]["f1_score"],
            classifier_candidates[name]["metrics"]["accuracy"],
        ),
    )

    # RUL regressor training on C-MAPSS so we can layer lifecycle forecasting on top.
    rul_data = load_rul_training_data()
    unit_ids = rul_data["unit"].unique()
    train_units, test_units = train_test_split(unit_ids, test_size=0.2, random_state=42)
    rul_train = rul_data[rul_data["unit"].isin(train_units)].copy()
    rul_test = rul_data[rul_data["unit"].isin(test_units)].copy()
    x_rul_train = rul_train[RUL_FEATURE_COLUMNS]
    x_rul_test = rul_test[RUL_FEATURE_COLUMNS]
    y_rul_train = rul_train["rul"]
    y_rul_test = rul_test["rul"]

    rul_model = GradientBoostingRegressor(
        n_estimators=220,
        learning_rate=0.05,
        max_depth=3,
        random_state=42,
    )
    rul_model.fit(x_rul_train, y_rul_train)
    rul_metrics = evaluate_regressor(rul_model, x_rul_test, y_rul_test)

    selected_classifier = classifier_candidates[selected_classifier_name]["model"]
    selected_metrics = classifier_candidates[selected_classifier_name]["metrics"]
    selected_threshold = classifier_candidates[selected_classifier_name]["threshold_tuning"]

    artifact = {
        "fault_model": selected_classifier,
        "selected_model_name": selected_classifier_name,
        "fault_feature_columns": FAULT_FEATURE_COLUMNS,
        "fault_model_input_columns": classifier_candidates[selected_classifier_name]["model_input_columns"],
        "feature_importances": {
            column: round(float(importance), 4)
            for column, importance in zip(FAULT_FEATURE_COLUMNS, selected_classifier.feature_importances_)
        },
        "fault_training_stats": {
            column: {
                "mean": round(float(x[column].mean()), 4),
                "std": round(float(x[column].std() or 1.0), 4),
                "min": round(float(x[column].min()), 4),
                "max": round(float(x[column].max()), 4),
            }
            for column in FAULT_FEATURE_COLUMNS
        },
        "metrics": {
            **selected_metrics,
            "train_samples": int(len(x_train)),
            "test_samples": int(len(x_test)),
            "selected_model_name": selected_classifier_name,
            "decision_threshold": selected_threshold["threshold"],
        },
        "model_comparison": {
            name: {
                **payload["metrics"],
                "threshold_tuning": payload["threshold_tuning"],
                "train_samples": int(len(x_train)),
                "test_samples": int(len(x_test)),
            }
            for name, payload in classifier_candidates.items()
        },
        "rul_model": rul_model,
        "selected_rul_model_name": "GradientBoostingRegressor",
        "rul_feature_columns": RUL_FEATURE_COLUMNS,
        "rul_frontend_labels": RUL_FRONTEND_LABELS,
        "rul_training_stats": {
            column: {
                "mean": round(float(rul_data[column].mean()), 4),
                "std": round(float(rul_data[column].std() or 1.0), 4),
                "min": round(float(rul_data[column].min()), 4),
                "max": round(float(rul_data[column].max()), 4),
                "median": round(float(rul_data[column].median()), 4),
            }
            for column in RUL_FEATURE_COLUMNS
        },
        "rul_metrics": {
            **rul_metrics,
            "selected_rul_model_name": "GradientBoostingRegressor",
            "rul_reference_max": int(rul_data["rul"].max()),
            "median_rul": round(float(rul_data["rul"].median()), 2),
        },
    }

    joblib.dump(artifact, MODEL_PATH)
    print(f"Selected fault model: {selected_classifier_name}")
    print(f"RUL model: GradientBoostingRegressor")
    print(f"Model saved to: {MODEL_PATH}")


if __name__ == "__main__":
    main()
