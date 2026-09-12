"use client";

import { useEffect, useRef } from "react";

export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const stars: { x: number; y: number; z: number; s: number }[] = [];

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };

    const init = () => {
      stars.length = 0;
      const count = Math.min(220, Math.floor((w * h) / 9000));
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          z: Math.random(),
          s: Math.random() * 1.6 + 0.2,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // emerald nebula blobs
      const g1 = ctx.createRadialGradient(
        w * 0.2,
        h * 0.15,
        0,
        w * 0.2,
        h * 0.15,
        w * 0.45
      );
      g1.addColorStop(0, "rgba(0, 232, 143, 0.12)");
      g1.addColorStop(0.5, "rgba(0, 80, 50, 0.06)");
      g1.addColorStop(1, "transparent");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      const g2 = ctx.createRadialGradient(
        w * 0.85,
        h * 0.7,
        0,
        w * 0.85,
        h * 0.7,
        w * 0.4
      );
      g2.addColorStop(0, "rgba(0, 180, 120, 0.1)");
      g2.addColorStop(1, "transparent");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      for (const star of stars) {
        star.y += 0.05 + star.z * 0.15;
        if (star.y > h) {
          star.y = 0;
          star.x = Math.random() * w;
        }
        const alpha = 0.25 + star.z * 0.75;
        ctx.beginPath();
        ctx.fillStyle = `rgba(232, 238, 233, ${alpha})`;
        ctx.arc(star.x, star.y, star.s * (0.4 + star.z), 0, Math.PI * 2);
        ctx.fill();

        // occasional emerald twinkle
        if (star.z > 0.85) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(0, 232, 143, ${alpha * 0.6})`;
          ctx.arc(star.x, star.y, star.s * 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    init();
    draw();
    window.addEventListener("resize", () => {
      resize();
      init();
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      aria-hidden
    />
  );
}
