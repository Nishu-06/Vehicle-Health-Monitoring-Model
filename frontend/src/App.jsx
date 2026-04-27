import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Activity, AlertTriangle, Gauge, ShieldCheck } from "lucide-react";
import { Toaster, toast } from "react-hot-toast";
import { motion } from "framer-motion";
import InputForm from "./components/InputForm";
import LogTable from "./components/LogTable";
import PredictionCard from "./components/PredictionCard";
import SummaryCard from "./components/SummaryCard";
import TrendChart from "./components/TrendChart";

const API_BASE_URL = "http://127.0.0.1:5000";

const initialForm = {
  temp: 300,
  process_temp: 310,
  rpm: 1500,
  torque: 40,
  wear: 10
};

const fieldMeta = {
  temp: { label: "Air Temperature", unit: "K", ideal: 300 },
  process_temp: { label: "Process Temperature", unit: "K", ideal: 310 },
  rpm: { label: "Rotational Speed", unit: "rpm", ideal: 1500 },
  torque: { label: "Torque", unit: "Nm", ideal: 40 },
  wear: { label: "Tool Wear", unit: "min", ideal: 10 }
};

function App() {
  const [formData, setFormData] = useState(initialForm);
  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("desc");

  const latestProbability = prediction
    ? Math.round(prediction.fault_probability * 100)
    : 0;
  const healthScore = prediction
    ? Math.max(0, Math.round(100 - prediction.fault_probability * 100))
    : 100;
  const avgRisk = history.length
    ? Math.round(
        history.reduce(
          (total, item) => total + item.result.fault_probability * 100,
          0
        ) / history.length
      )
    : 0;
  const latestStatus = prediction?.status ?? "Normal";
  const confidence = prediction
    ? Math.max(latestProbability, 100 - latestProbability)
    : 92;

  const topFactor = useMemo(() => {
    const ranked = Object.entries(formData)
      .map(([key, value]) => {
        const meta = fieldMeta[key];
        return {
          label: meta.label,
          detail: `${value} ${meta.unit}`,
          delta: Math.abs(value - meta.ideal)
        };
      })
      .sort((a, b) => b.delta - a.delta);

    return ranked[0];
  }, [formData]);

  const filteredHistory = useMemo(() => {
    const sorted = [...history].sort((a, b) => {
      const left = new Date(a.createdAt).getTime();
      const right = new Date(b.createdAt).getTime();
      return sortOrder === "desc" ? right - left : left - right;
    });

    if (statusFilter === "All") {
      return sorted;
    }

    return sorted.filter((item) => item.result.status === statusFilter);
  }, [history, sortOrder, statusFilter]);

  async function loadHistory() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/history`);
      setHistory(response.data);
    } catch (_error) {
      setHistory([]);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: Number(value)
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API_BASE_URL}/api/predict`, formData);
      setPrediction(response.data);
      await loadHistory();
      toast.success("Prediction completed");
    } catch (requestError) {
      const message =
        requestError.response?.data?.error || "Prediction request failed.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const summaryCards = [
    {
      title: "Fault Probability",
      value: `${latestProbability}%`,
      subtitle: "Current failure likelihood",
      icon: AlertTriangle,
      tone:
        latestProbability > 70
          ? "red"
          : latestProbability > 40
            ? "amber"
            : "teal",
      trend: latestProbability > avgRisk ? "+ elevated" : "- stable"
    },
    {
      title: "System Status",
      value: latestStatus,
      subtitle: "Operational classification",
      icon: ShieldCheck,
      tone: latestStatus === "Critical" ? "red" : "green",
      trend: latestStatus === "Critical" ? "Action needed" : "Within threshold"
    },
    {
      title: "Health Score",
      value: `${healthScore}`,
      subtitle: "100 means healthiest state",
      icon: Gauge,
      tone: healthScore < 40 ? "red" : healthScore < 70 ? "amber" : "green",
      trend: `${confidence}% confidence`
    },
    {
      title: "Avg Risk",
      value: `${avgRisk}%`,
      subtitle: "Across recent predictions",
      icon: Activity,
      tone: avgRisk > 60 ? "amber" : "blue",
      trend: `${history.length} logged events`
    }
  ];

  return (
    <div className="min-h-screen bg-transparent text-slate-100">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#08111f",
            color: "#e2e8f0",
            border: "1px solid rgba(148, 163, 184, 0.14)"
          }
        }}
      />

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-cyan-950/10 backdrop-blur"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_25%),radial-gradient(circle_at_left,rgba(59,130,246,0.12),transparent_30%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                <Activity className="h-3.5 w-3.5" />
                Predictive Maintenance Intelligence
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Fleet Reliability Operations Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                Monitor machine health, quantify failure risk, and review recent
                inference history with a production-style dashboard built on the
                AI4I predictive maintenance model.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[560px]">
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Model status
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(74,222,128,0.6)]" />
                  <div className="text-lg font-semibold text-slate-100">
                    Inference pipeline active
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Top factor
                </div>
                <div className="mt-3 text-lg font-semibold text-slate-100">
                  {topFactor.label}
                </div>
                <div className="mt-1 text-sm text-slate-400">{topFactor.detail}</div>
              </div>
            </div>
          </div>
        </motion.header>

        <section className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card, index) => (
            <SummaryCard key={card.title} {...card} delay={index * 0.06} />
          ))}
        </section>

        <main className="mt-6 grid gap-6 2xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="space-y-6">
            <InputForm
              formData={formData}
              loading={loading}
              error={error}
              onChange={handleChange}
              onSubmit={handleSubmit}
            />

            <PredictionCard
              prediction={prediction}
              probability={latestProbability}
              healthScore={healthScore}
              confidence={confidence}
              topFactor={topFactor}
            />
          </div>

          <div className="space-y-6">
            <TrendChart history={history} />

            <LogTable
              history={filteredHistory}
              statusFilter={statusFilter}
              sortOrder={sortOrder}
              onFilterChange={setStatusFilter}
              onSortChange={setSortOrder}
              onRefresh={loadHistory}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
