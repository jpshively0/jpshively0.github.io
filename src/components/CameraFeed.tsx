import { useEffect, useRef, useState } from "react";

import type { Animal } from "../App";

interface Props {
  animals: Animal[];
}

interface Detection {
  confidence: number;
  height: number;
  label: string;
  tone: "emerald" | "amber" | "cyan";
  width: number;
  x: number;
  y: number;
}

const initialDetections: Detection[] = [
  {
    label: "Grazing cluster",
    confidence: 94,
    height: 28,
    tone: "emerald",
    width: 34,
    x: 14,
    y: 42,
  },
  {
    label: "Low movement watch",
    confidence: 81,
    height: 30,
    tone: "amber",
    width: 24,
    x: 57,
    y: 36,
  },
  {
    label: "Animal track",
    confidence: 88,
    height: 24,
    tone: "cyan",
    width: 20,
    x: 38,
    y: 58,
  },
];

const toneClasses = {
  amber: {
    border: "border-amber-300/85",
    chip: "border-amber-300/25 bg-amber-300/15 text-amber-100",
    glow: "shadow-[0_0_26px_rgba(251,191,36,0.18)]",
    marker: "bg-amber-300",
  },
  cyan: {
    border: "border-cyan-300/80",
    chip: "border-cyan-300/25 bg-cyan-300/15 text-cyan-100",
    glow: "shadow-[0_0_26px_rgba(34,211,238,0.18)]",
    marker: "bg-cyan-300",
  },
  emerald: {
    border: "border-emerald-300/80",
    chip: "border-emerald-300/25 bg-emerald-300/15 text-emerald-100",
    glow: "shadow-[0_0_26px_rgba(52,211,153,0.18)]",
    marker: "bg-emerald-300",
  },
};

