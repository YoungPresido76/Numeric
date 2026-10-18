import type { ReactElement } from 'react';

interface FlowTrailProps {
  /** Current ψ/s. Drives how many trails drift up. */
  rate: number;
}

const LANES: readonly { left: string; delay: string; duration: string }[] = [
  { left: '6%', delay: '0s', duration: '3.6s' },
  { left: '94%', delay: '1.2s', duration: '3.2s' },
  { left: '12%', delay: '2.1s', duration: '4s' },
  { left: '88%', delay: '0.6s', duration: '3.8s' },
];

/**
 * A soft glow drifting from the projects up toward the amplitude counter.
 * Decorative only; the number of trails grows with production.
 */
export function FlowTrail({ rate }: FlowTrailProps): ReactElement | null {
  if (!(rate > 0)) return null;
  const count = Math.min(LANES.length, Math.max(1, Math.floor(Math.log10(rate + 1) / 3) + 1));
  return (
    <div aria-hidden="true" className="flow-lane">
      {LANES.slice(0, count).map((lane) => (
        <span
          key={lane.left}
          className="flow-dot"
          style={{ left: lane.left, animationDelay: lane.delay, animationDuration: lane.duration }}
        />
      ))}
    </div>
  );
}
