# Predictive Maintenance System

This project is a simulation-based predictive maintenance system for machine/vehicle health monitoring. It uses sensor readings to estimate failure probability, explain the main contributing factors, and store prediction history.

Built with:

- Python, scikit-learn, XGBoost, and TensorFlow for model training
- FastAPI for model inference
- Node.js + Express for backend integration
- MongoDB for prediction history
- React + Tailwind CSS for the dashboard

## Project Structure

```text
project/
|-- ml/
|   |-- train_model.py
|   |-- lstm_model.py
|   |-- model.pkl
|   |-- dataset.csv
|   `-- __init__.py
|-- api/
|   `-- main.py
|-- backend/
|   |-- package.json
|   |-- server.js
|   |-- .env
|   `-- models/
|       `-- Prediction.js
`-- frontend/
    |-- package.json
    |-- index.html
    |-- postcss.config.js
    |-- tailwind.config.js
    |-- vite.config.js
    `-- src/
        |-- App.jsx
        |-- index.css
        `-- main.jsx
```

## 1. Create A Python Virtual Environment

From the project root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

`requirements.txt` includes TensorFlow because the training pipeline now includes an LSTM model.

## 2. Train The Models

```powershell
python .\ml\train_model.py
```

This will:

- load `ml/dataset.csv`
- train a Random Forest classifier
- train an XGBoost classifier
- train an LSTM classifier
- evaluate all three models with accuracy, precision, recall, F1 score, and confusion matrix
- tune the decision threshold for each model
- select the best production model using F1 score, recall, and accuracy
- save the selected model and comparison metadata to `ml/model.pkl`

The saved artifact contains:

- selected production model
- selected model name
- feature columns
- feature importances
- training statistics
- evaluation metrics
- model comparison for Random Forest, XGBoost, and LSTM

## 3. Start The FastAPI Model Service

With the virtual environment still active:

```powershell
uvicorn api.main:app --reload --port 8000
```

FastAPI endpoints:

- `GET http://127.0.0.1:8000/`
- `GET http://127.0.0.1:8000/metrics`
- `POST http://127.0.0.1:8000/predict`

The `/metrics` endpoint returns the selected model, evaluation metrics, feature importances, and comparison results for all trained models.

## 4. Start MongoDB

Make sure MongoDB is running locally on:

```text
mongodb://127.0.0.1:27017/predictive_maintenance
```

If you use MongoDB Atlas or another host, update the MongoDB connection value in `backend/.env`.

## 5. Start The Node/Express Backend

In a new terminal:

```powershell
cd .\backend
npm install
npm run dev
```

Backend endpoints:

- `POST http://127.0.0.1:5000/api/predict`
- `GET http://127.0.0.1:5000/api/history`

## 6. Start The React Frontend

In another terminal:

```powershell
cd .\frontend
npm install
npm run dev
```

Open the URL printed by Vite, usually:

```text
http://127.0.0.1:5173
```

## How It Works

1. The React dashboard sends sensor values to the Node backend.
2. The Node backend forwards those values to FastAPI.
3. FastAPI loads `ml/model.pkl` and predicts failure probability.
4. The backend stores inputs, result, and timestamp in MongoDB.
5. The frontend shows the prediction result, explanation, recommendations, and recent history.

## Model Details

The training pipeline uses these models:

- `RandomForestClassifier`: balanced tree-based baseline model
- `XGBClassifier`: gradient boosting model with class imbalance handling
- `LSTMClassifier`: TensorFlow/Keras neural model wrapped with a `predict_proba` interface

The model uses only these sensor features:

- Air temperature [K]
- Process temperature [K]
- Rotational speed [rpm]
- Torque [Nm]
- Tool wear [min]

Leakage columns such as `TWF`, `HDF`, `PWF`, `OSF`, and `RNF` are not used for training.

## Prediction Logic

- The selected model outputs failure probability.
- The decision threshold is selected during model training.
- `probability > 0.7` is shown as `Critical`.
- Lower probability is shown as `Normal`.
- The API also returns maintenance priority, estimated risk window, contributing factors, and maintenance recommendations.
