import { useRef, useState } from "react";

import type { Animal } from "../App";

interface Props {
  animals: Animal[];
}

function getMedicalHistory(animal: Animal) {
  const isCompromised = animal.id === 5 || animal.id === 17 || animal.id === 29;
  const hasFarmerTelemetry = animal.dataSource === "farmer_csv";
  const lastExamDay = (animal.id % 8) + 1;
  const vaccineMonth = ((animal.id * 3) % 12) + 1;

  return {
    tag: `HS-${String(animal.id).padStart(4, "0")}`,
    age: `${2 + (animal.id % 5)}.${animal.id % 10} yrs`,
    breed: animal.id % 3 === 0 ? "Holstein Friesian" : animal.id % 3 === 1 ? "Angus Cross" : "Jersey Cross",
    lastExam: animal.lastReading ?? `2026-05-${String(lastExamDay).padStart(2, "0")}`,
    vaccination: `2026-${String(vaccineMonth).padStart(2, "0")}-14`,
    priorEvents: hasFarmerTelemetry
      ? [
          animal.temperature !== undefined ? `Temperature ${animal.temperature.toFixed(1)} C` : "Temperature not supplied",
          animal.activityLevel !== undefined ? `Activity level ${animal.activityLevel.toFixed(0)}` : "Activity not supplied",
          animal.ruminationMinutes !== undefined ? `Rumination ${animal.ruminationMinutes.toFixed(0)} min` : "Rumination not supplied",
        ]
      : isCompromised
      ? [
          "Reduced grazing activity detected",
          "Elevated stress markers",
          "Recovery observation requested",
        ]
      : [
          "Routine wellness check clear",
          "Normal rumination cycle",
          "No active treatment plan",
        ],
    recommendation:
      animal.status === "critical"
        ? "Immediate visual inspection and isolation review."
        : animal.status === "warning"
        ? "Monitor hydration, movement, and herd proximity."
        : "Continue standard telemetry monitoring.",
  };
}

