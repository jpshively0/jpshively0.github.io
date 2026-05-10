import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import Sidebar from "./components/Sidebar";
import HerdMap from "./components/HerdMap";
import AlertPanel from "./components/AlertPanel";
import Topbar from "./components/Topbar";
import BottomCharts from "./components/BottomCharts";
import CameraFeed from "./components/CameraFeed";

export interface Animal {
  id: number;
  x: number;
  y: number;
  health: number;
  vx: number;
  vy: number;
  status: "healthy" | "warning" | "critical";
  behavior: "clustered" | "slow" | "isolating";
  isolation: number;
  lastMovement: number;
  temperature?: number;
  heartRate?: number;
  activityLevel?: number;
  ruminationMinutes?: number;
  lastReading?: string;
  vetNotes?: string;
  dataSource?: "simulation" | "farmer_csv" | "live_feed";
  scoreFactors?: ScoreFactor[];
}

export interface AnalyticsPoint {
  time: string;
  welfare: number;
  anomalies: number;
  outbreak: number;
}

export interface Alert {
  id: string;
  animalId: number;
  title: string;
  message: string;
  severity: "warning" | "critical";
  health: number;
  metric: string;
  reasons: string[];
  recommendation: string;
}

export interface ScoreFactor {
  label: string;
  value: string;
  impact: number;
  status: "normal" | "warning" | "critical";
}

export type View = "overview" | "monitoring" | "camera" | "analytics" | "alerts" | "settings";

interface DataSourceState {
  mode: "simulation" | "farmer_csv" | "live_feed";
  label: string;
  importedAt?: string;
  fileName?: string;
  rows?: number;
  error?: string;
}

interface TelemetryRecord {
  animalId: number;
  timestamp: string;
  temperature?: number;
  heartRate?: number;
  activityLevel?: number;
  ruminationMinutes?: number;
  x?: number;
  y?: number;
  vetNotes?: string;
}

const viewTitles: Record<View, string> = {
  overview: "Command Overview",
  monitoring: "Herd Monitoring",
  camera: "Camera Motion",
  analytics: "Analytics",
  alerts: "Alert Center",
  settings: "Settings",
};

const sampleCsv = [
  "animalId,timestamp,temperature,heartRate,activityLevel,ruminationMinutes,x,y,vetNotes",
  "5,2026-05-10T08:30:00Z,39.8,91,24,218,78,32,Sustained low activity and elevated temperature",
  "17,2026-05-10T08:30:00Z,39.3,86,31,271,74,27,Separated from primary group",
  "29,2026-05-10T08:30:00Z,38.5,67,62,410,68,71,Normal follow-up",
  "34,2026-05-10T08:30:00Z,38.4,64,72,438,45,49,Normal telemetry",
  "41,2026-05-10T08:30:00Z,37.4,52,39,298,52,57,Low rumination watch",
].join("\n");

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function statusFromHealth(health: number): Animal["status"] {
  return health < 42 ? "critical" : health < 70 ? "warning" : "healthy";
}

function parseNumber(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const number = Number(value.trim());

  return Number.isFinite(number) ? number : undefined;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());

  return cells;
}

