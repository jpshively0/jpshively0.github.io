import type { Alert } from "../App";

interface Props {
  alerts: Alert[];
}

export default function AlertPanel({ alerts }: Props) {

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.055] shadow-2xl shadow-black/25 backdrop-blur-2xl">
      <div className="shrink-0 border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
              Live Alerts
            </p>
            <h2 className="mt-1 text-xl font-bold">
              Risk Queue
            </h2>
          </div>

          <span className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-200">
            {alerts.length} Active
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {alerts.length === 0 && (
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
            No active anomalies. Herd telemetry is inside expected range.
          </div>
        )}

        {alerts.map(alert => (
          <article
            key={alert.id}
            className={`rounded-lg border p-4 transition ${
              alert.severity === "critical"
                ? "border-red-400/30 bg-red-500/10 shadow-[0_0_28px_rgba(239,68,68,0.12)]"
                : "border-amber-400/25 bg-amber-400/10"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border text-lg font-bold ${
                  alert.severity === "critical"
                    ? "border-red-300/30 bg-red-400/15 text-red-200"
                    : "border-amber-300/25 bg-amber-400/15 text-amber-200"
                }`}
              >
                !
              </div>

              <div className="min-w-0">
                <h3 className="font-semibold text-white">
                  Animal {alert.animalId}: {alert.title}
                </h3>

                <p className="mt-1 text-sm leading-5 text-slate-300">
                  {alert.message}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-slate-200">
                    Health {alert.health.toFixed(0)}%
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-slate-200">
                    {alert.metric}
                  </span>
                </div>

                <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/35 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Evidence
                  </p>
                  <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
                    {alert.reasons.map(reason => (
                      <li className="flex gap-2" key={reason}>
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 border-t border-white/10 pt-2 text-xs leading-5 text-cyan-100">
                    {alert.recommendation}
                  </p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="shrink-0 border-t border-white/10 p-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-300" />
          Prototype decision support. Human review required before action.
        </div>
      </div>

    </aside>
  );
}
