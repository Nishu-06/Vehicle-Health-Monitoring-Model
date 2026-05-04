import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Activity,
  AlertTriangle,
  Gauge,
  Moon,
  Sun,
  ShieldCheck,
  TimerReset
} from "lucide-react";
import { Toaster, toast } from "react-hot-toast";
import { motion } from "framer-motion";
import InputForm from "./components/InputForm";
import InsightsPanel from "./components/InsightsPanel";
import LogTable from "./components/LogTable";
import OperationsPanel from "./components/OperationsPanel";
import PredictionCard from "./components/PredictionCard";
import SummaryCard from "./components/SummaryCard";
import TelemetryConsole from "./components/TelemetryConsole";
import TrendChart from "./components/TrendChart";
import VehicleHealthPanel from "./components/VehicleHealthPanel";

const API_BASE_URL = "http://127.0.0.1:5000";

const initialForm = {
  temp: 300,
  process_temp: 310,
  rpm: 1500,
  torque: 40,
  wear: 10,
  cycle: 104,
  vibration_index: 42,
  thermal_load: 345,
  pressure_margin: 23.3,
  efficiency_index: 38.8,
  flow_index: 521.5
};

const fieldMeta = {
  temp: { label: "Air Temperature", unit: "K", ideal: 300 },
  process_temp: { label: "Process Temperature", unit: "K", ideal: 310 },
  rpm: { label: "Rotational Speed", unit: "rpm", ideal: 1500 },
  torque: { label: "Torque", unit: "Nm", ideal: 40 },
  wear: { label: "Tool Wear", unit: "min", ideal: 10 },
  cycle: { label: "Operating Cycles", unit: "cycles", ideal: 104 },
  vibration_index: { label: "Vibration Index", unit: "score", ideal: 42 },
  thermal_load: { label: "Brake Thermal Load", unit: "deg", ideal: 345 },
  pressure_margin: { label: "Pressure Margin", unit: "ratio", ideal: 23.3 },
  efficiency_index: { label: "Battery Efficiency", unit: "%", ideal: 38.8 },
  flow_index: { label: "Flow Stability", unit: "index", ideal: 521.5 }
};