export default function CameraFeed({ animals }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previousFrameRef = useRef<Uint8ClampedArray | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [detections, setDetections] = useState<Detection[]>(initialDetections);
  const [motionScore, setMotionScore] = useState(0);
  const warningCount = animals.filter(animal => animal.status === "warning").length;
  const criticalCount = animals.filter(animal => animal.status === "critical").length;
  const cameraRisk = criticalCount > 0 || motionScore < 9 ? "Escalate" : warningCount > 0 || motionScore < 18 ? "Watch" : "Nominal";
  const behaviorEvents = warningCount + criticalCount;
  const visualTrackCount = detections.length;
  const riskTone = cameraRisk === "Escalate" ? "text-red-100" : cameraRisk === "Watch" ? "text-amber-100" : "text-emerald-100";
  const healthTrend = Math.max(42, Math.min(96, 96 - behaviorEvents * 8 - (motionScore < 9 ? 18 : 0)));
  const motionBars = [0.42, 0.68, 0.54, 0.82, 0.61, 0.76, 0.47, 0.88, 0.58, 0.72, 0.5, 0.79].map((factor, index) =>
    Math.max(12, Math.round(motionScore * factor + 12 + (index % 3) * 5)),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) {
      return;
    }

    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      return;
    }

    const analyzeFrame = () => {
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return;
      }

      const width = canvas.width;
      const height = canvas.height;
      context.drawImage(video, 0, 0, width, height);

      const frame = context.getImageData(0, 0, width, height).data;
      const previous = previousFrameRef.current;

      if (!previous) {
        previousFrameRef.current = new Uint8ClampedArray(frame);
        return;
      }

      const cols = 4;
      const rows = 3;
      const cellScores = Array.from({ length: cols * rows }, (_, index) => ({
        index,
        motion: 0,
        samples: 0,
      }));
      let totalMotion = 0;
      let totalSamples = 0;

      for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
          const pixelIndex = (y * width + x) * 4;
          const currentLuma = frame[pixelIndex] * 0.299 + frame[pixelIndex + 1] * 0.587 + frame[pixelIndex + 2] * 0.114;
          const previousLuma = previous[pixelIndex] * 0.299 + previous[pixelIndex + 1] * 0.587 + previous[pixelIndex + 2] * 0.114;
          const diff = Math.abs(currentLuma - previousLuma);
          const col = Math.min(cols - 1, Math.floor((x / width) * cols));
          const row = Math.min(rows - 1, Math.floor((y / height) * rows));
          const cell = cellScores[row * cols + col];

          cell.motion += diff;
          cell.samples += 1;
          totalMotion += diff;
          totalSamples += 1;
        }
      }

      const rankedCells = cellScores
        .map(cell => ({
          ...cell,
          motion: cell.samples > 0 ? cell.motion / cell.samples : 0,
        }))
        .sort((a, b) => b.motion - a.motion)
        .slice(0, 3);

      const nextMotionScore = Math.round(Math.min(100, (totalMotion / Math.max(1, totalSamples)) * 3.4));
      const labels = nextMotionScore < 9
        ? ["Low movement watch", "Standing cluster", "Sparse track"]
        : nextMotionScore < 18
        ? ["Grazing cluster", "Movement watch", "Animal track"]
        : ["Active movement", "Grazing cluster", "Track continuity"];

      setMotionScore(nextMotionScore);
      setDetections(rankedCells.map((cell, index) => {
        const col = cell.index % cols;
        const row = Math.floor(cell.index / cols);

        return {
          confidence: Math.round(Math.min(97, 62 + cell.motion * 2.4 + index * 4)),
          height: 24 + Math.min(10, cell.motion * 0.45),
          label: labels[index],
          tone: index === 0 ? "emerald" : index === 1 ? "amber" : "cyan",
          width: 22 + Math.min(12, cell.motion * 0.4),
          x: col * 25 + 3,
          y: row * 33 + 6,
        };
      }));
      previousFrameRef.current = new Uint8ClampedArray(frame);
    };

    const interval = window.setInterval(analyzeFrame, 650);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="relative min-h-[420px] overflow-hidden rounded-lg border border-cyan-200/10 bg-slate-950 shadow-2xl shadow-black/35">
        <video
          autoPlay
          className="h-full w-full object-cover"
          loop
          muted
          playsInline
          ref={videoRef}
          src="/cattle.mp4"
        />
        <canvas className="hidden" height={54} ref={canvasRef} width={96} />

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/62 via-transparent to-black/42" />
        <div className="pointer-events-none absolute left-0 right-0 top-[34%] h-px bg-white/35 shadow-[0_0_16px_rgba(255,255,255,0.55)]" />

        <div className="absolute left-5 top-5 max-w-[min(420px,calc(100%-2.5rem))] rounded-lg border border-white/10 bg-slate-950/72 p-4 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
              Camera Motion
            </span>
            <span className={`rounded border border-white/10 bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${riskTone}`}>
              {cameraRisk}
            </span>
          </div>
          <h3 className="mt-3 text-2xl font-bold leading-none">Pasture Camera 03</h3>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-slate-500">Tracks</p>
              <p className="mt-1 font-semibold text-emerald-100">{visualTrackCount} regions</p>
            </div>
            <div>
              <p className="text-slate-500">Motion</p>
              <p className="mt-1 font-semibold text-cyan-100">{motionScore}%</p>
            </div>
            <div>
              <p className="text-slate-500">Welfare</p>
              <p className="mt-1 font-semibold text-amber-100">{healthTrend}%</p>
            </div>
          </div>
        </div>

        <div className="absolute right-5 top-5 w-[190px] rounded-lg border border-white/10 bg-slate-950/72 p-3 text-xs backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Edge CV</span>
            <span className="font-semibold text-cyan-100">30 FPS</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.85)]" />
            Stream online
          </div>
          <div className="mt-3 flex h-12 items-end gap-1 border-t border-white/10 pt-3" aria-hidden="true">
            {motionBars.map((bar, index) => (
              <span
                className="flex-1 rounded-t bg-cyan-200/70"
                key={`${bar}-${index}`}
                style={{ height: `${bar}%` }}
              />
            ))}
          </div>
        </div>

        <div className="absolute bottom-5 left-5 right-5 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1.3fr]">
          <div className="rounded-lg border border-emerald-300/15 bg-slate-950/72 p-3 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Visual tracks</span>
              <span className="text-emerald-200">camera</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-100">{visualTrackCount}</p>
          </div>
          <div className="rounded-lg border border-amber-300/15 bg-slate-950/72 p-3 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Behavior events</span>
              <span className="text-amber-200">queue</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-100">{behaviorEvents}</p>
          </div>
          <div className="rounded-lg border border-cyan-300/15 bg-slate-950/72 p-3 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Camera risk</span>
              <span className={riskTone}>model</span>
            </div>
            <p className={`mt-2 text-2xl font-bold ${riskTone}`}>{cameraRisk}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-slate-950/72 p-3 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Detection confidence</span>
              <span className="font-semibold text-cyan-100">{Math.round(detections.reduce((sum, detection) => sum + detection.confidence, 0) / detections.length)}%</span>
            </div>
            <div className="mt-3 space-y-2">
              {detections.map(detection => (
                <div className="flex items-center gap-2" key={`metric-${detection.label}`}>
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneClasses[detection.tone].marker}`} />
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${toneClasses[detection.tone].marker}`}
                      style={{ width: `${detection.confidence}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.055] shadow-2xl shadow-black/20 backdrop-blur-2xl">
        <div className="shrink-0 border-b border-white/10 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
            Vision Events
          </p>
          <h3 className="mt-1 text-xl font-bold">Behavior Queue</h3>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-4">
            <p className="font-semibold text-emerald-100">{motionScore > 18 ? "Active movement detected" : "Grazing cluster stable"}</p>
            <p className="mt-1 text-sm text-slate-300">Frame differencing is tracking motion directly from the cattle video.</p>
          </div>
          <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-4">
            <p className="font-semibold text-amber-100">{motionScore < 9 ? "Low movement watch" : "Motion baseline normal"}</p>
            <p className="mt-1 text-sm text-slate-300">The demo estimates behavior from changing pixels, then cross-checks with herd telemetry.</p>
          </div>
          <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-4">
            <p className="font-semibold text-cyan-100">Track continuity</p>
            <p className="mt-1 text-sm text-slate-300">Camera events feed the same telemetry normalizer as sensors.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
