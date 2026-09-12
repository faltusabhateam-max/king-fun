"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

export type LiveTick = { time: number; value: number };

function buildPoints(
  candles: ChartCandle[],
  markPrice: number | undefined,
  liveTicks: LiveTick[]
): LiveTick[] {
  const fromCandles = (candles || [])
    .filter((c) => c.close > 0 && c.time > 0)
    .map((c) => ({ time: c.time, value: c.close }));

  let pts: LiveTick[] =
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
  liveTicks?: LiveTick[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  const points = useMemo(
    () => buildPoints(candles, markPrice, liveTicks),
    [candles, markPrice, liveTicks]
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => setWidth(wrap.clientWidth || 0);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = Math.max(width || wrap.clientWidth, 120);
    const cssH = height;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = { l: 8, r: 68, t: 16, b: 28 };
    const plotW = cssW - pad.l - pad.r;
    const plotH = cssH - pad.t - pad.b;

    ctx.clearRect(0, 0, cssW, cssH);

    ctx.strokeStyle = "rgba(0, 232, 143, 0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(pad.l + plotW, y);
      ctx.stroke();
      const x = pad.l + (plotW * i) / 4;
      ctx.beginPath();
      ctx.moveTo(x, pad.t);
      ctx.lineTo(x, pad.t + plotH);
      ctx.stroke();
    }

    if (points.length === 0) {
      ctx.fillStyle = "rgba(0, 232, 143, 0.5)";
      ctx.font = "13px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText("Waiting for live price…", cssW / 2, cssH / 2);
      return;
    }

    const values = points.map((p) => p.value);
    let minV = Math.min(...values);
    let maxV = Math.max(...values);
    if (!(maxV > minV)) {
      const mid = minV || 1;
      minV = mid * 0.999;
      maxV = mid * 1.001;
    }
    const padV = (maxV - minV) * 0.08;
    minV -= padV;
    maxV += padV;

    const minT = points[0].time;
    const maxT = Math.max(points[points.length - 1].time, minT + 1);

    const xAt = (t: number) => pad.l + ((t - minT) / (maxT - minT)) * plotW;
    const yAt = (v: number) =>
      pad.t + plotH - ((v - minV) / (maxV - minV)) * plotH;

    const strokeLine = () => {
      ctx.beginPath();
      points.forEach((p, i) => {
        const x = xAt(p.time);
        const y = yAt(p.value);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
    };

    // Area
    strokeLine();
    const last = points[points.length - 1];
    ctx.lineTo(xAt(last.time), pad.t + plotH);
    ctx.lineTo(xAt(points[0].time), pad.t + plotH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + plotH);
    grad.addColorStop(0, "rgba(0, 232, 143, 0.35)");
    grad.addColorStop(1, "rgba(0, 232, 143, 0.02)");
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    strokeLine();
    ctx.strokeStyle = "#00e88f";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(0, 232, 143, 0.55)";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Tip
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

    const fmt = (v: number) =>
      v > 0 && v < 1e-6 ? v.toExponential(3) : v.toPrecision(5);

    ctx.fillStyle = "rgba(0, 232, 143, 0.65)";
    ctx.font = "11px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.fillText(fmt(maxV), pad.l + plotW + 6, pad.t + 10);
    ctx.fillText(fmt(minV), pad.l + plotW + 6, pad.t + plotH);
    ctx.fillStyle = "#00e88f";
    ctx.font = "bold 12px ui-monospace, monospace";
    ctx.fillText(fmt(last.value), pad.l + plotW + 6, Math.min(tipY + 4, pad.t + plotH));

    // B/S filled circles only
    for (const m of markers || []) {
      if (!(m.time > 0 && m.price > 0)) continue;
      if (m.time < minT || m.time > maxT + 2) continue;
      const x = xAt(Math.min(Math.max(m.time, minT), maxT));
      const y = yAt(m.price);
      const buy = m.side === "buy";
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fillStyle = buy ? "#00e88f" : "#ff3b6b";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#00140d";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(buy ? "B" : "S", x, y + 0.5);
      ctx.textBaseline = "alphabetic";
    }

    ctx.fillStyle = "rgba(0, 232, 143, 0.45)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      new Date(points[0].time * 1000).toLocaleTimeString(),
      pad.l + 24,
      cssH - 8
    );
    ctx.fillText(
      new Date(last.time * 1000).toLocaleTimeString(),
      pad.l + plotW - 24,
      cssH - 8
    );
  }, [points, markers, height, width]);

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
