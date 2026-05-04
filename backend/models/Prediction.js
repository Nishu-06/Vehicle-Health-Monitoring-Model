const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema(
  {
    input: {
      temp: { type: Number, required: true },
      process_temp: { type: Number, required: true },
      rpm: { type: Number, required: true },
      torque: { type: Number, required: true },
      wear: { type: Number, required: true },
      cycle: { type: Number, required: true },
      vibration_index: { type: Number, required: true },
      thermal_load: { type: Number, required: true },
      pressure_margin: { type: Number, required: true },
      efficiency_index: { type: Number, required: true },
      flow_index: { type: Number, required: true }
    },
    result: {
      fault_probability: { type: Number, required: true },
      status: { type: String, required: true },
      confidence: { type: Number },
      health_score: { type: Number },
      predicted_rul: { type: Number },
      rul_band: { type: String },
      risk_band: { type: String },
      maintenance_priority: { type: String },
      estimated_risk_window: { type: String },
      explanation: { type: String },
      subsystem_health: [
        {
          name: String,
          score: Number
        }
      ],
      maintenance_recommendations: [{ type: String }],
      contributing_factors: [
        {
          key: String,
          name: String,
          value: Number,
          mean: Number,
          z_score: Number,
          importance: Number,
          impact_score: Number
        }
      ],
      top_influencing_factor: {
        key: String,
        name: String,
        value: Number,
        mean: Number,
        z_score: Number,
        importance: Number,
        impact_score: Number
      },
      model_metrics: {
        accuracy: Number,
        precision: Number,
        recall: Number,
        f1_score: Number,
        confusion_matrix: [[Number]],
        train_samples: Number,
        test_samples: Number
      },
      rul_metrics: {
        mae: Number,
        rmse: Number,
        r2_score: Number,
        rul_reference_max: Number,
        median_rul: Number
      }
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
