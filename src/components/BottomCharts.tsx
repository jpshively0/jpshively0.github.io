import type { ReactNode } from "react";

import type { AnalyticsPoint, Animal } from "../App";

interface Props {
  data: AnalyticsPoint[];
  animals: Animal[];
}

function ChartCard({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="min-h-[210px] rounded-lg border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/20 backdrop-blur-2xl">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      {children}
    </div>
  );
}

export default function BottomCharts({ data, animals }: Props) {
  const fallbackData =
    data.length > 0
      ? data
      : [{ time: "00:00", welfare: 100, anomalies: 0, outbreak: 0 }];

  const criticalCount = animals.filter(animal => animal.status === "critical").length;
  const maxAnomalies = Math.max(1, ...fallbackData.map(point => point.anomalies));

  const pointsFor = (key: "welfare" | "outbreak") =>
    fallbackData
      .map((point, index) => {
        const x = fallbackData.length === 1 ? 0 : (index / (fallbackData.length - 1)) * 100;
        const y = 100 - point[key];

        return `${x},${y}`;
      })
      .join(" ");

  return (
    <section className="grid shrink-0 gap-4 border-t border-white/10 bg-slate-950/35 p-4 lg:grid-cols-3">
      <ChartCard label="Herd Welfare Trend">
        <svg className="h-[150px] w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
          <polyline fill="none" points={pointsFor("welfare")} stroke="#34d399" strokeWidth="2.6" vectorEffect="non-scaling-stroke" />
        </svg>
      </ChartCard>

      <ChartCard label="Anomaly Count">
        <div className="flex h-[150px] items-end gap-1">
          {fallbackData.map((point, index) => (
            <div
              className="min-w-1 flex-1 rounded-t bg-amber-400/85 shadow-[0_0_18px_rgba(245,158,11,0.18)]"
              key={`${point.time}-${index}`}
              style={{ height: `${Math.max(8, (point.anomalies / maxAnomalies) * 100)}%` }}
              title={`${point.anomalies} anomalies`}
            />
          ))}
        </div>
      </ChartCard>

      <ChartCard label="Outbreak Probability">
        <svg className="h-[150px] w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
          <polyline
            fill="none"
            points={pointsFor("outbreak")}
            stroke={criticalCount > 0 ? "#ef4444" : "#38bdf8"}
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </ChartCard>
    </section>
  );
}
