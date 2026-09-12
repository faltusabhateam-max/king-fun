"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp,
  ColorType,
} from "lightweight-charts";

export function TokenChart({
  candles,
  height = 320,
}: {
  candles: number[][];
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(232, 238, 233, 0.55)",
      },
      grid: {
        vertLines: { color: "rgba(0, 232, 143, 0.06)" },
        horzLines: { color: "rgba(0, 232, 143, 0.06)" },
      },
      rightPriceScale: { borderColor: "rgba(0, 232, 143, 0.15)" },
      timeScale: { borderColor: "rgba(0, 232, 143, 0.15)" },
      crosshair: {
        vertLine: { color: "rgba(0, 232, 143, 0.35)" },
        horzLine: { color: "rgba(0, 232, 143, 0.35)" },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#00e88f",
      downColor: "#f43f5e",
      borderUpColor: "#00e88f",
      borderDownColor: "#f43f5e",
      wickUpColor: "#00e88f",
      wickDownColor: "#f43f5e",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const onResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    onResize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    if (!seriesRef.current) return;
    const data: CandlestickData[] = (candles || [])
      .map((c) => ({
        time: c[0] as UTCTimestamp,
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
      }))
      .filter((d) => d.open > 0 && d.close > 0)
      .sort((a, b) => (a.time as number) - (b.time as number));

    if (data.length === 0) {
      const now = Math.floor(Date.now() / 1000);
      const synth: CandlestickData[] = [];
      let price = 0.00001;
      for (let i = 48; i >= 0; i--) {
        const open = price;
        const close = price * (1 + (Math.random() - 0.48) * 0.08);
        synth.push({
          time: (now - i * 1800) as UTCTimestamp,
          open,
          high: Math.max(open, close) * 1.02,
          low: Math.min(open, close) * 0.98,
          close,
        });
        price = close;
      }
      seriesRef.current.setData(synth);
    } else {
      seriesRef.current.setData(data);
    }
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-xl"
      style={{ height }}
    />
  );
}