function calculateHealthAssessment({
  activityLevel,
  heartRate,
  ruminationMinutes,
  temperature,
}: {
  activityLevel?: number;
  heartRate?: number;
  ruminationMinutes?: number;
  temperature?: number;
}) {
  let score = 100;
  const factors: ScoreFactor[] = [];

  if (temperature !== undefined) {
    const highImpact = Math.max(0, temperature - 39.1) * 22;
    const lowImpact = Math.max(0, 37.6 - temperature) * 10;
    const impact = highImpact + lowImpact;
    score -= impact;
    factors.push({
      label: "Temperature",
      value: `${temperature.toFixed(1)} C`,
      impact: Math.round(impact),
      status: impact > 14 ? "critical" : impact > 0 ? "warning" : "normal",
    });
  }

  if (heartRate !== undefined) {
    const highImpact = Math.max(0, heartRate - 82) * 0.55;
    const lowImpact = Math.max(0, 48 - heartRate) * 0.45;
    const impact = highImpact + lowImpact;
    score -= impact;
    factors.push({
      label: "Heart rate",
      value: `${heartRate.toFixed(0)} bpm`,
      impact: Math.round(impact),
      status: impact > 8 ? "critical" : impact > 0 ? "warning" : "normal",
    });
  }

  if (activityLevel !== undefined) {
    const impact = Math.max(0, 45 - activityLevel) * 0.72;
    score -= impact;
    factors.push({
      label: "Activity",
      value: activityLevel.toFixed(0),
      impact: Math.round(impact),
      status: impact > 12 ? "critical" : impact > 0 ? "warning" : "normal",
    });
  }

  if (ruminationMinutes !== undefined) {
    const impact = Math.max(0, 320 - ruminationMinutes) * 0.08;
    score -= impact;
    factors.push({
      label: "Rumination",
      value: `${ruminationMinutes.toFixed(0)} min`,
      impact: Math.round(impact),
      status: impact > 9 ? "critical" : impact > 0 ? "warning" : "normal",
    });
  }

  return {
    factors,
    score: clamp(Math.round(score), 8, 100),
  };
}

function animalFromTelemetry(record: TelemetryRecord, previous?: Animal) {
  const x = clamp(record.x ?? previous?.x ?? 35 + ((record.animalId * 7) % 42), 5, 94);
  const y = clamp(record.y ?? previous?.y ?? 28 + ((record.animalId * 11) % 44), 6, 92);
  const assessment = calculateHealthAssessment({
    activityLevel: record.activityLevel,
    heartRate: record.heartRate,
    ruminationMinutes: record.ruminationMinutes,
    temperature: record.temperature,
  });
  const health = assessment.score;
  const status = statusFromHealth(health);
  const isolation = clamp(Math.hypot(x - 49, y - 49) / 58, 0, 1);
  const movement = previous ? Math.hypot(x - previous.x, y - previous.y) : clamp((record.activityLevel ?? 55) / 100, 0.02, 1);

  return {
    id: record.animalId,
    x,
    y,
    health,
    vx: previous ? x - previous.x : 0,
    vy: previous ? y - previous.y : 0,
    status,
    behavior: status === "healthy" ? "clustered" : record.activityLevel !== undefined && record.activityLevel < 28 ? "slow" : "isolating",
    isolation,
    lastMovement: clamp(movement, 0.02, 1),
    temperature: record.temperature,
    heartRate: record.heartRate,
    activityLevel: record.activityLevel,
    ruminationMinutes: record.ruminationMinutes,
    lastReading: record.timestamp,
    vetNotes: record.vetNotes,
    dataSource: "live_feed",
    scoreFactors: assessment.factors,
  } satisfies Animal;
}

function getTopRiskFactors(animal: Animal) {
  const telemetryFactors = animal.scoreFactors
    ?.filter(factor => factor.status !== "normal" && factor.impact > 0)
    .sort((a, b) => b.impact - a.impact)
    .map(factor => `${factor.label}: ${factor.value} (-${factor.impact})`) ?? [];

  const behaviorFactors = [
    animal.isolation > 0.72 ? `Isolation index ${animal.isolation.toFixed(2)}` : undefined,
    animal.lastMovement < 0.07 ? `Low movement ${animal.lastMovement.toFixed(2)}` : undefined,
    animal.health < 72 ? `Welfare score ${animal.health.toFixed(0)}%` : undefined,
  ].filter((factor): factor is string => Boolean(factor));

  return [...telemetryFactors, ...behaviorFactors].slice(0, 4);
}

function recommendationForAnimal(animal: Animal) {
  if (animal.health < 42) {
    return "Prioritize immediate inspection and separate from the main group if symptoms are confirmed.";
  }

  if (animal.scoreFactors?.some(factor => factor.label === "Temperature" && factor.status !== "normal")) {
    return "Check temperature manually, hydration, and appetite at the next handling window.";
  }

  if (animal.lastMovement < 0.07 || (animal.activityLevel !== undefined && animal.activityLevel < 35)) {
    return "Observe gait and willingness to move before escalating.";
  }

  if (animal.isolation > 0.72) {
    return "Confirm whether isolation is environmental or a sustained behavioral change.";
  }

  return "Review telemetry trend before escalating.";
}

