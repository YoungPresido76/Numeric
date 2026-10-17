import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react';
import { formatNumber } from '../game/math';

interface OrbProps {
  tapGain: number;
  surging: boolean;
  onTap: () => void;
}

interface Floater {
  id: number;
  x: number;
  y: number;
  label: string;
}

const MAX_FLOATERS = 6;
const FLOATER_MS = 900;

/** The tap target: an atom-like orb with orbital rings and a breathing core. */
export function Orb({ tapGain, surging, onTap }: OrbProps): ReactElement {
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [hits, setHits] = useState(0);
  const nextId = useRef(0);
  const timers = useRef<Set<number>>(new Set());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((id) => window.clearTimeout(id));
      pending.clear();
    };
  }, []);

  const trigger = (x: number, y: number): void => {
    onTap();
    setHits((n) => n + 1);
    const id = nextId.current;
    nextId.current += 1;
    setFloaters((list) => [...list.slice(-(MAX_FLOATERS - 1)), { id, x, y, label: `+${formatNumber(tapGain)}` }]);
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      setFloaters((list) => list.filter((f) => f.id !== id));
    }, FLOATER_MS);
    timers.current.add(timer);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    trigger(event.clientX - rect.left, event.clientY - rect.top);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>): void => {
    if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      trigger(rect.width / 2, rect.height / 2);
    }
  };

  const ring = surging ? 'text-amber-300' : 'text-cyan-300';
  const ringAlt = surging ? 'text-orange-300' : 'text-violet-300';

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      aria-label={`Observe the orb to gain ${formatNumber(tapGain)} amplitude`}
      className={`relative mx-auto grid size-[clamp(104px,19dvh,168px)] touch-manipulation place-items-center rounded-full select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 ${
        surging ? 'orb-surge' : ''
      }`}
    >
      <svg viewBox="0 0 200 200" className="pointer-events-none size-full overflow-visible" aria-hidden="true">
        <defs>
          <radialGradient id="orb-core-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="30%" stopColor={surging ? '#ffe08a' : '#7df3ff'} stopOpacity="0.92" />
            <stop offset="70%" stopColor={surging ? '#ff9f43' : '#7c5cff'} stopOpacity="0.5" />
            <stop offset="100%" stopColor={surging ? '#ff9f43' : '#7c5cff'} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="orb-halo-grad" cx="50%" cy="50%" r="50%">
            <stop offset="55%" stopColor={surging ? '#ffb347' : '#6366f1'} stopOpacity="0" />
            <stop offset="100%" stopColor={surging ? '#ffb347' : '#6366f1'} stopOpacity="0.28" />
          </radialGradient>
        </defs>

        <circle cx="100" cy="100" r="98" fill="url(#orb-halo-grad)" />

        <g className={`orb-ring orb-ring-a ${ring}`}>
          <g transform="rotate(20 100 100)">
            <ellipse cx="100" cy="100" rx="90" ry="32" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="2 6" />
            <circle cx="190" cy="100" r="4.5" fill="currentColor" />
          </g>
        </g>
        <g className={`orb-ring orb-ring-b ${ringAlt}`}>
          <g transform="rotate(-50 100 100)">
            <ellipse cx="100" cy="100" rx="84" ry="26" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.2" />
            <circle cx="16" cy="100" r="3.5" fill="currentColor" />
          </g>
        </g>
        <g className={`orb-ring orb-ring-c ${ring}`}>
          <g transform="rotate(80 100 100)">
            <ellipse cx="100" cy="100" rx="70" ry="22" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="1 4" />
            <circle cx="170" cy="100" r="3" fill="currentColor" />
          </g>
        </g>

        <g key={hits} className={hits > 0 ? 'orb-hit' : undefined}>
          <circle className="orb-core" cx="100" cy="100" r="40" fill="url(#orb-core-grad)" />
        </g>
      </svg>

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
  );
}
