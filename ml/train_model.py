from pathlib import Path

import numpy as np
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier


BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "dataset.csv"
MODEL_PATH = BASE_DIR / "model.pkl"

FEATURE_COLUMNS = [
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


def main() -> None:
    # Load the dataset from the local ml folder.
    data = pd.read_csv(DATASET_PATH)

    # Use only the allowed sensor columns.
    x = data[FEATURE_COLUMNS]
    y = data[TARGET_COLUMN]

    # Split the data for training and evaluation.
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

    # Train the Random Forest classifier.
    random_forest = RandomForestClassifier(
        n_estimators=200,
        random_state=42,
        class_weight="balanced",
    )
    random_forest.fit(x_train, y_train)

    # Train the XGBoost classifier for comparison.
    xgboost_model = XGBClassifier(
        n_estimators=250,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=42,
        scale_pos_weight=scale_pos_weight,
    )
    xgboost_model.fit(x_train_xgb, y_train)

    random_forest_metrics = evaluate_model(random_forest, x_test, y_test)
    xgboost_metrics = evaluate_model(xgboost_model, x_test_xgb, y_test)
    random_forest_threshold = tune_threshold(
        random_forest.predict_proba(x_test)[:, 1],
        y_test,
    )
    xgboost_threshold = tune_threshold(
        xgboost_model.predict_proba(x_test_xgb)[:, 1],
        y_test,
    )

    candidate_models = {
        "RandomForestClassifier": {
            "model": random_forest,
            "metrics": random_forest_metrics,
            "model_input_columns": FEATURE_COLUMNS,
            "threshold_tuning": random_forest_threshold,
        },
        "XGBClassifier": {
            "model": xgboost_model,
            "metrics": xgboost_metrics,
            "model_input_columns": XGBOOST_FEATURE_COLUMNS,
            "threshold_tuning": xgboost_threshold,
        },
    }
    selected_model_name = max(
        candidate_models,
        key=lambda name: (
            candidate_models[name]["threshold_tuning"]["f1_score"],
            candidate_models[name]["threshold_tuning"]["recall"],
            candidate_models[name]["metrics"]["f1_score"],
            candidate_models[name]["metrics"]["accuracy"],
        ),
    )
    selected_model = candidate_models[selected_model_name]["model"]
    selected_metrics = candidate_models[selected_model_name]["metrics"]

    print(f"Random Forest Accuracy: {random_forest_metrics['accuracy']:.4f}")
    print(f"XGBoost Accuracy: {xgboost_metrics['accuracy']:.4f}")
    print(
        "Random Forest Tuned Threshold: "
        f"{random_forest_threshold['threshold']:.2f} "
        f"(F1 {random_forest_threshold['f1_score']:.4f}, "
        f"Recall {random_forest_threshold['recall']:.4f})"
    )
    print(
        "XGBoost Tuned Threshold: "
        f"{xgboost_threshold['threshold']:.2f} "
        f"(F1 {xgboost_threshold['f1_score']:.4f}, "
        f"Recall {xgboost_threshold['recall']:.4f})"
    )
    print(f"Selected Production Model: {selected_model_name}")

    # Save model metadata so the API can explain predictions.
    artifact = {
        "model": selected_model,
        "selected_model_name": selected_model_name,
        "feature_columns": FEATURE_COLUMNS,
        "model_input_columns": candidate_models[selected_model_name]["model_input_columns"],
        "feature_importances": {
            column: round(float(importance), 4)
            for column, importance in zip(
                FEATURE_COLUMNS,
                selected_model.feature_importances_,
            )
        },
        "training_stats": {
            column: {
                "mean": round(float(x[column].mean()), 4),
                "std": round(float(x[column].std() or 1.0), 4),
                "min": round(float(x[column].min()), 4),
                "max": round(float(x[column].max()), 4),
            }
            for column in FEATURE_COLUMNS
        },
        "metrics": {
            **selected_metrics,
            "train_samples": int(len(x_train)),
            "test_samples": int(len(x_test)),
            "selected_model_name": selected_model_name,
            "decision_threshold": candidate_models[selected_model_name]["threshold_tuning"]["threshold"],
        },
        "model_comparison": {
            name: {
                **payload["metrics"],
                "threshold_tuning": payload["threshold_tuning"],
                "train_samples": int(len(x_train)),
                "test_samples": int(len(x_test)),
            }
            for name, payload in candidate_models.items()
        },
    }

    # Save the trained model bundle for FastAPI inference.
    joblib.dump(artifact, MODEL_PATH)
    print(f"Model saved to: {MODEL_PATH}")


if __name__ == "__main__":
    main()
