export function download(name: string, content: string | Blob, type = "application/json") {
  const blob = typeof content === "string" ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]!);
  const esc = (v: unknown) => { const s = typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

/** Renders the first chart SVG inside `el` to a 2x PNG on the page background. */
export async function exportChartPng(el: HTMLElement | null, name: string) {
  const svg = el?.querySelector("svg.recharts-surface") ?? el?.querySelector("svg");
  if (!svg) return;
  const { width, height } = svg.getBoundingClientRect();
  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width)); clone.setAttribute("height", String(height));
  // Inline computed colors so CSS variables survive serialisation.
  const src = svg.querySelectorAll("*"); const dst = clone.querySelectorAll("*");
  src.forEach((n, i) => { const cs = getComputedStyle(n); const d = dst[i] as SVGElement; for (const p of ["fill", "stroke", "font-size", "font-family", "opacity", "fill-opacity", "stroke-width"]) d.style.setProperty(p, cs.getPropertyValue(p)); });
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
  await img.decode();
  const c = document.createElement("canvas"); c.width = width * 2; c.height = height * 2;
  const ctx = c.getContext("2d")!; ctx.scale(2, 2);
  ctx.fillStyle = getComputedStyle(document.body).backgroundColor; ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  c.toBlob((b) => b && download(name, b));
}
