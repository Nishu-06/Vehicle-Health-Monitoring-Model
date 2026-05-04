import { motion } from "framer-motion";
import {
  Activity,
  BatteryCharging,
  Fan,
  Flame,
  Gauge,
  RotateCw,
  TimerReset,
  Waves,
  Workflow,
  Wrench
} from "lucide-react";

const baseFields = [
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

const advancedFields = [
  {
    name: "cycle",
    label: "Operating Cycles",
    unit: "cycles",
    hint: "Lifecycle counter used for RUL estimation",
    min: 1,
    max: 362,
    icon: Activity
  },
  {
    name: "vibration_index",
    label: "Vibration Index",
    unit: "score",
    hint: "Subsystem vibration severity proxy",
    min: 10,
    max: 95,
    icon: Waves
  },
  {
    name: "thermal_load",
    label: "Brake Thermal Load",
    unit: "deg",
    hint: "Heat load proxy used for lifecycle forecasting",
    min: 300,
    max: 470,
    icon: Wrench
  },
  {
    name: "pressure_margin",
    label: "Pressure Margin",
    unit: "ratio",
    hint: "Pressure-side stability margin",
    min: 22.8,
    max: 23.7,
    step: 0.01,
    icon: Workflow
  },
  {
    name: "efficiency_index",
    label: "Battery Efficiency",
    unit: "%",
    hint: "Battery/powertrain efficiency proxy",
    min: 37.5,
    max: 40,
    step: 0.01,
    icon: BatteryCharging
  },
  {
    name: "flow_index",
    label: "Flow Stability",
    unit: "index",
    hint: "Flow-side signal used for RUL behavior",
    min: 518,
    max: 524,
    step: 0.1,
    icon: Activity
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
            Original machine telemetry plus added lifecycle signals for RUL.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-400">
          Hybrid input
        </div>
      </div>

      <form className="mt-6 space-y-5" onSubmit={onSubmit}>
        <SectionTitle
          title="Core Fault Prediction Inputs"
          description="These are the original five features used by the RF, XGBoost, and LSTM fault models."
        />
        <div className="space-y-4">
          {baseFields.map((field) => (
            <FieldCard
              key={field.name}
              field={field}
              value={formData[field.name]}
              onChange={onChange}
            />
          ))}
        </div>

        <SectionTitle
          title="Added Lifecycle & Subsystem Inputs"
          description="These additional signals are layered in for subsystem health and remaining useful life forecasting."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {advancedFields.map((field) => (
            <FieldCard
              key={field.name}
              field={field}
              value={formData[field.name]}
              onChange={onChange}
            />
          ))}
        </div>

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
            "Forecast Health & Remaining Life"
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

function SectionTitle({ title, description }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
      <div className="text-sm font-medium text-slate-200">{title}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div>
    </div>
  );
}

function FieldCard({ field, value, onChange }) {
  const Icon = field.icon;
  const outOfRange = value < field.min || value > field.max;

  return (
    <label
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
          <div className="text-sm font-medium text-slate-200">{field.label}</div>
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
          step={field.step ?? "any"}
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
}

export default InputForm;
