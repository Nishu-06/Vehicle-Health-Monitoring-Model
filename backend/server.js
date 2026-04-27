const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const axios = require("axios");
const Prediction = require("./models/Prediction");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const fastApiUrl = process.env.FASTAPI_URL || "http://127.0.0.1:8000/predict";
const mongoUri =
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/predictive_maintenance";
let isMongoReady = false;

app.use(cors());
app.use(express.json());

mongoose
  .connect(mongoUri)
  .then(() => {
    isMongoReady = true;
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    isMongoReady = false;
    console.error("MongoDB connection failed:", error.message);
  });

app.get("/", (_request, response) => {
  response.json({ message: "Backend server is running" });
});

app.post("/api/predict", async (request, response) => {
  try {
    const { temp, process_temp, rpm, torque, wear } = request.body;

    if ([temp, process_temp, rpm, torque, wear].some((value) => typeof value !== "number")) {
      return response.status(400).json({
        error: "All input values must be numbers."
      });
    }

    const apiResponse = await axios.post(fastApiUrl, {
      temp,
      process_temp,
      rpm,
      torque,
      wear
    });

    const predictionResult = apiResponse.data;
    let savedPrediction = null;

    if (isMongoReady) {
      savedPrediction = new Prediction({
        input: { temp, process_temp, rpm, torque, wear },
        result: predictionResult
      });
      await savedPrediction.save();
    }

    response.json({
      ...predictionResult,
      id: savedPrediction?._id ?? null,
      timestamp: savedPrediction?.createdAt ?? new Date().toISOString(),
      storage: isMongoReady ? "saved" : "skipped"
    });
  } catch (error) {
    const message =
      error.response?.data?.detail ||
      error.message ||
      "Prediction request failed";

    response.status(500).json({ error: message });
  }
});

app.get("/api/history", async (_request, response) => {
  try {
    if (!isMongoReady) {
      return response.json([]);
    }

    const history = await Prediction.find().sort({ createdAt: -1 }).limit(10);
    response.json(history);
  } catch (error) {
    response.status(500).json({ error: "Could not fetch history" });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening on http://127.0.0.1:${port}`);
});
