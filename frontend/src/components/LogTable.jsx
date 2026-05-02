import { motion } from "framer-motion";

function LogTable({
  history,
  statusFilter,
  sortOrder,
  onFilterChange,
  onSortChange,
  onRefresh
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Prediction Log</h2>
          <p className="mt-1 text-sm text-slate-400">
            Recent machine scoring events captured by the backend.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(event) => onFilterChange(event.target.value)}
            className="h-10 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-slate-200 outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Normal">Normal</option>
            <option value="Critical">Critical</option>
          </select>

          <select
            value={sortOrder}
            onChange={(event) => onSortChange(event.target.value)}
            className="h-10 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-slate-200 outline-none"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>

          <button
            type="button"
            onClick={onRefresh}
            className="h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full overflow-hidden rounded-2xl text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">Air Temp</th>
              <th className="px-4 py-3 font-medium">Process Temp</th>
              <th className="px-4 py-3 font-medium">RPM</th>
              <th className="px-4 py-3 font-medium">Torque</th>
              <th className="px-4 py-3 font-medium">Wear</th>
              <th className="px-4 py-3 font-medium">Probability</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {history.length > 0 ? (
              history.map((item, index) => (
                <tr
                  key={item._id ?? `${item.createdAt}-${index}`}
                  className={`border-b border-white/6 transition hover:bg-white/[0.04] ${
                    index % 2 === 0 ? "bg-white/[0.015]" : "bg-transparent"
                  }`}
                >
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-200">{item.input.temp}</td>
                  <td className="px-4 py-3 text-slate-200">
                    {item.input.process_temp}
                  </td>
                  <td className="px-4 py-3 text-slate-200">{item.input.rpm}</td>
                  <td className="px-4 py-3 text-slate-200">{item.input.torque}</td>
                  <td className="px-4 py-3 text-slate-200">{item.input.wear}</td>
                  <td className="px-4 py-3 font-medium text-slate-100">
                    {Math.round(item.result.fault_probability * 100)}%
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {item.result.maintenance_priority ?? item.result.risk_band ?? "--"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                        item.result.status === "Critical"
                          ? "border-rose-400/25 bg-rose-500/10 text-rose-200"
                          : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                      }`}
                    >
                      {item.result.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="px-4 py-10 text-center text-slate-500">
                  No prediction records available for the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.section>
  );
}

export default LogTable;
