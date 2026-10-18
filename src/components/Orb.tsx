import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react';
import { WAVE_STORE_CAP } from '../game/data';
import { clamp, formatNumber } from '../game/math';
import type { SurgeState } from '../game/types';
import { useReducedMotion } from '../hooks/useReducedMotion';
import './hud.css';

interface OrbProps {
  tapGain: number;
  surge: SurgeState;
  surgeDuration: number;
  surgeCooldown: number;
  /** Superposition Tapping: a tap adds a waveform instead of paying out. */
  waveform: boolean;
  waveforms: number;
  /** Chance that observing now collapses into a setback, 0 to 1. */
  setbackRisk: number;
  onTap: () => void;
  onSurge: () => void;
  onResolve: () => void;
}

interface Floater {
  id: number;
  x: number;
  y: number;
  label: string;
}

const MAX_FLOATERS = 6;
const FLOATER_MS = 900;
const CENTER = 120;
const SURGE_R = 108;
const WAVE_R = 88;
const WAVE_POINTS = 96;
const WAVE_LOBES = 12;

function wavePath(amplitude: number, phase: number): string {
  let d = '';
  for (let i = 0; i <= WAVE_POINTS; i += 1) {
    const f = (i / WAVE_POINTS) * Math.PI * 2;
    const r = WAVE_R + amplitude * Math.sin(WAVE_LOBES * f + phase);
    const a = f - Math.PI / 2;
    d += `${i === 0 ? 'M' : 'L'}${(CENTER + r * Math.cos(a)).toFixed(1)} ${(CENTER + r * Math.sin(a)).toFixed(1)}`;
  }
  return d;
}

/**
 * The observation target. The core orb is tapped to observe. The outer ring is
 * Surge: it fills while recharging, pulses when ready and drains while active;
 * tap it to fire. The inner wavy ring holds Unresolved Waveforms (Superposition
 * Tapping): it fills and ripples harder as they build; tap it to observe them.
 * Colours come from CSS variables, so stability zones and Surge recolour it.
 */
