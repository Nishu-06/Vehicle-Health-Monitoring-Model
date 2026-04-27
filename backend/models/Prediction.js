const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema(
  {
    input: {
      temp: { type: Number, required: true },
      process_temp: { type: Number, required: true },
      rpm: { type: Number, required: true },
      torque: { type: Number, required: true },
      wear: { type: Number, required: true }
    },
    result: {
      fault_probability: { type: Number, required: true },
      status: { type: String, required: true }
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

module.exports = mongoose.model("Prediction", predictionSchema);

