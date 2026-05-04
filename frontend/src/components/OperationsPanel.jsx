import { motion } from "framer-motion";
import { Bot, Cpu, Play, Pause, Wrench } from "lucide-react";

const assetIds = ["VH-204", "VH-308", "VH-417", "VH-512"];

function OperationsPanel({
  assetId,
  setAssetId,
  simulationActive,
  setSimulationActive,
  avgHealth,
  criticalEvents,
  prediction,
  avgRul
}) {
  const recommendations = prediction?.maintenance_recommendations ?? [
    "Run an assessment to generate targeted maintenance guidance.",
    "Review the latest telemetry against the machine operating envelope."
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Operations & Alerts</h2>
          <p className="mt-1 text-sm text-slate-400">
            Simulate live monitoring and translate risk into action.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSimulationActive((current) => !current)}
          className={`inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-medium transition ${
            simulationActive
              ? "border border-rose-400/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15"
              : "border border-cyan-400/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15"
          }`}
        >
          {simulationActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {simulationActive ? "Stop Simulation" : "Start Live Simulation"}
        </button>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
              <Cpu className="h-4 w-4 text-cyan-200" />
              Asset selection
            </div>
            <select
              value={assetId}
              onChange={(event) => setAssetId(event.target.value)}
              className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-[#030914] px-3 text-sm text-slate-100 outline-none"
            >
              {assetIds.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <div className="mt-3 text-sm text-slate-400">
              {simulationActive
                ? "Telemetry values are being perturbed every few seconds to mimic incoming signals."
                : "Switch on simulation mode to make the dashboard behave like a live plant feed."}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MiniStat
              label="Average Health"
              value={`${avgHealth}/100`}
              tone="emerald"
            />
            <MiniStat
              label="Fleet Avg RUL"
              value={avgRul ? `${avgRul} cycles` : "--"}
              tone="cyan"
            />
            <MiniStat
              label="Critical Events"
              value={`${criticalEvents}`}
              tone={criticalEvents > 0 ? "rose" : "emerald"}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
            <Wrench className="h-4 w-4 text-cyan-200" />
            Maintenance guidance
          </div>
          <div className="mt-4 space-y-3">
            {recommendations.map((item) => (
              <div
                key={item}
                className="flex gap-3 rounded-2xl border border-white/10 bg-[#030914] px-4 py-3"
              >
                <Bot className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
                <p className="text-sm leading-6 text-slate-300">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function MiniStat({ label, value, tone }) {
  const toneClass = {
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    rose: "border-rose-400/20 bg-rose-500/10 text-rose-100",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100"
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneClass[tone]}`}>
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default OperationsPanel;
