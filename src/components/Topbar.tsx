import type { Animal } from "../App";

interface Props {
  animals: Animal[];
  dataSourceLabel?: string;
  title?: string;
}

function StatCard({
  title,
  value,
  detail,
  tone,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  tone: "emerald" | "amber" | "red" | "cyan";
  icon: string;
}) {
  const toneClasses = {
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-200",
    red: "border-red-400/25 bg-red-400/10 text-red-200",
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
  };

  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/20 backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
          {title}
        </p>

        <span className={`grid h-9 w-9 place-items-center rounded-lg border ${toneClasses[tone]}`}>
          <span className="text-sm font-bold">{icon}</span>
        </span>
      </div>

      <h2 className="mt-3 text-3xl font-bold tracking-tight">
        {value}
      </h2>

      <p className="mt-2 text-xs text-slate-400">
        {detail}
      </p>
    </div>
  );
}

export default function Topbar({ animals, dataSourceLabel = "Simulation Mode", title = "Herd Operations Command" }: Props) {

  const avgHealth =
    animals.reduce((sum, animal) => sum + animal.health, 0)
    / animals.length || 0;

  const riskyAnimals =
    animals.filter(animal => animal.health < 70).length;

  const outbreakRisk =
    riskyAnimals > 3
      ? "High"
      : riskyAnimals > 1
      ? "Medium"
      : "Low";

  return (
    <header
      className="border-b border-white/10 bg-slate-950/45 p-4 backdrop-blur-2xl"
    >
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-emerald-300/70">
            Real-Time Livestock Intelligence
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.9)]" />
          {dataSourceLabel}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          detail="Telemetry risk score"
          icon="%"
          title="Herd Welfare"
          tone={avgHealth < 70 ? "amber" : "emerald"}
          value={`${avgHealth.toFixed(0)}%`}
        />

        <StatCard
          detail="Below baseline health"
          icon="!"
          title="At-Risk Animals"
          tone={riskyAnimals > 3 ? "red" : riskyAnimals > 0 ? "amber" : "emerald"}
          value={String(riskyAnimals)}
        />

        <StatCard
          detail="Rule-based estimate"
          icon="R"
          title="Outbreak Risk"
          tone={outbreakRisk === "High" ? "red" : outbreakRisk === "Medium" ? "amber" : "emerald"}
          value={outbreakRisk}
        />

        <StatCard
          detail="Collars online"
          icon="N"
          title="Animals Monitored"
          tone="cyan"
          value={String(animals.length)}
        />
      </div>

    </header>
  );
}
