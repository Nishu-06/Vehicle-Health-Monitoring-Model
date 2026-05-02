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

function TrendChart({ history }) {
  const labels = history
    .slice()
    .reverse()
    .map((item) =>
      new Date(item.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    );

  const values = history
    .slice()
    .reverse()
    .map((item) => Math.round(item.result.fault_probability * 100));
  const healthValues = history
    .slice()
    .reverse()
    .map((item) =>
      Math.round(
        (item.result.health_score !== undefined
          ? item.result.health_score
          : 1 - item.result.fault_probability) * 100
      )
    );

  const data = {
    labels,
    datasets: [
      {
        label: "Failure Probability (%)",
        data: values,
        borderColor: "#38bdf8",
        backgroundColor(context) {
          const chart = context.chart;
          const { ctx, chartArea } = chart;

          if (!chartArea) {
            return "rgba(56, 189, 248, 0.12)";
          }

          const gradient = ctx.createLinearGradient(
            0,
            chartArea.top,
            0,
            chartArea.bottom
          );
          gradient.addColorStop(0, "rgba(56, 189, 248, 0.34)");
          gradient.addColorStop(1, "rgba(45, 212, 191, 0.02)");
          return gradient;
        },
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: "#67e8f9",
        fill: true,
        tension: 0.42,
        borderWidth: 2
      },
      {
        label: "Health Score",
        data: healthValues,
        borderColor: "rgba(74, 222, 128, 0.95)",
        backgroundColor: "rgba(74, 222, 128, 0)",
        pointRadius: 0,
        pointHoverRadius: 4,
        borderDash: [6, 4],
        tension: 0.3,
        borderWidth: 2
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#cbd5e1",
          boxWidth: 16,
          boxHeight: 16
        }
      },
      tooltip: {
        backgroundColor: "#08111f",
        borderColor: "rgba(148, 163, 184, 0.15)",
        borderWidth: 1,
        titleColor: "#f8fafc",
        bodyColor: "#cbd5e1"
      }
    },
    scales: {
      x: {
        ticks: { color: "#64748b" },
        grid: { display: false }
      },
      y: {
        min: 0,
        max: 100,
        ticks: {
          color: "#64748b",
          callback: (value) => `${value}%`
        },
        grid: {
          color: "rgba(51, 65, 85, 0.45)"
        }
      }
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Failure Probability Trend
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Last 10 prediction events with smoothed risk progression.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-400">
          Dynamic history
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <QuickStat
          label="Highest Risk"
          value={values.length ? `${Math.max(...values)}%` : "--"}
        />
        <QuickStat
          label="Lowest Health"
          value={healthValues.length ? `${Math.min(...healthValues)}` : "--"}
        />
        <QuickStat
          label="Samples"
          value={`${history.length}`}
        />
      </div>

      <div className="mt-6 h-[340px]">
        {history.length > 0 ? (
          <Line data={data} options={options} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/40 text-sm text-slate-500">
            Run a prediction to populate the trend view.
          </div>
        )}
      </div>
    </motion.section>
  );
}

function QuickStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-slate-100">{value}</div>
    </div>
  );
}

export default TrendChart;
