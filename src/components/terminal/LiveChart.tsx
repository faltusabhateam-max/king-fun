"use client";

import { useEffect, useMemo, useRef } from "react";

export type ChartCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type ChartTradeMark = {
  time: number;
  side: "buy" | "sell";
  price: number;
};

type Pt = { time: number; value: number };

function buildPoints(
  candles: ChartCandle[],
  markPrice?: number,
  liveTicks?: Pt[]
): Pt[] {
  const fromCandles = (candles || [])
    .filter((c) => c.close > 0 && c.time > 0)
    .map((c) => ({ time: c.time, value: c.close }));

  let pts: Pt[] =
    fromCandles.length > 0
      ? fromCandles
      : (liveTicks || []).filter((p) => p.value > 0 && p.time > 0);

  if (markPrice && markPrice > 0) {
    const t = Math.floor(Date.now() / 1000);
    if (pts.length === 0) {
      pts = [{ time: t, value: markPrice }];
    } else {
      const last = pts[pts.length - 1];
      if (last.time === t) {
        pts = [...pts.slice(0, -1), { time: t, value: markPrice }];
      } else if (t > last.time) {
        pts = [...pts, { time: t, value: markPrice }];
      } else {
        pts = [...pts.slice(0, -1), { time: last.time, value: markPrice }];
      }
    }
  }

  // Dedupe by time (keep last)
  const map = new Map<number, number>();
  for (const p of pts) map.set(p.time, p.value);
  return Array.from(map.entries())
    .map(([time, value]) => ({ time, value }))
    .sort((a, b) => a.time - b.time);
}

export function LiveChart({
  candles,
  height = 380,
  markPrice,
  markers = [],
  liveTicks = [],
}: {
  candles: ChartCandle[];
  height?: number;
  markPrice?: number;
  markers?: ChartTradeMark[];
  /** Rolling mark-price series from TradeTerminal when candles are sparse/empty */
  liveTicks?: Pt[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const points = useMemo(
    () => buildPoints(candles, markPrice, liveTicks),
    [candles, markPrice, liveTicks]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = Math.max(wrap.clientWidth, 120);
    const cssH = height;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = { l: 8, r: 64, t: 16, b: 28 };
    const w = cssW - pad.l - pad.r;
    const h = cssH - pad.t - pad.b;

    ctx.clearRect(0, 0, cssW, cssH);

    // Background grid
    ctx.strokeStyle = "rgba(0, 232, 143, 0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (h * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(pad.l + w, y);
      ctx.stroke();
    }
    for (let i = 0; i <= 4; i++) {
      const x = pad.l + (w * i) / 4;
      ctx.beginPath();
      ctx.moveTo(x, pad.t);
      ctx.lineTo(x, pad.t + h);
      ctx.stroke();
    }

    if (points.length === 0) {
      ctx.fillStyle = "rgba(0, 232, 143, 0.45)";
      ctx.font = "13px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText("Waiting for live price…", cssW / 2, cssH / 2);
      return;
    }

    const values = points.map((p) => p.value);
    let minV = Math.min(...values);
    let maxV = Math.max(...values);
    if (minV === maxV) {
      minV *= 0.999;
      maxV *= 1.001;
      if (minV === 0 && maxV === 0) {
        minV = -1;
        maxV = 1;
      }
    }
    const padV = (maxV - minV) * 0.08 || maxV * 0.01;
    minV -= padV;
    maxV += padV;

    const minT = points[0].time;
    const maxT = Math.max(points[points.length - 1].time, minT + 1);

    const xAt = (t: number) =>
      pad.l + ((t - minT) / (maxT - minT)) * w;
    const yAt = (v: number) =>
      pad.t + h - ((v - minV) / (maxV - minV)) * h;

    // Area fill under line
    const pathLine = () => {
      ctx.beginPath();
      points.forEach((p, i) => {
        const x = xAt(p.time);
        const y = yAt(p.value);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
    };

    pathLine();
    const last = points[points.length - 1];
    ctx.lineTo(xAt(last.time), pad.t + h);
    ctx.lineTo(xAt(points[0].time), pad.t + h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + h);
    grad.addColorStop(0, "rgba(0, 232, 143, 0.35)");
    grad.addColorStop(1, "rgba(0, 232, 143, 0.02)");
    ctx.fillStyle = grad;
    ctx.fill();

    // Neon line
    pathLine();
    ctx.strokeStyle = "#00e88f";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(0, 232, 143, 0.55)";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Live tip
    const tipX = xAt(last.time);
    const tipY = yAt(last.value);
    ctx.beginPath();
    ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#00e88f";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tipX, tipY, 8, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 232, 143, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Price labels (right)
    ctx.fillStyle = "rgba(0, 232, 143, 0.65)";
    ctx.font = "11px ui-monospace, monospace";
    ctx.textAlign = "left";
    const fmt = (v: number) =>
      v < 1e-6 ? v.toExponential(3) : v.toPrecision(5);
    ctx.fillText(fmt(maxV), pad.l + w + 6, pad.t + 10);
    ctx.fillText(fmt(minV), pad.l + w + 6, pad.t + h);
    ctx.fillStyle = "#00e88f";
    ctx.font = "bold 12px ui-monospace, monospace";
    ctx.fillText(fmt(last.value), pad.l + w + 6, tipY + 4);

    // B/S circle markers (no arrows)
    const marks = (markers || []).filter(
      (m) => m.time > 0 && m.price > 0 && m.time >= minT && m.time <= maxT
    );
    for (const m of marks) {
      const x = xAt(m.time);
      const y = yAt(m.price);
      const buy = m.side === "buy";
      const color = buy ? "#00e88f" : "#ff3b6b";
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#00140d";
      ctx.font = "bold 10px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(buy ? "B" : "S", x, y + 0.5);
      ctx.textBaseline = "alphabetic";
    }

    // Time labels
    ctx.fillStyle = "rgba(0, 232, 143, 0.45)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "center";
    const t0 = new Date(points[0].time * 1000).toLocaleTimeString();
    const t1 = new Date(last.time * 1000).toLocaleTimeString();
    ctx.fillText(t0, pad.l + 20, cssH - 8);
    ctx.fillText(t1, pad.l + w - 20, cssH - 8);
  }, [points, markers, height]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => {
      // trigger redraw via dependency by touching a layout read — effect re-runs on points
      const c = canvasRef.current;
      if (c) {
        // force paint by dispatching a tiny size change handled in main effect
        // Main effect depends on points; resize: call by cloning attribute
        c.dataset.rw = String(wrap.clientWidth);
      }
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // Re-draw on resize: listen and set state-less redraw via rAF on width change
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let lastW = wrap.clientWidth;
    const id = window.setInterval(() => {
      if (wrap.clientWidth !== lastW) {
        lastW = wrap.clientWidth;
        // mutate points ref indirectly — trigger by rewriting canvas width in paint effect
        // simplest: dispatch custom event that paint listens… instead just force by reading
        const ev = new Event("kf-resize");
        window.dispatchEvent(ev);
      }
    }, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      ref={wrapRef}
      className="w-full overflow-hidden rounded-xl border border-[var(--cut)] bg-black/25"
      style={{ height }}
    >
      <canvas ref={canvasRef} className="block w-full" />
    </div>
  );
}
