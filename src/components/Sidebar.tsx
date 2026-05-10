import type { View } from "../App";

const navItems: Array<{
  label: string;
  icon: string;
  view: View;
}> = [
  { label: "Overview", icon: "O", view: "overview" },
  { label: "Herd Monitoring", icon: "M", view: "monitoring" },
  { label: "Camera Feed", icon: "C", view: "camera" },
  { label: "Analytics", icon: "A", view: "analytics" },
  { label: "Alerts", icon: "!", view: "alerts" },
  { label: "Settings", icon: "S", view: "settings" },
];

interface Props {
  activeView: View;
  onViewChange: (view: View) => void;
}

export default function Sidebar({ activeView, onViewChange }: Props) {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-slate-950/55 p-5 backdrop-blur-2xl lg:block">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 shadow-[0_0_28px_rgba(16,185,129,0.22)]">
          <span className="text-lg font-black text-emerald-300">H</span>
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-wide">
            HerdSense AI
          </h1>
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/55">
            Ops Intelligence
          </p>
        </div>
      </div>

      <nav className="mt-10 space-y-2">
        {navItems.map(item => {
          const isActive = activeView === item.view;

          return (
            <button
              key={item.label}
              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left text-sm transition ${
                isActive
                  ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.12)]"
                  : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-white"
              }`}
              onClick={() => onViewChange(item.view)}
              type="button"
            >
              <span className="grid h-5 w-5 place-items-center rounded border border-white/10 text-xs">
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-10 rounded-lg border border-cyan-300/15 bg-cyan-300/5 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
          <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.9)]" />
          Model Status
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          Simulation engine online. Predictive telemetry is calibrated for demo operations.
        </p>
      </div>
    </aside>
  );
}
