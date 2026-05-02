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
            Intelligent Vehicle Health Monitoring
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
          title="Speed vs Time"
          color="#e7c46f"
          labels={series.labels}
          values={series.speed}
          yMax={32}
        />
        <TelemetryChart
          title="RPM vs Time"
          color="#7bc6d6"
          labels={series.labels}
          values={series.rpm}
          yMax={40}
        />
        <TelemetryChart
          title="Voltage Trend"
          color="#d88766"
          labels={series.labels}
          values={series.voltage}
          yMax={100}
        />
        <TelemetryChart
          title="Health Composition"
          color="#e7c46f"
          labels={["Engine", "Battery", "Brake", "Tire", "Driver"]}
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
        pointRadius: title === "Health Composition" ? 3 : 0,
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

  const rpm = source.map((item, index) => {
    const raw = item.input?.rpm ?? item.rpm ?? formData.rpm;
    return Math.max(2, Math.round(raw / 45 + (index % 3) * 1.4));
  });

  const speed = source.map((item, index) => {
    const raw = item.input?.rpm ?? item.rpm ?? formData.rpm;
    return Math.max(4, Math.round(raw / 85 + ((index % 4) - 1) * 1.1));
  });

  const voltage = source.map((item, index) => {
    const torque = item.input?.torque ?? item.torque ?? formData.torque;
    const temp = item.input?.temp ?? item.temp ?? formData.temp;
    return clamp(Math.round(torque * 1.45 + (temp - 280) + (index % 5) * 4), 0, 100);
  });

  const probability = prediction?.fault_probability
    ? prediction.fault_probability * 100
    : 100 - healthScore;
  const battery = clamp(Math.round(100 - probability * 1.35), 0, 100);
  const brake = clamp(Math.round(100 - formData.torque * 1.35), 0, 100);
  const tire = clamp(Math.round(100 - formData.wear * 0.18), 0, 100);
  const driver = clamp(Math.round(100 - probability * 0.45), 0, 100);
  const engine = clamp(Math.round(healthScore + 6), 0, 100);

  return {
    labels,
    speed,
    rpm,
    voltage,
    healthComposition: [engine, battery, brake, tire, driver]
  };
}

function createFallbackRows(formData) {
  return Array.from({ length: 10 }, (_, index) => ({
    rpm: formData.rpm + (index % 4) * 70 - 80,
    torque: formData.torque + (index % 3) * 4 - 3,
    temp: formData.temp + (index % 5) * 1.2 - 2
  }));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default TelemetryConsole;
