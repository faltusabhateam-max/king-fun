"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  AreaSeries,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type LineData,
  type UTCTimestamp,
  ColorType,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";

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

export function LiveChart({
  candles,
  height = 380,
  markPrice,
  markers = [],
}: {
  candles: ChartCandle[];
  height?: number;
  markPrice?: number;
  markers?: ChartTradeMark[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const markersApiRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

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
    const series = chart.addSeries(AreaSeries, {
      lineColor: "#00e88f",
      topColor: "rgba(0, 232, 143, 0.35)",
      bottomColor: "rgba(0, 232, 143, 0.02)",
      lineWidth: 2,
    });
    chartRef.current = chart;
    seriesRef.current = series;
    markersApiRef.current = createSeriesMarkers(series, []);
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
      markersApiRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    if (!seriesRef.current) return;
    let data: LineData[] = (candles || [])
      .filter((c) => c.close > 0)
      .map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.close,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    if (data.length === 0 && markPrice && markPrice > 0) {
      const t = Math.floor(Date.now() / 1000) as UTCTimestamp;
      data = [{ time: t, value: markPrice }];
    }
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
    } else {
      seriesRef.current.setData([]);
    }

    const seriesMarkers: SeriesMarker<Time>[] = (markers || [])
      .filter((m) => m.time > 0 && m.price > 0)
      .map((m) => ({
        time: m.time as UTCTimestamp,
        position: (m.side === "buy" ? "belowBar" : "aboveBar") as
          | "belowBar"
          | "aboveBar",
        color: m.side === "buy" ? "#00e88f" : "#ff3b6b",
        shape: (m.side === "buy" ? "arrowUp" : "arrowDown") as
          | "arrowUp"
          | "arrowDown",
        text: m.side === "buy" ? "B" : "S",
      }))
      .reduce((acc, m) => {
        const t = m.time as number;
        if (acc.some((x) => (x.time as number) === t)) return acc;
        acc.push(m);
        return acc;
      }, [] as SeriesMarker<Time>[])
      .sort((a, b) => (a.time as number) - (b.time as number));

    markersApiRef.current?.setMarkers(seriesMarkers);
  }, [candles, markPrice, markers]);

  return <div ref={ref} className="w-full" />;
}
