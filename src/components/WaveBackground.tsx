import { useEffect, useRef, type ReactElement } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface WaveBackgroundProps {
  /** 0 (idle) … 1 (very fast). Scales wave height and glow. */
  intensity: number;
}

interface Wave {
  frequency: number;
  speed: number;
  phase: number;
  alpha: number;
}

const WAVES: readonly Wave[] = [
  { frequency: 1.1, speed: 0.55, phase: 0, alpha: 0.2 },
  { frequency: 1.7, speed: -0.4, phase: 1.3, alpha: 0.16 },
  { frequency: 2.6, speed: 0.75, phase: 2.1, alpha: 0.13 },
  { frequency: 3.9, speed: -0.9, phase: 0.6, alpha: 0.1 },
];

const FRAME_MS = 33;
const STEP_PX = 8;

/** Interfering sine waves drawn on a canvas. Pauses automatically when the tab is hidden. */
export function WaveBackground({ intensity }: WaveBackgroundProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intensityRef = useRef(intensity);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

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
      ctx.clearRect(0, 0, width, height);
      const power = intensityRef.current;
      const baseY = height * 0.62;
      const amplitude = height * (0.035 + power * 0.07);

      for (const wave of WAVES) {
        ctx.beginPath();
        for (let x = 0; x <= width; x += STEP_PX) {
          const u = x / width;
          const y =
            baseY +
            Math.sin(u * Math.PI * 2 * wave.frequency + seconds * wave.speed + wave.phase) *
              amplitude;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(125, 211, 252, ${wave.alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.beginPath();
      for (let x = 0; x <= width; x += STEP_PX) {
        const u = x / width;
        let sum = 0;
        for (const wave of WAVES) {
          sum += Math.sin(u * Math.PI * 2 * wave.frequency + seconds * wave.speed + wave.phase);
        }
        const y = baseY + (sum / WAVES.length) * amplitude * 1.6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(167, 139, 250, ${0.35 + power * 0.35})`;
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
