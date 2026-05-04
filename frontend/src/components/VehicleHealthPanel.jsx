import { motion } from "framer-motion";

function VehicleHealthPanel({ formData, prediction, healthScore }) {
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

  const cards =
    prediction?.subsystem_health?.map((item) => ({
      label: item.name,
      value: `${Math.round(item.score)}%`,
      helper:
        item.name === "Lifecycle"
          ? `${Math.round(prediction?.predicted_rul ?? 0)} cycles remaining.`
          : `${item.name} subsystem stability score`
    })) ?? [
      {
        label: "Engine",
        value: `${Math.max(0, Math.round(100 - (prediction?.fault_probability ?? 0) * 100))}%`,
        helper: `RPM ${Math.round(formData.rpm)}, temperature ${formData.temp.toFixed(1)} K.`
      },
      {
        label: "Battery",
        value: `${Math.max(0, Math.round(formData.efficiency_index * 2.1))}%`,
        helper: `Efficiency ${formData.efficiency_index.toFixed(2)} with flow ${formData.flow_index.toFixed(1)}.`
      },
      {
        label: "Brake",
        value: `${Math.max(0, Math.round(100 - ((formData.thermal_load - 300) * 0.18)))}%`,
        helper: `Thermal load ${formData.thermal_load.toFixed(1)} under torque ${formData.torque.toFixed(1)}.`
      },
      {
        label: "Vibration",
        value: `${Math.max(0, Math.round(100 - formData.vibration_index))}%`,
        helper: `Vibration index ${formData.vibration_index.toFixed(1)} with margin ${formData.pressure_margin.toFixed(2)}.`
      },
      {
        label: "Lifecycle",
        value: `${Math.max(0, Math.round((prediction?.predicted_rul ?? 0) / 3.6))}%`,
        helper: `Estimated remaining life ${Math.round(prediction?.predicted_rul ?? 0)} cycles.`
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
          <h3 className="text-lg font-semibold text-slate-100">Subsystem Health Score</h3>

          <div className="mt-6 flex items-center justify-center sm:mt-8">
            <div
              className="relative flex h-56 w-56 items-center justify-center rounded-full sm:h-64 sm:w-64 xl:h-72 xl:w-72"
              style={ringStyle}
            >
              <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-slate-950 text-center shadow-[inset_0_0_30px_rgba(255,255,255,0.03)] sm:h-44 sm:w-44 xl:h-48 xl:w-48">
                <div className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl xl:text-6xl">
                  {healthScore}
                </div>
                <div className="mt-2 text-[10px] uppercase tracking-[0.22em] text-slate-500 sm:mt-3 sm:text-xs sm:tracking-[0.26em]">
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

export default VehicleHealthPanel;