export function Orb({
  tapGain,
  surge,
  surgeDuration,
  surgeCooldown,
  waveform,
  waveforms,
  setbackRisk,
  onTap,
  onSurge,
  onResolve,
}: OrbProps): ReactElement {
  const reducedMotion = useReducedMotion();
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [hits, setHits] = useState(0);
  const nextId = useRef(0);
  const timers = useRef<Set<number>>(new Set());
  const phase = useRef(0);
  const trackRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<SVGPathElement>(null);

  const active = surge.activeLeft > 0;
  const cooling = !active && surge.cooldownLeft > 0;
  const ready = !active && !cooling;
  const surgeProgress = active
    ? surge.activeLeft / surgeDuration
    : cooling
      ? 1 - surge.cooldownLeft / surgeCooldown
      : 1;

  const count = Math.floor(waveforms);
  const waveFraction = Math.sqrt(clamp(waveforms / WAVE_STORE_CAP, 0, 1));
  const risky = setbackRisk > 0;

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((id) => window.clearTimeout(id));
      pending.clear();
    };
  }, []);

  useEffect(() => {
    if (!waveform) return undefined;
    const draw = (): void => {
      const d = wavePath(1.2 + waveFraction * 5, phase.current);
      trackRef.current?.setAttribute('d', d);
      fillRef.current?.setAttribute('d', d);
    };
    draw();
    if (reducedMotion) return undefined;
    let raf = 0;
    const step = (): void => {
      phase.current += 0.04 + waveFraction * 0.08;
      draw();
      raf = window.requestAnimationFrame(step);
    };
    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [waveform, waveFraction, reducedMotion]);

  const trigger = (x: number, y: number): void => {
    onTap();
    setHits((n) => n + 1);
    const id = nextId.current;
    nextId.current += 1;
    const label = waveform ? '+1 ∿' : `+${formatNumber(tapGain)}`;
    setFloaters((list) => [...list.slice(-(MAX_FLOATERS - 1)), { id, x, y, label }]);
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      setFloaters((list) => list.filter((f) => f.id !== id));
    }, FLOATER_MS);
    timers.current.add(timer);
  };

  const handleCorePointerDown = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    trigger(event.clientX - rect.left, event.clientY - rect.top);
  };

  const handleCoreKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>): void => {
    if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      trigger(rect.width / 2, rect.height / 2);
    }
  };

  const surgeStroke = active ? '#7dd3fc' : cooling ? '#a78bfa' : 'var(--zone-a)';
  const waveStroke = risky ? '#fcd34d' : '#5eead4';

  return (
    <div className={`relative mx-auto size-[min(70vw,clamp(170px,32dvh,290px))] select-none ${active ? 'orb-surge' : ''}`}>
      <svg viewBox="0 0 240 240" className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden="true">
        <defs>
          <radialGradient id="orb-core-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="30%" style={{ stopColor: 'var(--orb-a)' }} stopOpacity="0.92" />
            <stop offset="70%" style={{ stopColor: 'var(--orb-b)' }} stopOpacity="0.5" />
            <stop offset="100%" style={{ stopColor: 'var(--orb-b)' }} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="orb-halo-grad" cx="50%" cy="50%" r="50%">
            <stop offset="55%" style={{ stopColor: 'var(--orb-b)' }} stopOpacity="0" />
            <stop offset="100%" style={{ stopColor: 'var(--orb-b)' }} stopOpacity="0.3" />
          </radialGradient>
        </defs>

        <circle cx={CENTER} cy={CENTER} r={SURGE_R} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={3} />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={SURGE_R}
          fill="none"
          pathLength={100}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={`${clamp(surgeProgress, 0, 1) * 100} 100`}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
          className={ready ? 'ring-ready' : undefined}
          style={{
            stroke: surgeStroke,
            filter: cooling ? 'none' : `drop-shadow(0 0 ${active ? 9 : 4}px ${surgeStroke})`,
            opacity: cooling ? 0.8 : 1,
            transition: 'stroke-dasharray 100ms linear',
          }}
        />

        {waveform ? (
          <g>
            <path ref={trackRef} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={3} />
            <path
              ref={fillRef}
              fill="none"
              pathLength={100}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={`${waveFraction * 100} 100`}
              style={{ stroke: waveStroke, filter: `drop-shadow(0 0 4px ${waveStroke})` }}
            />
          </g>
        ) : null}

        <svg x={48} y={48} width={144} height={144} viewBox="0 0 200 200" overflow="visible">
          <circle cx="100" cy="100" r="98" fill="url(#orb-halo-grad)" />
          <g className="orb-ring orb-ring-a" style={{ color: 'var(--orb-a)' }}>
            <g transform="rotate(20 100 100)">
              <ellipse cx="100" cy="100" rx="90" ry="32" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="2 6" />
              <circle cx="190" cy="100" r="4.5" fill="currentColor" />
            </g>
          </g>
          <g className="orb-ring orb-ring-b" style={{ color: 'var(--orb-b)' }}>
            <g transform="rotate(-50 100 100)">
              <ellipse cx="100" cy="100" rx="84" ry="26" fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.2" />
              <circle cx="16" cy="100" r="3.5" fill="currentColor" />
            </g>
          </g>
          <g className="orb-ring orb-ring-c" style={{ color: 'var(--orb-a)' }}>
            <g transform="rotate(80 100 100)">
              <ellipse cx="100" cy="100" rx="70" ry="22" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="1 4" />
              <circle cx="170" cy="100" r="3" fill="currentColor" />
            </g>
          </g>
          <g key={hits} className={hits > 0 ? 'orb-hit' : undefined}>
            <circle className="orb-core" cx="100" cy="100" r="40" fill="url(#orb-core-grad)" />
          </g>
        </svg>

        {waveform ? (
          <circle
            cx={CENTER}
            cy={CENTER}
            r={WAVE_R}
            fill="none"
            stroke="transparent"
            strokeWidth={16}
            style={{ pointerEvents: 'stroke', cursor: count > 0 ? 'pointer' : 'default' }}
            onPointerDown={() => {
              if (count > 0) onResolve();
            }}
          />
        ) : null}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={SURGE_R}
          fill="none"
          stroke="transparent"
          strokeWidth={16}
          style={{ pointerEvents: 'stroke', cursor: ready ? 'pointer' : 'default' }}
          onPointerDown={() => {
            if (ready) onSurge();
          }}
        />
      </svg>

      <button
        type="button"
        onPointerDown={handleCorePointerDown}
        onKeyDown={handleCoreKeyDown}
        aria-label={
          waveform
            ? 'Observe the lab to add an unresolved waveform'
            : `Observe the lab to gain ${formatNumber(tapGain)} amplitude`
        }
        className="absolute inset-[18.5%] touch-manipulation rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
      >
        {floaters.map((floater) => (
          <span
            key={floater.id}
            className="floater font-numeric text-sm font-semibold text-cyan-100"
            style={{ left: floater.x, top: floater.y }}
          >
            {floater.label}
          </span>
        ))}
      </button>
    </div>
  );
}
