import type { ReactElement } from 'react';

interface IconProps {
  className?: string;
}

const common = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function BuildIcon({ className }: IconProps): ReactElement {
  return (
    <svg {...common} className={className}>
      <path d="M12 3 3.5 7.5 12 12l8.5-4.5L12 3Z" />
      <path d="m3.5 12 8.5 4.5 8.5-4.5" />
      <path d="m3.5 16.5 8.5 4.5 8.5-4.5" />
    </svg>
  );
}

export function UpgradeIcon({ className }: IconProps): ReactElement {
  return (
    <svg {...common} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16.5V8" />
      <path d="m8.5 11.5 3.5-3.5 3.5 3.5" />
    </svg>
  );
}

export function CollapseIcon({ className }: IconProps): ReactElement {
  return (
    <svg {...common} className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function SystemIcon({ className }: IconProps): ReactElement {
  return (
    <svg {...common} className={className}>
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <circle cx="16" cy="7" r="2" />
      <path d="M4 17h2" />
      <path d="M10 17h10" />
      <circle cx="8" cy="17" r="2" />
    </svg>
  );
}
