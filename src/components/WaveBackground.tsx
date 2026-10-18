import { useEffect, useRef, type ReactElement } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { Zone } from '../game/types';

interface WaveBackgroundProps {
  /** 0 (idle) … 1 (very fast). Scales wave height and glow. */
  intensity: number;
  surging: boolean;
  zone: Zone;
}

interface Wave {
  frequency: number;
  speed: number;
  phase: number;
  alpha: number;
}

interface ZonePalette {
  /** RGB for the thin component waves. */
  line: string;
  /** RGB for the combined wave. */
  main: string;
  /** How disturbed the waves are: 0 calm … 1 violent. */
  disturbance: number;
  speed: number;
}

const WAVES: readonly Wave[] = [
  { frequency: 1.1, speed: 0.55, phase: 0, alpha: 0.2 },
  { frequency: 1.7, speed: -0.4, phase: 1.3, alpha: 0.16 },
  { frequency: 2.6, speed: 0.75, phase: 2.1, alpha: 0.13 },
  { frequency: 3.9, speed: -0.9, phase: 0.6, alpha: 0.1 },
];

const PALETTES: Readonly<Record<Zone, ZonePalette>> = {
  stable: { line: '125, 211, 252', main: '167, 139, 250', disturbance: 0, speed: 1 },
  strained: { line: '253, 186, 116', main: '251, 146, 60', disturbance: 0.25, speed: 1.15 },
  critical: { line: '252, 165, 165', main: '248, 113, 113', disturbance: 0.6, speed: 1.5 },
  imminent: { line: '253, 164, 175', main: '244, 63, 94', disturbance: 1, speed: 2.2 },
};

const SURGE_PALETTE = { line: '186, 230, 253', main: '224, 242, 254' };

const FRAME_MS = 33;
const STEP_PX = 8;

/**
 * Interfering sine waves on a canvas that read as a status signal: calm at low
 * output, taller and faster during Surge, and visibly disturbed (jittery, warm,
 * red) as stability falls. Pauses automatically when the tab is hidden.
 */
export function WaveBackground({ intensity, surging, zone }: WaveBackgroundProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ intensity, surging, zone });
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    stateRef.current = { intensity, surging, zone };
  }, [intensity, surging, zone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let frame = 0;
    let lastDraw = 0;

    const draw = (seconds: number): void => {
      const current = stateRef.current;
      const palette = PALETTES[current.zone];
      const energy = current.surging ? 1.7 : 1;
      const speed = palette.speed * (current.surging ? 1.8 : 1);
      const lineColor = current.surging ? SURGE_PALETTE.line : palette.line;
      const mainColor = current.surging ? SURGE_PALETTE.main : palette.main;
      const t = seconds * speed;

      ctx.clearRect(0, 0, width, height);
      const baseY = height * 0.62;
      const amplitude = height * (0.03 + current.intensity * 0.06) * energy;
      const jitter = palette.disturbance;

      const waveY = (u: number, wave: Wave): number =>
        baseY +
        Math.sin(u * Math.PI * 2 * wave.frequency + t * wave.speed + wave.phase) * amplitude +
        (jitter > 0
          ? Math.sin(u * 47 + t * 7 + wave.phase * 3) * amplitude * 0.35 * jitter
          : 0);

      for (const wave of WAVES) {
        ctx.beginPath();
        for (let x = 0; x <= width; x += STEP_PX) {
          const y = waveY(x / width, wave);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${lineColor}, ${wave.alpha + jitter * 0.06})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.beginPath();
      for (let x = 0; x <= width; x += STEP_PX) {
        const u = x / width;
        let sum = 0;
        for (const wave of WAVES) sum += waveY(u, wave) - baseY;
        const y = baseY + (sum / WAVES.length) * 1.6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(${mainColor}, ${0.35 + current.intensity * 0.3 + jitter * 0.15})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    };

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reducedMotion) draw(0);
    };

    const loop = (now: number): void => {
      frame = window.requestAnimationFrame(loop);
      if (now - lastDraw < FRAME_MS) return;
      lastDraw = now;
      draw(now / 1000);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    if (!reducedMotion) frame = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 h-full w-full opacity-80"
    />
  );
}
