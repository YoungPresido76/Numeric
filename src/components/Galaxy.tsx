import { memo, type ReactElement } from 'react';

export type GalaxyVariant = 'violet' | 'ember' | 'void';

interface GalaxyProps {
  variant?: GalaxyVariant;
}

/**
 * Soft parallax star field and nebula glow. Three star layers drift at
 * different speeds. Used only behind Collapse and between labs, never on the
 * main play screen. Fills its positioned parent.
 */
function GalaxyBase({ variant = 'violet' }: GalaxyProps): ReactElement {
  return (
    <div aria-hidden="true" className="galaxy" data-variant={variant}>
      <div className="nebula nebula-1 -top-10 -left-10 size-56" />
      <div className="nebula nebula-2 -right-12 bottom-0 size-64" />
      <div className="stars stars-a" />
      <div className="stars stars-b" />
      <div className="stars stars-c" />
    </div>
  );
}

export const Galaxy = memo(GalaxyBase);
