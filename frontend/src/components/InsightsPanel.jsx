import { motion } from "framer-motion";
import { BarChart3, BrainCircuit, Target } from "lucide-react";

function InsightsPanel({ prediction, avgHealth, avgRisk, history }) {
  const factors = prediction?.contributing_factors ?? [];
  const metrics = prediction?.model_metrics;
  const modelComparison = prediction?.model_comparison ?? {};
  const criticalRate = history.length
    ? Math.round(
        (history.filter((item) => item.result.status === "Critical").length /
          history.length) *
          100
      )
    : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur"
    >
      <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
            <BrainCircuit className="h-4 w-4 text-cyan-200" />
            Explainability view
          </div>
          <div className="mt-3 text-sm leading-6 text-slate-400">
            {prediction?.explanation ??
              "Run a prediction to see which sensor patterns are driving the output."}
          </div>

          <div className="mt-5 space-y-3">
            {factors.length > 0 ? (
              factors.map((factor) => (
                <FactorBar key={factor.key} factor={factor} />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#030914] px-4 py-8 text-sm text-slate-500">
                Feature contribution details will appear here after prediction.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
              <Target className="h-4 w-4 text-cyan-200" />
              Model quality
            </div>
            <div className="mt-3 text-sm text-slate-400">
              Production model:{" "}
              <span className="font-medium text-slate-200">
                {metrics?.selected_model_name ?? prediction?.model_name ?? "RandomForestClassifier"}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MetricTile label="Accuracy" value={formatMetric(metrics?.accuracy)} />
              <MetricTile label="Precision" value={formatMetric(metrics?.precision)} />
              <MetricTile label="Recall" value={formatMetric(metrics?.recall)} />
              <MetricTile label="F1 Score" value={formatMetric(metrics?.f1_score)} />
            </div>
            <div className="mt-3 rounded-2xl border border-white/10 bg-[#030914] px-4 py-3 text-sm text-slate-400">
              Decision threshold:{" "}
              <span className="font-medium text-slate-200">
                {metrics?.decision_threshold ?? prediction?.decision_threshold ?? "--"}
              </span>
            </div>

            {Object.keys(modelComparison).length > 0 ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-[#030914] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Model Comparison
                </div>
                <div className="mt-3 space-y-3">
                  {Object.entries(modelComparison).map(([name, value]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950 px-3 py-3"
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-100">{name}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          F1: {formatMetric(value.f1_score)} | Recall: {formatMetric(value.recall)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Tuned threshold: {value.threshold_tuning?.threshold ?? "--"} | Tuned F1: {formatMetric(value.threshold_tuning?.f1_score)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-slate-100">
                          {formatMetric(value.accuracy)}
                        </div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                          accuracy
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
              <BarChart3 className="h-4 w-4 text-cyan-200" />
              Fleet analytics
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MetricTile label="Average Health" value={`${avgHealth}/100`} />
              <MetricTile label="Average Risk" value={`${avgRisk}%`} />
              <MetricTile label="Critical Rate" value={`${criticalRate}%`} />
            </div>
            {metrics?.confusion_matrix ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-[#030914] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Confusion Matrix
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
                  {metrics.confusion_matrix.flat().map((value, index) => (
                    <div
                      key={`${value}-${index}`}
                      className="rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-slate-100"
                    >
                      {value}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function FactorBar({ factor }) {
  const width = Math.min(100, Math.max(8, factor.impact_score * 400));

  return (
    <div className="rounded-2xl border border-white/10 bg-[#030914] p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-slate-100">{factor.name}</div>
          <div className="mt-1 text-xs text-slate-500">
            Current: {factor.value} | Baseline: {factor.mean}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-100">
            {factor.impact_score}
          </div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            impact
          </div>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-teal-300"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function MetricTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#030914] px-4 py-4">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function formatMetric(value) {
  if (value === undefined || value === null) {
    return "--";
  }

  return `${Math.round(value * 100)}%`;
}

export default InsightsPanel;
