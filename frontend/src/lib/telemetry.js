export const fieldMeta = {
  cycle: {
    label: "Operating Cycles",
    shortLabel: "Cycles",
    unit: "cycles",
    hint: "Accumulated run time since last overhaul.",
    min: 1,
    max: 362,
    ideal: 104,
    step: 1,
    group: "Lifecycle"
  },
  sensor_11: {
    label: "Core Pressure Proxy (S11)",
    shortLabel: "Core Pressure",
    unit: "psi eq",
    hint: "Tracks compressor-stage pressure stability.",
    min: 46.85,
    max: 48.53,
    ideal: 47.51,
    step: 0.01,
    group: "Compression"
  },
  sensor_4: {
    label: "Combustor Temperature (S4)",
    shortLabel: "Combustor Temp",
    unit: "K eq",
    hint: "Thermal load around the hot section.",
    min: 1382.25,
    max: 1441.49,
    ideal: 1408.04,
    step: 0.01,
    group: "Thermal"
  },
  sensor_12: {
    label: "Fuel Flow Proxy (S12)",
    shortLabel: "Fuel Flow",
    unit: "kg/s eq",
    hint: "Fuel-air delivery signal used for degradation tracking.",
    min: 518.69,
    max: 523.38,
    ideal: 521.48,
    step: 0.01,
    group: "Flow"
  },
  sensor_7: {
    label: "Core Speed (S7)",
    shortLabel: "Core Speed",
    unit: "rpm eq",
    hint: "Monitors rotating core stability under load.",
    min: 549.85,
    max: 556.06,
    ideal: 553.44,
    step: 0.01,
    group: "Compression"
  },
  sensor_15: {
    label: "Wear Delta Proxy (S15)",
    shortLabel: "Wear Delta",
    unit: "ratio",
    hint: "Small drift feature strongly linked to component wear.",
    min: 8.3249,
    max: 8.5848,
    ideal: 8.4389,
    step: 0.0001,
    group: "Lifecycle"
  },
  sensor_21: {
    label: "Thermal Margin (S21)",
    shortLabel: "Thermal Margin",
    unit: "ratio",
    hint: "Healthy engines hold this margin in a tight band.",
    min: 22.8942,
    max: 23.6184,
    ideal: 23.2979,
    step: 0.0001,
    group: "Thermal"
  },
  sensor_20: {
    label: "Efficiency Ratio (S20)",
    shortLabel: "Efficiency",
    unit: "%",
    hint: "Reflects how efficiently the propulsion train is operating.",
    min: 38.14,
    max: 39.43,
    ideal: 38.83,
    step: 0.01,
    group: "Flow"
  },
  sensor_2: {
    label: "Inlet Temperature (S2)",
    shortLabel: "Inlet Temp",
    unit: "K eq",
    hint: "Upstream thermal condition before the core section.",
    min: 641.21,
    max: 644.53,
    ideal: 642.64,
    step: 0.01,
    group: "Thermal"
  }
};

export const fieldGroups = [
  {
    title: "Lifecycle & Wear",
    description: "Signals that capture age accumulation and wear drift.",
    fields: ["cycle", "sensor_15"]
  },
  {
    title: "Compression Train",
    description: "Pressure and speed signals from the rotating core.",
    fields: ["sensor_11", "sensor_7"]
  },
  {
    title: "Thermal Loop",
    description: "Hot-section and inlet temperature stability signals.",
    fields: ["sensor_4", "sensor_21", "sensor_2"]
  },
  {
    title: "Fuel & Flow",
    description: "Flow-side telemetry used to estimate performance loss.",
    fields: ["sensor_12", "sensor_20"]
  }
];

export const initialForm = Object.fromEntries(
  Object.entries(fieldMeta).map(([key, value]) => [key, value.ideal])
);

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function varyTelemetryValue(key, value) {
  const meta = fieldMeta[key];
  const baseSpread = Math.max((meta.max - meta.min) * 0.018, meta.step * 2);
  const offset = (Math.random() - 0.5) * baseSpread * 2;
  const next = clamp(value + offset, meta.min, meta.max);
  const precision = meta.step >= 1 ? 0 : Math.min(4, `${meta.step}`.split(".")[1]?.length ?? 2);
  return Number(next.toFixed(precision));
}

export function calculateDeviationScore(key, value) {
  const meta = fieldMeta[key];
  const range = Math.max(meta.max - meta.min, meta.step);
  return Math.abs(value - meta.ideal) / range;
}

export function buildSubsystemHealth(formData, prediction, healthScore) {
  const probability = (prediction?.fault_probability ?? 0) * 100;
  const predictedRul = prediction?.predicted_rul ?? 0;
  const lifeScore = clamp(
    Math.round((predictedRul / Math.max(prediction?.rul_reference_max ?? 150, 1)) * 100),
    0,
    100
  );

  const thermalLoad =
    (calculateDeviationScore("sensor_4", formData.sensor_4) +
      calculateDeviationScore("sensor_21", formData.sensor_21) +
      calculateDeviationScore("sensor_2", formData.sensor_2)) /
    3;
  const compressionLoad =
    (calculateDeviationScore("sensor_11", formData.sensor_11) +
      calculateDeviationScore("sensor_7", formData.sensor_7)) /
    2;
  const flowLoad =
    (calculateDeviationScore("sensor_12", formData.sensor_12) +
      calculateDeviationScore("sensor_20", formData.sensor_20)) /
    2;
  const wearLoad =
    (calculateDeviationScore("cycle", formData.cycle) +
      calculateDeviationScore("sensor_15", formData.sensor_15)) /
    2;

  return [
    {
      label: "Lifecycle",
      score: clamp(Math.round((lifeScore + (100 - wearLoad * 100)) / 2), 0, 100),
      helper: `Predicted runway ${Math.round(predictedRul || 0)} cycles remaining.`
    },
    {
      label: "Compression",
      score: clamp(Math.round(100 - compressionLoad * 145 - probability * 0.18), 0, 100),
      helper: `Pressure ${formData.sensor_11.toFixed(2)} | speed ${formData.sensor_7.toFixed(2)}`
    },
    {
      label: "Thermal",
      score: clamp(Math.round(100 - thermalLoad * 150 - probability * 0.12), 0, 100),
      helper: `Combustor ${formData.sensor_4.toFixed(1)} | inlet ${formData.sensor_2.toFixed(2)}`
    },
    {
      label: "Flow",
      score: clamp(Math.round(100 - flowLoad * 145 - probability * 0.1), 0, 100),
      helper: `Fuel flow ${formData.sensor_12.toFixed(2)} | efficiency ${formData.sensor_20.toFixed(2)}`
    },
    {
      label: "Overall",
      score: clamp(Math.round(healthScore), 0, 100),
      helper: `Model confidence ${Math.round((prediction?.confidence ?? 0.9) * 100)}%`
    }
  ];
}
