import { motion } from "framer-motion";
import {
  BrainCircuit,
  ClipboardList,
  Radar,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";

function PredictionCard({
  prediction,
  probability,
  healthScore,
  confidence,
  topFactor
}) {
  const status = prediction?.status ?? "Normal";
  const isCritical = status === "Critical";
  const riskBand = prediction?.risk_band ?? "Low";
  const riskWindow = prediction?.estimated_risk_window ?? "Continue scheduled monitoring";
  const badgeStyles = isCritical
    ? "border-rose-400/25 bg-rose-500/10 text-rose-200"
    : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
  const ringStyle = {
    background: `conic-gradient(${
      isCritical ? "#fb7185" : "#2dd4bf"
    } ${healthScore * 3.6}deg, rgba(15, 23, 42, 0.85) 0deg)`
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Prediction Outcome</h2>
          <p className="mt-1 text-sm text-slate-400">
            Model result summary with risk interpretation.
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${badgeStyles}`}>
          {isCritical ? (
            <ShieldAlert className="h-4 w-4" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          {status}
        </div>
      </div>

      <div className="mt-6 grid gap-5 2xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Fault probability
              </div>
              <div className="mt-2 text-4xl font-semibold tracking-tight text-white">
                {probability}%
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <Radar className="h-5 w-5 text-cyan-200" />
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-400">Probability band</span>
              <span className="font-medium text-slate-200">{probability}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${probability}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  isCritical
                    ? "bg-gradient-to-r from-rose-500 to-orange-300"
                    : "bg-gradient-to-r from-sky-400 to-teal-300"
                }`}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-3 xl:grid-cols-2">
            <InfoPill label="Confidence" value={`${confidence}%`} icon={BrainCircuit} />
            <InfoPill
              label="Top influencing factor"
              value={prediction?.top_influencing_factor?.name ?? topFactor.label}
              helper={
                prediction?.top_influencing_factor
                  ? `Current ${prediction.top_influencing_factor.value} | baseline ${prediction.top_influencing_factor.mean}`
                  : topFactor.detail
              }
            />
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            <InfoPill label="Maintenance Priority" value={riskBand} icon={ClipboardList} />
            <InfoPill label="Risk Window" value={riskWindow} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Health score
          </div>
          <div className="mt-6 flex items-center justify-center">
            <div className="relative flex h-40 w-40 items-center justify-center rounded-full" style={ringStyle}>
              <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-slate-950 text-center">
                <div className="text-3xl font-semibold text-white">{healthScore}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Score
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-[#030914] p-4">
            <div className="text-sm font-medium text-slate-200">Interpretation</div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {prediction?.explanation ??
                (isCritical
                  ? "The machine state is above the alert threshold. Maintenance attention should be prioritized."
                  : "The machine is operating within the acceptable risk envelope based on the current input pattern.")}
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function InfoPill({ label, value, helper, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#030914] p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
        {Icon ? <Icon className="h-4 w-4 text-cyan-200" /> : null}
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-100">{value}</div>
      {helper ? <div className="mt-1 text-xs text-slate-500">{helper}</div> : null}
    </div>
  );
}

export default PredictionCard;