export default function HerdMap({ animals }: Props) {
  const closeTimerRef = useRef<number | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const selectedHistory = selectedAnimal ? getMedicalHistory(selectedAnimal) : null;
  const healthyCount = animals.filter(animal => animal.status === "healthy").length;
  const warningCount = animals.filter(animal => animal.status === "warning").length;
  const criticalCount = animals.filter(animal => animal.status === "critical").length;
  const herdCenter = animals.length
    ? animals.reduce(
        (center, animal) => ({
          x: center.x + animal.x / animals.length,
          y: center.y + animal.y / animals.length,
        }),
        { x: 0, y: 0 },
      )
    : { x: 50, y: 50 };

  function clearCloseTimer() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openAnimalCard(animal: Animal) {
    clearCloseTimer();
    setSelectedAnimal(animal);
  }

  function scheduleAnimalCardClose() {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setSelectedAnimal(null);
      closeTimerRef.current = null;
    }, 350);
  }

  return (
    <div className="relative h-full min-h-[360px] overflow-hidden rounded-lg border border-cyan-200/10 bg-[#07111d]/90 shadow-2xl shadow-black/35 backdrop-blur-2xl xl:min-h-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_50%,rgba(20,184,166,0.13),transparent_28%),radial-gradient(circle_at_77%_24%,rgba(239,68,68,0.10),transparent_22%),radial-gradient(circle_at_22%_78%,rgba(34,197,94,0.10),transparent_24%),linear-gradient(135deg,rgba(7,17,29,0.92),rgba(5,11,20,0.96))]" />
      <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(148,163,184,0.075)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.075)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(34,197,94,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.08)_1px,transparent_1px)] [background-size:176px_176px]" />

      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-70" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path d="M8 20 C24 12, 33 21, 47 16 S74 10, 91 19" fill="none" stroke="rgba(125,211,252,0.22)" strokeDasharray="1.6 2.6" strokeWidth="0.28" />
        <path d="M11 72 C25 63, 37 76, 51 68 S77 63, 90 75" fill="none" stroke="rgba(52,211,153,0.18)" strokeDasharray="1.8 2.8" strokeWidth="0.35" />
        <path d="M20 7 L14 92 L86 88 L92 13 Z" fill="rgba(15,23,42,0.08)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.35" />
        <path d="M60 13 L86 16 L81 42 L62 39 Z" fill="rgba(245,158,11,0.055)" stroke="rgba(245,158,11,0.13)" strokeDasharray="1 1.8" strokeWidth="0.25" />
        <path d="M12 57 L35 52 L42 86 L15 91 Z" fill="rgba(34,197,94,0.045)" stroke="rgba(34,197,94,0.12)" strokeDasharray="1 1.8" strokeWidth="0.25" />
      </svg>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-cyan-300/8 to-transparent" />
      <div className="pointer-events-none absolute -left-1/3 top-1/2 h-24 w-2/3 -translate-y-1/2 rotate-12 animate-pulse bg-gradient-to-r from-transparent via-cyan-200/10 to-transparent blur-xl" />

      <div className="absolute left-5 top-5 z-10">
        <p className="text-xs uppercase tracking-[0.26em] text-slate-400">
          Live Herd Map
        </p>
        <h3 className="mt-1 text-xl font-semibold">
          Pasture Sector A-12
        </h3>
      </div>

      <div className="absolute right-5 top-5 z-10 rounded-lg border border-white/10 bg-slate-950/60 p-3 text-xs shadow-xl shadow-black/20 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-6 border-b border-white/10 pb-2">
          <span className="text-slate-400">Signal</span>
          <span className="font-semibold text-cyan-200">99.2%</span>
        </div>
        <div className="flex items-center justify-between gap-6 pt-2">
          <span className="text-slate-400">Sector Risk</span>
          <span className={criticalCount > 0 ? "font-semibold text-red-200" : warningCount > 0 ? "font-semibold text-amber-200" : "font-semibold text-emerald-200"}>
            {criticalCount > 0 ? "Elevated" : warningCount > 0 ? "Watch" : "Nominal"}
          </span>
        </div>
      </div>

      <div className="absolute left-5 top-24 z-10 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg border border-emerald-400/15 bg-emerald-400/10 px-3 py-2">
          <p className="text-slate-400">Healthy</p>
          <p className="mt-1 text-lg font-bold text-emerald-200">{healthyCount}</p>
        </div>
        <div className="rounded-lg border border-amber-400/15 bg-amber-400/10 px-3 py-2">
          <p className="text-slate-400">Warning</p>
          <p className="mt-1 text-lg font-bold text-amber-200">{warningCount}</p>
        </div>
        <div className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2">
          <p className="text-slate-400">Critical</p>
          <p className="mt-1 text-lg font-bold text-red-200">{criticalCount}</p>
        </div>
      </div>

      <div className="absolute bottom-5 left-5 z-10 flex flex-wrap gap-2 text-xs text-slate-300">
        <span className="rounded-full border border-emerald-400/20 bg-slate-950/55 px-3 py-1 backdrop-blur-xl"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400" />Healthy</span>
        <span className="rounded-full border border-amber-400/20 bg-slate-950/55 px-3 py-1 backdrop-blur-xl"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-amber-400" />Warning</span>
        <span className="rounded-full border border-red-400/25 bg-slate-950/55 px-3 py-1 backdrop-blur-xl"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-red-400" />Critical</span>
      </div>

      <div
        className="absolute z-10 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/20 bg-emerald-300/5 shadow-[0_0_42px_rgba(52,211,153,0.10)]"
        style={{
          left: `${herdCenter.x}%`,
          top: `${herdCenter.y}%`,
        }}
      >
        <div className="absolute inset-3 rounded-full border border-emerald-300/15" />
      </div>

      {animals.map(animal => (
        <div
          key={`heat-${animal.id}`}
          className="absolute -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full blur-md"
          style={{
            left: `${animal.x}%`,
            top: `${animal.y}%`,
            opacity: animal.status === "healthy" ? 0 : animal.status === "critical" ? 0.34 : 0.2,
            width: `${46 + (100 - animal.health) * 0.62}px`,
            height: `${46 + (100 - animal.health) * 0.62}px`,
            background:
              animal.status === "critical"
                ? "rgba(239,68,68,0.55)"
                : "rgba(245,158,11,0.42)",
          }}
        />
      ))}

      {animals.map(animal => (
        <div
          key={animal.id}
          className={`group absolute z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/55 shadow-lg transition-all duration-200 hover:z-30 hover:scale-150 ${
            animal.status === "critical" ? "animate-pulse" : ""
          }`}
          onMouseEnter={() => openAnimalCard(animal)}
          onMouseLeave={scheduleAnimalCardClose}
          style={{
            left: `${animal.x}%`,
            top: `${animal.y}%`,
            background:
              animal.status === "healthy"
                ? "#22c55e"
                : animal.status === "warning"
                ? "#f59e0b"
                : "#ef4444",
            boxShadow:
              animal.status === "healthy"
                ? "0 0 0 5px rgba(34,197,94,0.12), 0 0 14px rgba(34,197,94,0.55), inset 0 0 8px rgba(255,255,255,0.24)"
                : animal.status === "warning"
                ? "0 0 0 5px rgba(245,158,11,0.16), 0 0 18px rgba(245,158,11,0.7), inset 0 0 8px rgba(255,255,255,0.24)"
                : "0 0 0 5px rgba(239,68,68,0.20), 0 0 24px rgba(239,68,68,0.9), inset 0 0 8px rgba(255,255,255,0.26)",
          }}
          title={`Animal ${animal.id} health ${animal.health.toFixed(0)}%`}
        >
          <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
        </div>
      ))}

      {selectedAnimal && selectedHistory && (
        <div
          className="absolute z-30 max-h-[min(420px,calc(100%-32px))] w-80 overflow-y-auto rounded-lg border border-white/15 bg-slate-950/95 p-4 text-sm shadow-2xl shadow-black/40 backdrop-blur-2xl"
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleAnimalCardClose}
          style={{
            left: selectedAnimal.x > 68 ? "auto" : `calc(${selectedAnimal.x}% + 10px)`,
            right: selectedAnimal.x > 68 ? `calc(${100 - selectedAnimal.x}% + 10px)` : "auto",
            top: selectedAnimal.y > 58 ? "auto" : `calc(${selectedAnimal.y}% + 10px)`,
            bottom: selectedAnimal.y > 58 ? `calc(${100 - selectedAnimal.y}% + 10px)` : "auto",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                Medical History
              </p>
              <h4 className="mt-1 text-lg font-bold text-white">
                Animal {selectedAnimal.id}
              </h4>
            </div>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                selectedAnimal.status === "critical"
                  ? "bg-red-400/15 text-red-200"
                  : selectedAnimal.status === "warning"
                  ? "bg-amber-400/15 text-amber-200"
                  : "bg-emerald-400/15 text-emerald-200"
              }`}
            >
              {selectedAnimal.status}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-slate-500">Tag</p>
              <p className="mt-1 font-medium text-slate-100">{selectedHistory.tag}</p>
            </div>
            <div>
              <p className="text-slate-500">Health</p>
              <p className="mt-1 font-medium text-slate-100">{selectedAnimal.health.toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-slate-500">Age</p>
              <p className="mt-1 font-medium text-slate-100">{selectedHistory.age}</p>
            </div>
            <div>
              <p className="text-slate-500">Breed</p>
              <p className="mt-1 font-medium text-slate-100">{selectedHistory.breed}</p>
            </div>
            <div>
              <p className="text-slate-500">Last Exam</p>
              <p className="mt-1 font-medium text-slate-100">{selectedHistory.lastExam}</p>
            </div>
            <div>
              <p className="text-slate-500">Vaccination</p>
              <p className="mt-1 font-medium text-slate-100">{selectedHistory.vaccination}</p>
            </div>
          </div>

          {selectedAnimal.dataSource !== "simulation" && (
            <div className="mt-4 rounded-lg border border-emerald-300/15 bg-emerald-300/5 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Telemetry
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-500">Temperature</p>
                  <p className="mt-1 font-medium text-slate-100">
                    {selectedAnimal.temperature !== undefined ? `${selectedAnimal.temperature.toFixed(1)} C` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Heart Rate</p>
                  <p className="mt-1 font-medium text-slate-100">
                    {selectedAnimal.heartRate !== undefined ? `${selectedAnimal.heartRate.toFixed(0)} bpm` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Activity</p>
                  <p className="mt-1 font-medium text-slate-100">
                    {selectedAnimal.activityLevel !== undefined ? selectedAnimal.activityLevel.toFixed(0) : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Rumination</p>
                  <p className="mt-1 font-medium text-slate-100">
                    {selectedAnimal.ruminationMinutes !== undefined ? `${selectedAnimal.ruminationMinutes.toFixed(0)} min` : "N/A"}
                  </p>
                </div>
              </div>
              {selectedAnimal.vetNotes && (
                <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-5 text-slate-300">
                  {selectedAnimal.vetNotes}
                </p>
              )}
            </div>
          )}

          {selectedAnimal.scoreFactors && selectedAnimal.scoreFactors.length > 0 && (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Score Breakdown
              </p>
              <div className="mt-3 space-y-2">
                {selectedAnimal.scoreFactors.map(factor => (
                  <div className="flex items-center justify-between gap-3 text-xs" key={factor.label}>
                    <div>
                      <p className="font-medium text-slate-200">{factor.label}</p>
                      <p className="mt-0.5 text-slate-500">{factor.value}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 font-semibold ${
                        factor.status === "critical"
                          ? "bg-red-400/15 text-red-200"
                          : factor.status === "warning"
                          ? "bg-amber-400/15 text-amber-200"
                          : "bg-emerald-400/15 text-emerald-200"
                      }`}
                    >
                      {factor.impact > 0 ? `-${factor.impact}` : "OK"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 border-t border-white/10 pt-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Clinical Timeline
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
              {selectedHistory.priorEvents.map(event => (
                <li className="flex gap-2" key={event}>
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                  {event}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3 rounded-lg border border-cyan-300/15 bg-cyan-300/5 p-3 text-xs text-cyan-100">
            {selectedHistory.recommendation}
          </div>
        </div>
      )}

    </div>
  );
}