function App() {
  const [formData, setFormData] = useState(initialForm);
  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("desc");
  const [simulationActive, setSimulationActive] = useState(false);
  const [simulationTick, setSimulationTick] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState("VH-204");
  const [isLightTheme, setIsLightTheme] = useState(false);
  const simulationTimerRef = useRef(null);

  useEffect(() => {
    const storedTheme = localStorage.getItem("dashboard_theme");
    const nextIsLight = storedTheme === "light";
    setIsLightTheme(nextIsLight);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light-theme", isLightTheme);
    localStorage.setItem("dashboard_theme", isLightTheme ? "light" : "dark");
  }, [isLightTheme]);

  const latestProbability = prediction
    ? Math.round(prediction.fault_probability * 100)
    : 0;
  const healthScore = prediction
    ? Math.round((prediction.health_score ?? 1 - prediction.fault_probability) * 100)
    : 100;
  const predictedRul = prediction ? Math.round(prediction.predicted_rul ?? 0) : 0;
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
    ? Math.round((prediction.confidence ?? Math.max(latestProbability, 100 - latestProbability) / 100) * 100)
    : 92;
  const criticalEvents = history.filter(
    (item) => item.result.status === "Critical"
  ).length;
  const avgHealth = history.length
    ? Math.round(
        history.reduce(
          (total, item) =>
            total +
            (item.result.health_score !== undefined
              ? item.result.health_score * 100
              : 100 - item.result.fault_probability * 100),
          0
        ) / history.length
      )
    : healthScore;
  const avgRul = history.length
    ? Math.round(
        history.reduce(
          (total, item) => total + (item.result.predicted_rul ?? 0),
          0
        ) / history.length
      )
    : predictedRul;

  const topFactor = useMemo(() => {
    if (prediction?.top_influencing_factor) {
      return {
        label: prediction.top_influencing_factor.name,
        detail: `${prediction.top_influencing_factor.value} (impact ${prediction.top_influencing_factor.impact_score})`
      };
    }

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
  }, [formData, prediction]);

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

  useEffect(() => {
    if (!simulationActive) {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
      return undefined;
    }

    simulationTimerRef.current = setInterval(() => {
      setSimulationTick((current) => current + 1);
    }, 6000);

    return () => {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
    };
  }, [simulationActive]);

  useEffect(() => {
    if (!simulationActive || simulationTick === 0) {
      return;
    }

    const simulatedPayload = {
      temp: varyValue(formData.temp, 0.9, 1.8),
      process_temp: varyValue(formData.process_temp, 0.9, 2.2),
      rpm: varyValue(formData.rpm, 15, 120),
      torque: varyValue(formData.torque, 1.2, 7.5),
      wear: varyValue(formData.wear, 1, 8),
      cycle: varyValue(formData.cycle, 1, 4),
      vibration_index: varyValue(formData.vibration_index, 0.6, 4.5),
      thermal_load: varyValue(formData.thermal_load, 2, 12),
      pressure_margin: varyValue(formData.pressure_margin, 0.03, 0.16),
      efficiency_index: varyValue(formData.efficiency_index, 0.08, 0.35),
      flow_index: varyValue(formData.flow_index, 0.2, 1.2)
    };

    setFormData(simulatedPayload);
    runPrediction(simulatedPayload, true);
  }, [simulationActive, simulationTick]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: Number(value)
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await runPrediction(formData, false);
  }

  async function runPrediction(payload, fromSimulation) {
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API_BASE_URL}/api/predict`, payload);
      setPrediction(response.data);
      await loadHistory();
      toast.success(
        fromSimulation ? "Live simulation updated" : "Prediction completed"
      );

      if (response.data.status === "Critical") {
        toast(
          `Critical alert for ${selectedAsset}: ${Math.round(
            response.data.fault_probability * 100
          )}% risk | RUL ${Math.round(response.data.predicted_rul)} cycles`,
          {
            icon: "!"
          }
        );
      }
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
      title: "Predicted RUL",
      value: predictedRul ? `${predictedRul}` : "--",
      subtitle: "Estimated useful life in cycles",
      icon: TimerReset,
      tone: predictedRul < 30 ? "red" : predictedRul < 80 ? "amber" : "blue",
      trend: avgRul ? `fleet avg ${avgRul}` : "waiting"
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
                Keep the original fault prediction workflow, then layer in
                lifecycle telemetry and remaining useful life forecasting for a
                richer vehicle-health monitoring view.
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
                    RF + XGB + LSTM active
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Active asset
                </div>
                <div className="mt-3 text-lg font-semibold text-slate-100">
                  {selectedAsset}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  {simulationActive ? "Simulation stream active" : "Manual scoring mode"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLightTheme((current) => !current)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm font-medium text-slate-100 transition hover:bg-slate-800/70 sm:col-span-2"
              >
                {isLightTheme ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                {isLightTheme ? "Switch to Dark" : "Switch to Light"}
              </button>
            </div>
          </div>
        </motion.header>

        <section className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card, index) => (
            <SummaryCard key={card.title} {...card} delay={index * 0.06} />
          ))}
        </section>

        <main className="mt-6 grid gap-6 2xl:grid-cols-[420px_minmax(0,1fr)]">
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

            <OperationsPanel
              assetId={selectedAsset}
              setAssetId={setSelectedAsset}
              simulationActive={simulationActive}
              setSimulationActive={setSimulationActive}
              avgHealth={avgHealth}
              criticalEvents={criticalEvents}
              prediction={prediction}
              avgRul={avgRul}
            />
          </div>

          <div className="space-y-6">
            <TrendChart history={history} />

            <VehicleHealthPanel
              formData={formData}
              prediction={prediction}
              healthScore={healthScore}
            />

            <TelemetryConsole
              history={history}
              formData={formData}
              prediction={prediction}
              healthScore={healthScore}
            />

            <InsightsPanel
              prediction={prediction}
              avgHealth={avgHealth}
              avgRisk={avgRisk}
              history={history}
            />

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

function varyValue(value, drift, spread) {
  const direction = Math.random() > 0.55 ? 1 : -1;
  const offset = drift + Math.random() * spread;
  return Number((value + direction * offset).toFixed(2));
}

export default App;