function createMockLiveTelemetry(previousAnimals: Animal[]) {
  const riskIds = new Set([5, 17, 29]);
  const timestamp = new Date().toISOString();

  return previousAnimals.map(animal => {
    const risky = riskIds.has(animal.id);
    const temperatureBase = risky ? 39.6 : 38.4;
    const heartRateBase = risky ? 88 : 66;
    const activityBase = risky ? 24 : 68;
    const ruminationBase = risky ? 220 : 430;
    const driftX = risky ? 76 : 49;
    const driftY = animal.id === 17 ? 27 : animal.id === 29 ? 70 : risky ? 32 : 49;
    const x = clamp(animal.x + (driftX - animal.x) * 0.04 + (Math.random() - 0.5) * 1.4, 5, 94);
    const y = clamp(animal.y + (driftY - animal.y) * 0.04 + (Math.random() - 0.5) * 1.4, 6, 92);

    return {
      animalId: animal.id,
      timestamp,
      temperature: Number((temperatureBase + (Math.random() - 0.5) * 0.45).toFixed(1)),
      heartRate: Math.round(heartRateBase + (Math.random() - 0.5) * 9),
      activityLevel: Math.round(activityBase + (Math.random() - 0.5) * 14),
      ruminationMinutes: Math.round(ruminationBase + (Math.random() - 0.5) * 46),
      x,
      y,
      vetNotes: risky ? "Live feed flags sustained deviation from herd baseline." : undefined,
    } satisfies TelemetryRecord;
  });
}

function animalsFromCsv(csv: string) {
  const lines = csv
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV needs a header row and at least one animal row.");
  }

  const headers = parseCsvLine(lines[0]).map(header => header.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const row = headers.reduce<Record<string, string | undefined>>((record, header, headerIndex) => {
      record[header] = values[headerIndex];
      return record;
    }, {});

    const idValue = row.animalid ?? row.id ?? row.tag;
    const id = Number.parseInt(idValue ?? String(index), 10);

    if (!Number.isFinite(id)) {
      throw new Error(`Invalid animal id on row ${index + 2}.`);
    }

    const temperature = parseNumber(row.temperature ?? row.temp);
    const heartRate = parseNumber(row.heartrate ?? row.hr);
    const activityLevel = parseNumber(row.activitylevel ?? row.activity);
    const ruminationMinutes = parseNumber(row.ruminationminutes ?? row.rumination);
    return {
      ...animalFromTelemetry({
        animalId: id,
        timestamp: row.timestamp ?? row.time ?? row.date ?? new Date().toISOString(),
        temperature,
        heartRate,
        activityLevel,
        ruminationMinutes,
        x: parseNumber(row.x),
        y: parseNumber(row.y),
        vetNotes: row.vetnotes ?? row.notes,
      }),
      temperature,
      heartRate,
      activityLevel,
      ruminationMinutes,
      lastReading: row.timestamp ?? row.time ?? row.date,
      vetNotes: row.vetnotes ?? row.notes,
      dataSource: "farmer_csv",
    };
  });
}

function GlassPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-white/10 bg-white/[0.055] shadow-2xl shadow-black/20 backdrop-blur-2xl ${className}`}>
      {children}
    </div>
  );
}

function MetricRow({
  label,
  value,
  tone = "text-slate-100",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 py-3 last:border-b-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

export default function App() {

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsPoint[]>([]);
  const [tick, setTick] = useState(0);
  const [activeView, setActiveView] = useState<View>("overview");
  const [dataSource, setDataSource] = useState<DataSourceState>({
    mode: "simulation",
    label: "Simulation Mode",
  });

  // Create herd
  useEffect(() => {

    const compromised = new Set([5, 17, 29]);

    const herd = Array.from({ length: 42 }, (_, i) => {
      const isCompromised = compromised.has(i);

      return {
        id: i,
        x: isCompromised ? 60 + Math.random() * 14 : 38 + Math.random() * 20,
        y: isCompromised ? 18 + Math.random() * 56 : 36 + Math.random() * 22,
        health: isCompromised ? 72 - Math.random() * 14 : 91 + Math.random() * 8,
        vx: (Math.random() - 0.5) * 0.55,
        vy: (Math.random() - 0.5) * 0.55,
        status: isCompromised ? "warning" : "healthy",
        behavior: isCompromised ? "isolating" : "clustered",
        isolation: isCompromised ? 0.7 : Math.random() * 0.2,
        lastMovement: 1,
        dataSource: "simulation",
      } satisfies Animal;
    });

    setAnimals(herd);

  }, []);

  // Simulate movement
  useEffect(() => {

    const interval = setInterval(() => {
      setTick(current => current + 1);

      setAnimals(prev =>
        prev.map(animal => {
          if (dataSource.mode === "farmer_csv" || dataSource.mode === "live_feed") {
            const jitterX = (Math.random() - 0.5) * 0.08;
            const jitterY = (Math.random() - 0.5) * 0.08;
            const nextX = clamp(animal.x + jitterX, 5, 94);
            const nextY = clamp(animal.y + jitterY, 6, 92);

            return {
              ...animal,
              x: nextX,
              y: nextY,
              vx: nextX - animal.x,
              vy: nextY - animal.y,
              lastMovement: clamp((animal.activityLevel ?? animal.lastMovement * 100) / 100, 0.02, 1),
            };
          }

          const isCompromised = animal.id === 5 || animal.id === 17 || animal.id === 29;
          const driftX = isCompromised ? 78 : 49;
          const driftY = animal.id === 17 ? 26 : animal.id === 29 ? 72 : 49;
          const speed = isCompromised ? 0.06 : 0.28;
          const healthLoss = isCompromised ? 0.025 + (animal.id % 3) * 0.006 : -0.006;
          const nextHealth = Math.max(16, Math.min(100, animal.health - healthLoss));
          const jitterX = (Math.random() - 0.5) * speed;
          const jitterY = (Math.random() - 0.5) * speed;
          const pullX = (driftX - animal.x) * (isCompromised ? 0.0016 : 0.008);
          const pullY = (driftY - animal.y) * (isCompromised ? 0.0016 : 0.008);
          const nextX = Math.max(5, Math.min(94, animal.x + jitterX + pullX));
          const nextY = Math.max(6, Math.min(92, animal.y + jitterY + pullY));
          const distanceMoved = Math.hypot(nextX - animal.x, nextY - animal.y);
          const status = statusFromHealth(nextHealth);

          return {
            ...animal,
            x: nextX,
            y: nextY,
            vx: nextX - animal.x,
            vy: nextY - animal.y,
            health: nextHealth,
            status,
            behavior: isCompromised ? (nextHealth < 45 ? "slow" : "isolating") : "clustered",
            isolation: isCompromised ? Math.min(1, animal.isolation + 0.0007) : Math.max(0, animal.isolation - 0.0015),
            lastMovement: distanceMoved,
          };
        }),
      );

    }, 550);

    return () => clearInterval(interval);

  }, [dataSource.mode]);

  useEffect(() => {
    if (dataSource.mode !== "live_feed") {
      return;
    }

    const interval = setInterval(() => {
      setAnimals(prev => {
        const telemetryBatch = createMockLiveTelemetry(prev);
        const previousById = new Map(prev.map(animal => [animal.id, animal]));

        return telemetryBatch.map(record => animalFromTelemetry(record, previousById.get(record.animalId)));
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [dataSource.mode]);

  useEffect(() => {
    if (!animals.length || tick % 5 !== 0) {
      return;
    }

    const welfare =
      animals.reduce((sum, animal) => sum + animal.health, 0) / animals.length;
    const anomalies = animals.filter(animal => animal.health < 70 || animal.lastMovement < 0.08).length;
    const outbreak = Math.min(96, anomalies * 9 + (100 - welfare) * 0.72);

    setAnalytics(prev => [
      ...prev.slice(-17),
      {
        time: new Date().toLocaleTimeString([], {
          minute: "2-digit",
          second: "2-digit",
        }),
        welfare: Number(welfare.toFixed(1)),
        anomalies,
        outbreak: Number(outbreak.toFixed(1)),
      },
    ]);
  }, [animals, tick]);

  const alerts = useMemo<Alert[]>(() => {
    return animals
      .filter(animal => animal.health < 72 || animal.lastMovement < 0.07 || animal.isolation > 0.72)
      .sort((a, b) => a.health - b.health)
      .slice(0, 6)
      .map(animal => {
        const severity = animal.health < 42 ? "critical" : "warning";
        const reasons = getTopRiskFactors(animal);
        const title =
          animal.health < 42
            ? "Critical welfare degradation"
            : animal.isolation > 0.72
            ? "Possible stress anomaly"
            : animal.health < 72
            ? "Elevated recovery risk"
            : animal.lastMovement < 0.07
            ? "Abnormal inactivity"
            : "Elevated recovery risk";

        return {
          id: `animal-${animal.id}`,
          animalId: animal.id,
          title,
          message:
            severity === "critical"
              ? "Telemetry scoring shows a high-priority welfare risk requiring human review."
              : "Telemetry scoring shows one or more values outside the expected range.",
          severity,
          health: animal.health,
          metric:
            animal.health < 72
              ? `${animal.health.toFixed(0)} health score`
              : animal.isolation > 0.72
              ? `${animal.isolation.toFixed(2)} isolation`
              : "Low motion",
          reasons: reasons.length ? reasons : ["No individual sensor value supplied; flagged from movement and map behavior."],
          recommendation: recommendationForAnimal(animal),
        };
      });
  }, [animals]);

  const herdWelfare =
    animals.length > 0
      ? animals.reduce((sum, animal) => sum + animal.health, 0) / animals.length
      : 0;
  const warningAnimals = animals.filter(animal => animal.status === "warning").length;
  const criticalAnimals = animals.filter(animal => animal.status === "critical").length;
  const clusteredAnimals = animals.filter(animal => animal.behavior === "clustered").length;

  function handleCsvImport(file: File | undefined) {
    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const importedAnimals = animalsFromCsv(String(reader.result ?? ""));

        setAnimals(importedAnimals);
        setAnalytics([]);
        setTick(0);
        setDataSource({
          mode: "farmer_csv",
          label: "Farmer CSV Import",
          importedAt: new Date().toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short",
          }),
          fileName: file.name,
          rows: importedAnimals.length,
        });
        setActiveView("overview");
      } catch (error) {
        setDataSource(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : "Unable to import CSV.",
        }));
      }
    };

    reader.readAsText(file);
  }

  function downloadSampleCsv() {
    const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "herdsense-sample-telemetry.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function startLiveFeedDemo() {
    setDataSource({
      mode: "live_feed",
      label: "Live Feed Demo",
      importedAt: new Date().toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      rows: animals.length,
    });
    setAnalytics([]);
    setTick(0);
    setActiveView("overview");
  }

  const overviewContent = (
    <>
      <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-h-0">
          <HerdMap animals={animals} />
        </div>

        <AlertPanel alerts={alerts} />
      </section>

      <BottomCharts data={analytics} animals={animals} />
    </>
  );

  const monitoringContent = (
    <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-h-0">
        <HerdMap animals={animals} />
      </div>

      <GlassPanel className="flex min-h-0 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-white/10 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Monitoring Detail</p>
          <h3 className="mt-1 text-xl font-bold">Telemetry Snapshot</h3>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <MetricRow label="Clustered Animals" value={String(clusteredAnimals)} tone="text-emerald-200" />
          <MetricRow label="Warning Animals" value={String(warningAnimals)} tone="text-amber-200" />
          <MetricRow label="Critical Animals" value={String(criticalAnimals)} tone="text-red-200" />
          <MetricRow label="Average Welfare" value={`${herdWelfare.toFixed(1)}%`} tone="text-cyan-200" />
          <MetricRow label="Telemetry Tick" value={String(tick)} />
          <MetricRow label="Data Source" value={dataSource.label} tone="text-cyan-200" />

          <div className="mt-5 rounded-lg border border-emerald-400/15 bg-emerald-400/10 p-4 text-sm leading-6 text-slate-300">
            Hover any animal on the map to inspect its medical profile, clinical timeline, and current care recommendation.
          </div>
        </div>
      </GlassPanel>
    </section>
  );

  const analyticsContent = (
    <section className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="grid gap-4 lg:grid-cols-4">
        <GlassPanel className="p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Welfare</p>
          <p className="mt-3 text-3xl font-bold text-emerald-200">{herdWelfare.toFixed(0)}%</p>
        </GlassPanel>
        <GlassPanel className="p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Anomalies</p>
          <p className="mt-3 text-3xl font-bold text-amber-200">{alerts.length}</p>
        </GlassPanel>
        <GlassPanel className="p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Critical</p>
          <p className="mt-3 text-3xl font-bold text-red-200">{criticalAnimals}</p>
        </GlassPanel>
        <GlassPanel className="p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Samples</p>
          <p className="mt-3 text-3xl font-bold text-cyan-200">{analytics.length}</p>
        </GlassPanel>
      </div>

      <div className="mt-4">
        <BottomCharts data={analytics} animals={animals} />
      </div>
    </section>
  );

  const cameraContent = (
    <CameraFeed animals={animals} />
  );

  const alertsContent = (
    <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <AlertPanel alerts={alerts} />

      <GlassPanel className="min-h-0 overflow-hidden">
        <div className="border-b border-white/10 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Escalation Board</p>
          <h3 className="mt-1 text-xl font-bold">Active Animal Risk Records</h3>
        </div>

        <div className="min-h-0 overflow-y-auto p-4">
          <div className="grid gap-3">
            {alerts.map(alert => (
              <div className="grid gap-3 rounded-lg border border-white/10 bg-slate-950/45 p-4 md:grid-cols-[120px_1fr_150px]" key={alert.id}>
                <div>
                  <p className="text-xs text-slate-500">Animal</p>
                  <p className="mt-1 font-semibold">#{alert.animalId}</p>
                </div>
                <div>
                  <p className="font-semibold">{alert.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{alert.message}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {alert.reasons.map(reason => (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300" key={reason}>
                        {reason}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-cyan-100">{alert.recommendation}</p>
                </div>
                <div className="md:text-right">
                  <p className={alert.severity === "critical" ? "text-red-200" : "text-amber-200"}>
                    {alert.severity}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">{alert.metric}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassPanel>
    </section>
  );

  const settingsContent = (
    <section className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <GlassPanel className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Farmer Data</p>
          <h3 className="mt-1 text-xl font-bold">CSV Telemetry Import</h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Import a farmer export with columns such as animalId, timestamp, temperature, heartRate, activityLevel, ruminationMinutes, x, and y.
          </p>
          <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-cyan-300/25 bg-cyan-300/5 p-6 text-center transition hover:border-cyan-200/45 hover:bg-cyan-300/10">
            <span className="text-sm font-semibold text-cyan-100">Upload farmer CSV</span>
            <span className="mt-2 text-xs text-slate-400">Health scores will be recalculated from telemetry signals.</span>
            <input
              accept=".csv,text/csv"
              className="sr-only"
              onChange={event => handleCsvImport(event.target.files?.[0])}
              type="file"
            />
          </label>
          <button
            className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-200/30 hover:bg-white/10"
            onClick={downloadSampleCsv}
            type="button"
          >
            Download sample telemetry CSV
          </button>
          {dataSource.error && (
            <p className="mt-3 rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-100">
              {dataSource.error}
            </p>
          )}
          <div className="mt-5">
            <MetricRow label="Current Source" value={dataSource.label} tone="text-cyan-200" />
            <MetricRow label="Imported File" value={dataSource.fileName ?? "None"} />
            <MetricRow label="Imported Rows" value={String(dataSource.rows ?? 0)} />
            <MetricRow label="Last Import" value={dataSource.importedAt ?? "Not imported"} />
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Live Feed</p>
          <h3 className="mt-1 text-xl font-bold">API Polling Demo</h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Simulates polling a production telemetry endpoint every few seconds. In the full product, this path becomes a fetch to your backend or farm device gateway.
          </p>
          <button
            className="mt-5 w-full rounded-lg border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200/45 hover:bg-emerald-400/15"
            onClick={startLiveFeedDemo}
            type="button"
          >
            Start live feed demo
          </button>
          <div className="mt-5">
            <MetricRow label="Polling Interval" value="3 seconds" tone="text-cyan-200" />
            <MetricRow label="Production Swap" value="/api/telemetry/latest" />
            <MetricRow label="Normalizer" value="Shared scoring pipeline" />
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Scoring</p>
          <h3 className="mt-1 text-xl font-bold">Transparent Risk Score</h3>
          <div className="mt-5 space-y-3 text-sm text-slate-300">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              Temperature above 39.1 C or below 37.6 C reduces the score.
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              Heart rate above 82 bpm or below 48 bpm is treated as abnormal.
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              Activity below 45 and rumination below 320 minutes reduce welfare.
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              Optional x/y columns place animals on the map; isolation and low movement can also trigger alerts.
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Simulation</p>
          <h3 className="mt-1 text-xl font-bold">Presentation Controls</h3>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm text-slate-300">Telemetry Refresh</span>
              <input className="mt-3 w-full accent-emerald-400" defaultValue={55} max={100} min={10} type="range" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-300">Alert Sensitivity</span>
              <input className="mt-3 w-full accent-amber-400" defaultValue={70} max={100} min={10} type="range" />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
              <span className="text-sm text-slate-300">Risk heat zones</span>
              <input className="accent-emerald-400" defaultChecked type="checkbox" />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
              <span className="text-sm text-slate-300">Clinical hover cards</span>
              <input className="accent-emerald-400" defaultChecked type="checkbox" />
            </label>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Platform</p>
          <h3 className="mt-1 text-xl font-bold">Demo Configuration</h3>
          <div className="mt-5">
            <MetricRow
              label="Mode"
              value={dataSource.mode === "farmer_csv" ? "Farmer CSV data" : dataSource.mode === "live_feed" ? "Live telemetry feed" : "Frontend simulation"}
              tone="text-cyan-200"
            />
            <MetricRow label="Animal Count" value={String(animals.length)} />
            <MetricRow label="Scoring Inputs" value="Temp, HR, activity, rumination" tone="text-amber-200" />
            <MetricRow label="Decision Support" value="Explainable prototype" tone="text-amber-200" />
          </div>
          <p className="mt-5 rounded-lg border border-cyan-300/15 bg-cyan-300/5 p-4 text-sm leading-6 text-slate-300">
            This prototype ranks animals for human review. It does not diagnose disease or replace veterinary judgement.
          </p>
        </GlassPanel>
      </div>
    </section>
  );

  const viewContent: Record<View, ReactNode> = {
    overview: overviewContent,
    monitoring: monitoringContent,
    camera: cameraContent,
    analytics: analyticsContent,
    alerts: alertsContent,
    settings: settingsContent,
  };

  return (
    <div className="relative h-screen overflow-hidden bg-[#050910] text-white">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_22%_18%,rgba(34,197,94,0.16),transparent_28%),radial-gradient(circle_at_76%_8%,rgba(14,165,233,0.14),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.7),rgba(2,6,23,0.94))]" />

      <div className="relative z-10 flex h-screen min-h-0">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar animals={animals} dataSourceLabel={dataSource.label} title={viewTitles[activeView]} />

          {viewContent[activeView]}
        </main>
      </div>

    </div>
  );
}
