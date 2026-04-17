'use client';

import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';
import type { Analyser } from 'tone';

interface AudioVisualizerProps {
  analyser: Analyser | null;
  isPlaying: boolean;
  className?: string;
  barCount?: number;
}

const TARGET_FPS = 30;
const IDLE_AMPLITUDE = 0.12;
const FALLBACK_CYAN = '#00f0ff';
const FALLBACK_MAGENTA = '#ff00aa';
const FALLBACK_MUTED = '#4a4a5a';

export function AudioVisualizer({
  analyser,
  isPlaying,
  className,
  barCount = 48,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rootStyles = getComputedStyle(document.documentElement);
    const cyan = rootStyles.getPropertyValue('--color-accent-cyan').trim() || FALLBACK_CYAN;
    const magenta =
      rootStyles.getPropertyValue('--color-accent-magenta').trim() || FALLBACK_MAGENTA;
    const muted = rootStyles.getPropertyValue('--color-bg-border').trim() || FALLBACK_MUTED;

    const frameInterval = 1000 / TARGET_FPS;
    let lastFrameAt = 0;
    let rafId: number | null = null;
    let isHidden = document.visibilityState === 'hidden';

    const handleVisibility = () => {
      isHidden = document.visibilityState === 'hidden';
      if (!isHidden && rafId === null) {
        rafId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    function resizeCanvasIfNeeded(): boolean {
      if (!canvas) return false;
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = Math.max(1, Math.floor(canvas.clientWidth));
      const displayHeight = Math.max(1, Math.floor(canvas.clientHeight));
      const targetW = displayWidth * dpr;
      const targetH = displayHeight * dpr;
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        return true;
      }
      return false;
    }

    function render(now: number) {
      if (!canvas || !ctx) return;
      if (isHidden) {
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(render);
      if (now - lastFrameAt < frameInterval) return;
      lastFrameAt = now;

      resizeCanvasIfNeeded();
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, cyan);
      gradient.addColorStop(1, magenta);

      const spacing = Math.max(1, width / barCount / 6);
      const barWidth = (width - spacing * (barCount - 1)) / barCount;
      const centerY = height / 2;

      const fft = analyser && isPlaying ? (analyser.getValue() as Float32Array) : null;
      ctx.fillStyle = fft ? gradient : muted;

      for (let i = 0; i < barCount; i += 1) {
        let amplitude: number;
        if (fft && fft.length > 0) {
          const fftIndex = Math.floor((i / barCount) * fft.length);
          const db = fft[fftIndex] ?? -100;
          amplitude = Math.max(0, Math.min(1, (db + 100) / 85));
        } else {
          amplitude = IDLE_AMPLITUDE;
        }
        const barHeight = Math.max(2, amplitude * height * 0.9);
        const x = i * (barWidth + spacing);
        const y = centerY - barHeight / 2;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    }

    rafId = requestAnimationFrame(render);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [analyser, isPlaying, barCount]);

  return <canvas ref={canvasRef} className={cn('h-[120px] w-full md:h-[160px]', className)} />;
}
