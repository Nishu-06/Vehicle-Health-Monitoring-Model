# Predictive Maintenance System

This project is a simulation-based predictive maintenance system built with:

- Python + scikit-learn for machine learning
- FastAPI for model inference
- Node.js + Express for backend integration
- MongoDB for prediction history
- React + Tailwind CSS for the dashboard

## Project structure

```text
project/
├── ml/
│   ├── train_model.py
│   ├── model.pkl
│   └── dataset.csv
├── api/
│   └── main.py
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── .env.example
│   └── models/
│       └── Prediction.js
└── frontend/
    ├── package.json
    ├── index.html
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── index.css
        └── main.jsx
```

## 1. Create a Python virtual environment

From the project root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 2. Train the machine learning model

```powershell
python .\ml\train_model.py
```

This will:

- load `ml/dataset.csv`
- train a Random Forest classifier
- print accuracy
- save the trained model to `ml/model.pkl`

## 3. Start the FastAPI model service

With the virtual environment still active:

```powershell
uvicorn api.main:app --reload --port 8000
```

FastAPI endpoint:

- `POST http://127.0.0.1:8000/predict`

## 4. Start MongoDB

Make sure MongoDB is running locally on:

```text
mongodb://127.0.0.1:27017/predictive_maintenance
```

If you use MongoDB Atlas or another host, copy `backend/.env.example` to `backend/.env` and update the value.

## 5. Start the Node/Express backend

In a new terminal:

```powershell
cd .\backend
npm install
npm run dev
```

Backend endpoints:

- `POST http://127.0.0.1:5000/api/predict`
- `GET http://127.0.0.1:5000/api/history`

## 6. Start the React frontend

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

## How it works

1. The React dashboard sends sensor values to the Node backend.
2. The Node backend forwards those values to FastAPI.
3. FastAPI loads `model.pkl` and predicts failure probability.
4. The backend stores inputs, result, and timestamp in MongoDB.
5. The frontend shows the result and recent history.

## Notes

- The model uses only these features:
  - Air temperature [K]
  - Process temperature [K]
  - Rotational speed [rpm]
  - Torque [Nm]
  - Tool wear [min]
- Leakage columns (`TWF`, `HDF`, `PWF`, `OSF`, `RNF`) are not used.
- Status rule:
  - probability > `0.7` => `Critical`
  - otherwise => `Normal`

