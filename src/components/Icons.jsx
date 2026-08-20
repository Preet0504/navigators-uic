import React from 'react';

/**
 * Inline SVG icon set (Feather-style geometry).
 *
 * These replaced emoji in the highlight reel. Emoji were rendering as a
 * different vendor's colour artwork on every OS — Apple's glossy heart next to
 * Google's flat one — which fought the brand palette and sat visually apart
 * from the rest of the UI. SVG inherits `currentColor`, scales cleanly, and
 * takes the same hover/active treatment as any other element.
 *
 * Every icon takes `size` (px) and spreads the rest onto the <svg>, so callers
 * can set colour via CSS on the parent.
 */
const svg = (size, extra = {}) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
  ...extra,
});

// Solid when liked, outline otherwise — the one icon whose fill carries meaning.
export const Heart = ({ size = 22, filled = false, ...rest }) => (
  <svg {...svg(size, filled ? { fill: 'currentColor' } : {})} {...rest}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

export const Comment = ({ size = 22, ...rest }) => (
  <svg {...svg(size)} {...rest}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

export const Share = ({ size = 22, ...rest }) => (
  <svg {...svg(size)} {...rest}>
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4 20-7z" />
  </svg>
);

export const Download = ({ size = 22, ...rest }) => (
  <svg {...svg(size)} {...rest}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 10 5 5 5-5" />
    <path d="M12 15V3" />
  </svg>
);

export const VolumeOn = ({ size = 22, ...rest }) => (
  <svg {...svg(size)} {...rest}>
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);

export const VolumeOff = ({ size = 22, ...rest }) => (
  <svg {...svg(size)} {...rest}>
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    <path d="m23 9-6 6M17 9l6 6" />
  </svg>
);

export const Trash = ({ size = 22, ...rest }) => (
  <svg {...svg(size)} {...rest}>
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export const Close = ({ size = 22, ...rest }) => (
  <svg {...svg(size)} {...rest}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const Grid = ({ size = 22, ...rest }) => (
  <svg {...svg(size)} {...rest}>
    <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
  </svg>
);

export const Play = ({ size = 22, ...rest }) => (
  <svg {...svg(size, { fill: 'currentColor', stroke: 'none' })} {...rest}>
    <path d="M6 3.5v17l14-8.5-14-8.5z" />
  </svg>
);

export const ChevronUp = ({ size = 22, ...rest }) => (
  <svg {...svg(size)} {...rest}><path d="m18 15-6-6-6 6" /></svg>
);

export const ChevronDown = ({ size = 22, ...rest }) => (
  <svg {...svg(size)} {...rest}><path d="m6 9 6 6 6-6" /></svg>
);

export const ChevronLeft = ({ size = 22, ...rest }) => (
  <svg {...svg(size)} {...rest}><path d="m15 18-6-6 6-6" /></svg>
);

export const ChevronRight = ({ size = 22, ...rest }) => (
  <svg {...svg(size)} {...rest}><path d="m9 18 6-6-6-6" /></svg>
);

// Media-type badges on grid/strip tiles.
export const Photo = ({ size = 22, ...rest }) => (
  <svg {...svg(size)} {...rest}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

export const Video = ({ size = 22, ...rest }) => (
  <svg {...svg(size)} {...rest}>
    <path d="m23 7-7 5 7 5V7z" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);
