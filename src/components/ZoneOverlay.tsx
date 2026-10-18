import type { ReactElement } from 'react';
import type { Zone } from '../game/types';

interface ZoneOverlayProps {
  zone: Zone;
}

/** A vignette that tints the whole screen as stability falls. Invisible while Stable. */
export function ZoneOverlay({ zone }: ZoneOverlayProps): ReactElement {
  return <div aria-hidden="true" className="zone-overlay" data-zone={zone} />;
}
