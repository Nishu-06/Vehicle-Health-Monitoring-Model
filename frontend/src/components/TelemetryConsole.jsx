import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from "chart.js";
import { Activity } from "lucide-react";
import { motion } from "framer-motion";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

function TelemetryConsole({ history, formData, prediction, healthScore }) {
  const series = buildTelemetrySeries(history, formData, prediction, healthScore);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-amber-300/80">
            Real-Time Prognostics Feed
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Executive Telemetry Console
          </h2>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-100">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(74,222,128,0.7)]" />
          Live API
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <TelemetryChart
          title="Core Speed Trend"
          color="#e7c46f"
          labels={series.labels}
          values={series.coreSpeed}
          yMax={560}
        />
        <TelemetryChart
          title="Combustor Temperature"
          color="#7bc6d6"
          labels={series.labels}
          values={series.temperature}
          yMax={1450}
        />
        <TelemetryChart
          title="Predicted RUL"
          color="#d88766"
          labels={series.labels}
          values={series.rul}
          yMax={380}
        />
        <TelemetryChart
          title="Subsystem Health Mix"
          color="#e7c46f"
          labels={series.healthLabels}
          values={series.healthComposition}
          yMax={100}
          smooth
        />
      </div>
    </motion.section>
  );
}

function TelemetryChart({ title, color, labels, values, yMax, smooth = false }) {
  const data = {
    labels,
    datasets: [
      {
        label: title,
        data: values,
        borderColor: color,
        backgroundColor: "transparent",
        borderWidth: 2.5,
        pointRadius: title === "Subsystem Health Mix" ? 3 : 0,
        pointHoverRadius: 4,
        pointBackgroundColor: color,
        tension: smooth ? 0.38 : 0.2
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0b1320",
        borderColor: "rgba(148, 163, 184, 0.15)",
        borderWidth: 1,
        titleColor: "#f8fafc",
        bodyColor: "#cbd5e1"
      }
    },
    scales: {
      x: {
        ticks: { color: "#7f8ca3", maxRotation: 0 },
        grid: {
          color: "rgba(71, 85, 105, 0.18)",
          drawBorder: false
        }
      },
      y: {
        min: 0,
        max: yMax,
        ticks: { color: "#7f8ca3" },
        grid: {
          color: "rgba(71, 85, 105, 0.18)",
          drawBorder: false
        }
      }
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-amber-300/80">
        <Activity className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="h-[260px]">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}

function buildTelemetrySeries(history, formData, prediction, healthScore) {
  const labels =
    history.length > 0
      ? history
          .slice()
          .reverse()
          .map((item) =>
            new Date(item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            })
          )
      : Array.from({ length: 10 }, (_, index) => `T${index + 1}`);

  const source = history.length > 0 ? history.slice().reverse() : createFallbackRows(formData);

  return {
    labels,
    coreSpeed: source.map((item) => item.input?.rpm ?? item.rpm ?? formData.rpm),
    temperature: source.map((item) => item.input?.process_temp ?? item.process_temp ?? formData.process_temp),
    rul: source.map((item, index) =>
      Math.max(
        0,
        Math.round(item.result?.predicted_rul ?? (prediction?.predicted_rul ?? 140) - index * 4)
      )
    ),
    healthLabels: ["Engine", "Battery", "Brake", "Vibration", "Lifecycle"],
    healthComposition: [
      Math.max(0, Math.round(100 - (prediction?.fault_probability ?? 0) * 100)),
      Math.max(0, Math.round(formData.efficiency_index * 2.1)),
      Math.max(0, Math.round(100 - ((formData.thermal_load - 300) * 0.18))),
      Math.max(0, Math.round(100 - formData.vibration_index)),
      Math.max(0, Math.round((prediction?.predicted_rul ?? 0) / 3.6))
    ]
  };
}

function createFallbackRows(formData) {
  return Array.from({ length: 10 }, (_, index) => ({
    rpm: Math.max(1000, formData.rpm + (index % 4) * 70 - 80),
    process_temp: Math.max(290, formData.process_temp + (index % 5) * 1.2 - 2),
    result: { predicted_rul: Math.max(0, 160 - index * 9) }
  }));
}

export default TelemetryConsole;
