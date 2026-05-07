'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';

export function NatureVisualization({ isTraining }: { isTraining: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const particles = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      x: seededRandom(i) * 100,
      y: seededRandom(i + 100) * 100,
      size: seededRandom(i + 200) * 2 + 1,
      speedX: (seededRandom(i + 300) - 0.5) * 0.2,
      speedY: (seededRandom(i + 400) - 0.5) * 0.2,
      color: seededRandom(i + 500) > 0.5 ? '#10b981' : '#3b82f6'
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const time = Date.now() * 0.001;
      const intensity = isTraining ? 2 : 0.5;

      particles.forEach((p, i) => {
        // Update position
        p.x += p.speedX * intensity;
        p.y += p.speedY * intensity;

        // Wrap around
        if (p.x < 0) p.x = 100;
        if (p.x > 100) p.x = 0;
        if (p.y < 0) p.y = 100;
        if (p.y > 100) p.y = 0;

        // Draw particle
        const canvasX = (p.x / 100) * canvas.width;
        const canvasY = (p.y / 100) * canvas.height;

        ctx.beginPath();
        ctx.arc(canvasX, canvasY, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.4 + Math.sin(time + i) * 0.2;
        ctx.fill();

        // Draw connections
        particles.forEach((p2, j) => {
          if (i === j) return;
          const dist = Math.sqrt(Math.pow(p.x - p2.x, 2) + Math.pow(p.y - p2.y, 2));
          if (dist < 15) {
            ctx.beginPath();
            ctx.moveTo(canvasX, canvasY);
            ctx.lineTo((p2.x / 100) * canvas.width, (p2.y / 100) * canvas.height);
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = (1 - dist / 15) * 0.2 * (isTraining ? 1 : 0.3);
            ctx.stroke();
          }
        });
      });

      animationFrameId = requestAnimationFrame(render);
    };

    const handleResize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isTraining, particles]);

  return (
    <div className="absolute inset-0 pointer-events-none opacity-60">
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Overlay Glows */}
      <div className="absolute inset-0 bg-radial-gradient from-emerald-500/5 to-transparent opacity-30" />

      {isTraining && (
        <motion.div
          animate={{
            opacity: [0.1, 0.3, 0.1],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute inset-0 bg-radial-gradient from-blue-500/5 to-transparent"
        />
      )}
    </div>
  );
}
