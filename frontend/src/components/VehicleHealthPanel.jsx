import { motion } from "framer-motion";

function VehicleHealthPanel({ formData, prediction, healthScore }) {
  const probability = Math.round((prediction?.fault_probability ?? 0) * 100);
  const engineStatus = probability > 70 ? "Attention" : "Healthy";
  const batteryScore = clamp(Math.round(100 - probability * 1.35), 0, 100);
  const brakeScore = clamp(Math.round(100 - formData.torque * 1.4), 0, 100);
  const driverStatus = probability > 70 ? "Alert" : "Normal";
  const tone =
    healthScore < 45 ? "Critical" : healthScore < 70 ? "Warning" : "Healthy";
  const accentColor =
    tone === "Critical" ? "#fb7185" : tone === "Warning" ? "#38bdf8" : "#2dd4bf";
  const toneChipClass =
    tone === "Critical"
      ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
      : tone === "Warning"
        ? "border-sky-400/20 bg-sky-500/10 text-sky-200"
        : "border-teal-400/20 bg-teal-500/10 text-teal-200";
  const ringStyle = {
    background: `conic-gradient(${accentColor} ${healthScore * 3.6}deg, rgba(15, 23, 42, 0.92) 0deg)`
  };

  const cards = [
    {
      label: "Engine",
      value: engineStatus,
      helper: `RPM ${Math.round(formData.rpm)}, temperature ${formData.temp.toFixed(1)} K.`
    },
    {
      label: "Battery",
      value: `${batteryScore}%`,
      helper: `Estimated remaining life ${Math.max(0, Math.round(batteryScore / 5))} cycles.`
    },
    {
      label: "Brake",
      value: `${brakeScore}%`,
      helper: `Estimated remaining distance ${Math.max(900, brakeScore * 140)} km.`
    },
    {
      label: "Driver",
      value: driverStatus,
      helper: `DSSI ${clamp(Math.round(healthScore + 8), 0, 100)}`
    }
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur"
    >
      <div className="grid gap-4 xl:grid-cols-[1.05fr_1.45fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <h3 className="text-lg font-semibold text-slate-100">Vehicle Health Score</h3>

          <div className="mt-8 flex items-center justify-center">
            <div
              className="relative flex h-72 w-72 items-center justify-center rounded-full"
              style={ringStyle}
            >
              <div className="flex h-48 w-48 flex-col items-center justify-center rounded-full bg-slate-950 text-center shadow-[inset_0_0_30px_rgba(255,255,255,0.03)]">
                <div className="text-6xl font-semibold tracking-tight text-slate-50">
                  {healthScore}
                </div>
                <div className="mt-4 text-xs uppercase tracking-[0.26em] text-slate-500">
                  Health
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <span className={`rounded-full border px-5 py-2 text-sm font-medium ${toneChipClass}`}>
              {tone}
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"
            >
              <div className="text-sm text-slate-400">{card.label}</div>
              <div className="mt-5 text-2xl font-semibold text-slate-50">
                {card.value}
              </div>
              <div className="mt-4 text-sm leading-6 text-slate-500">
                {card.helper}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default VehicleHealthPanel;
