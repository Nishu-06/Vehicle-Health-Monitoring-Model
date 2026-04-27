import { motion } from "framer-motion";

const toneClasses = {
  blue: "from-sky-500/20 to-cyan-400/5 border-sky-400/20",
  teal: "from-teal-400/20 to-cyan-400/5 border-teal-300/20",
  green: "from-emerald-400/20 to-emerald-300/5 border-emerald-300/20",
  amber: "from-amber-400/20 to-amber-200/5 border-amber-300/20",
  red: "from-rose-500/20 to-orange-300/5 border-rose-300/20"
};

function SummaryCard({ title, value, subtitle, icon: Icon, tone, trend, delay }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className={`rounded-2xl border bg-gradient-to-br ${toneClasses[tone]} bg-slate-950/60 p-5 shadow-xl shadow-slate-950/20`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
            {title}
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {value}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <Icon className="h-5 w-5 text-slate-100" />
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-slate-400">{subtitle}</p>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
          {trend}
        </span>
      </div>
    </motion.section>
  );
}

export default SummaryCard;
