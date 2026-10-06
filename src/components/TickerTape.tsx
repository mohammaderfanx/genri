import { useEffect, useState } from "react";
import { models, isImage } from "@/lib/models";

const tracked = models.filter((m) => !isImage(m)).slice(0, 8);
const init = () => tracked.map((m) => ({ slug: m.slug, name: m.name, tps: m.metrics.tps, ttft: m.metrics.ttft, spark: Array.from({ length: 12 }, () => m.metrics.tps) }));

function Spark({ pts }: { pts: number[] }) {
  const min = Math.min(...pts), max = Math.max(...pts), r = max - min || 1;
  const d = pts.map((p, i) => `${(i / (pts.length - 1)) * 40},${12 - ((p - min) / r) * 12}`).join(" ");
  return <svg width="40" height="12" className="text-speed"><polyline points={d} fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>;
}

export function TickerTape() {
  const [rows, setRows] = useState(init);
  useEffect(() => {
    const id = setInterval(() => {
      setRows((rs) => rs.map((r) => {
        const base = tracked.find((m) => m.slug === r.slug)!.metrics;
        const tps = Math.round(base.tps * (0.85 + Math.random() * 0.3));
        return { ...r, tps, ttft: Math.round(base.ttft * (0.85 + Math.random() * 0.3)), spark: [...r.spark.slice(1), tps] };
      }));
    }, 2000);
    return () => clearInterval(id);
  }, []);
  const loop = [...rows, ...rows];
  return (
    <div className="overflow-hidden border-b bg-panel">
      <div className="ticker flex w-max gap-8 py-1.5 font-mono text-[11px] tabular">
        {loop.map((r, i) => (
          <span key={i} className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-muted-foreground">{r.name}</span>
            <span className="text-speed">{r.tps} TPS</span>
            <span>{r.ttft}ms</span>
            <Spark pts={r.spark} />
          </span>
        ))}
      </div>
    </div>
  );
}
