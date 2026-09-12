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

export type ChartCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export function LiveChart({
  candles,
  height = 380,
  markPrice,
}: {
  candles: ChartCandle[];
  height?: number;
  markPrice?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(0, 232, 143, 0.65)",
      },
      grid: {
        vertLines: { color: "rgba(0, 232, 143, 0.06)" },
        horzLines: { color: "rgba(0, 232, 143, 0.06)" },
      },
      rightPriceScale: { borderColor: "rgba(0, 232, 143, 0.2)" },
      timeScale: { borderColor: "rgba(0, 232, 143, 0.2)", timeVisible: true },
      crosshair: {
        vertLine: { color: "rgba(0, 232, 143, 0.4)" },
        horzLine: { color: "rgba(0, 232, 143, 0.4)" },
      },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#00e88f",
      downColor: "#ff3b6b",
      borderUpColor: "#00e88f",
      borderDownColor: "#ff3b6b",
      wickUpColor: "#00e88f",
      wickDownColor: "#ff3b6b",
    });
    chartRef.current = chart;
    seriesRef.current = series;
    const onResize = () => {
      if (ref.current) chart.applyOptions({ width: ref.current.clientWidth });
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
    let data: CandlestickData[] = (candles || [])
      .filter((c) => c.close > 0)
      .map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    if (data.length === 0 && markPrice && markPrice > 0) {
      const t = Math.floor(Date.now() / 1000) as UTCTimestamp;
      data = [
        {
          time: t,
          open: markPrice,
          high: markPrice,
          low: markPrice,
          close: markPrice,
        },
      ];
    }
    // Dedup times
    const seen = new Set<number>();
    data = data.filter((d) => {
      const t = d.time as number;
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    });
    if (data.length) {
      seriesRef.current.setData(data);
      chartRef.current?.timeScale().fitContent();
    }
  }, [candles, markPrice]);

  return <div ref={ref} className="w-full" />;
}
