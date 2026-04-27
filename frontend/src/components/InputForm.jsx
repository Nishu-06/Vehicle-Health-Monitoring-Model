import { motion } from "framer-motion";
import {
  Fan,
  Flame,
  Gauge,
  RotateCw,
  TimerReset
} from "lucide-react";

const fields = [
  {
    name: "temp",
    label: "Air Temperature",
    unit: "K",
    hint: "Typical operating range: 295-305 K",
    min: 280,
    max: 330,
    icon: Fan
  },
  {
    name: "process_temp",
    label: "Process Temperature",
    unit: "K",
    hint: "Typical operating range: 305-315 K",
    min: 290,
    max: 340,
    icon: Flame
  },
  {
    name: "rpm",
    label: "Rotational Speed",
    unit: "rpm",
    hint: "Typical operating range: 1200-1800 rpm",
    min: 1000,
    max: 3000,
    icon: RotateCw
  },
  {
    name: "torque",
    label: "Torque",
    unit: "Nm",
    hint: "Typical operating range: 20-70 Nm",
    min: 0,
    max: 100,
    icon: Gauge
  },
  {
    name: "wear",
    label: "Tool Wear",
    unit: "min",
    hint: "Typical operating range: 0-250 min",
    min: 0,
    max: 300,
    icon: TimerReset
  }
];

function InputForm({ formData, loading, error, onChange, onSubmit }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Sensor Input Panel</h2>
          <p className="mt-1 text-sm text-slate-400">
            Enter the latest machine telemetry to score failure risk.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-400">
          Manual input
        </div>
      </div>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        {fields.map((field) => {
          const Icon = field.icon;
          const value = formData[field.name];
          const outOfRange = value < field.min || value > field.max;

          return (
            <label
              key={field.name}
              className={`block rounded-2xl border px-4 pb-3 pt-3 transition ${
                outOfRange
                  ? "border-amber-400/35 bg-amber-400/5"
                  : "border-white/10 bg-slate-900/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-white/10 bg-slate-950/80 p-2.5">
                  <Icon className="h-4.5 w-4.5 text-cyan-200" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-200">
                    {field.label}
                  </div>
                  <div className="text-xs text-slate-500">{field.hint}</div>
                </div>
                <div className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                  {field.unit}
                </div>
              </div>

              <div className="relative mt-3">
                <input
                  type="number"
                  name={field.name}
                  value={value}
                  onChange={onChange}
                  step="any"
                  min={field.min}
                  max={field.max}
                  required
                  placeholder=" "
                  className="peer h-12 w-full rounded-xl border border-white/10 bg-[#030914] px-4 pt-5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50"
                />
                <span className="pointer-events-none absolute left-4 top-2 text-[11px] uppercase tracking-[0.16em] text-slate-500 transition">
                  Value
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Allowed: {field.min} - {field.max} {field.unit}
                </span>
                {outOfRange ? (
                  <span className="text-amber-300">Outside suggested range</span>
                ) : (
                  <span className="text-emerald-300">Within suggested range</span>
                )}
              </div>
            </label>
          );
        })}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-400 px-4 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-950/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
              Running prediction...
            </>
          ) : (
            "Check Health"
          )}
        </button>
      </form>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
    </motion.section>
  );
}

export default InputForm;
