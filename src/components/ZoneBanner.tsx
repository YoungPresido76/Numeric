import type { ReactElement } from 'react';
import { PROJECT_NAMES } from '../game/data';
import type { LabState, Zone } from '../game/types';
import { TriangleAlert } from './icons';

interface ZoneBannerProps {
  zone: Zone;
  lab: LabState;
}

/** A persistent warning once the lab is Critical, with the named cause. Hidden otherwise. */
export function ZoneBanner({ zone, lab }: ZoneBannerProps): ReactElement | null {
  if (zone !== 'critical' && zone !== 'imminent') return null;

  const cause = lab.lastCause === null ? 'The lab is failing' : `${PROJECT_NAMES[lab.lastCause]} is failing`;
  const imminent = zone === 'imminent';
  const seconds = Math.max(0, Math.ceil(lab.grace));

  return (
    <div
      role="alert"
      className={`fade-in mx-3 mb-2 flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2 text-xs font-semibold ${
        imminent
          ? 'animate-pulse border-rose-400/70 bg-rose-500/20 text-rose-100'
          : 'border-rose-400/40 bg-rose-500/10 text-rose-200'
      }`}
    >
      <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
      <p className="flex-1 leading-snug">
        {imminent
          ? `Collapse imminent. Repair something or publish now${lab.grace >= 0 ? ` (${seconds}s)` : ''}.`
          : `Critical: ${cause}. Neutralize it before it spreads.`}
      </p>
    </div>
  );
}
