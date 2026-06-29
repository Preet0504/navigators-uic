import React from 'react';

/**
 * Subtle brand line-patterns from the Navigators guide ("Movement",
 * "Connection", "Rays of Light"). Rendered as a low-opacity decorative
 * background layer. Pointer-events disabled so it never blocks UI.
 */
export default function Pattern({ variant = 'movement', color = '#008c95', opacity = 0.06, style = {} }) {
  const id = React.useId().replace(/:/g, '');
  const base = {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    pointerEvents: 'none', opacity, ...style,
  };

  if (variant === 'connection') {
    return (
      <svg style={base} aria-hidden="true">
        <defs>
          <pattern id={`p-${id}`} width="56" height="56" patternUnits="userSpaceOnUse">
            <circle cx="28" cy="28" r="20" fill="none" stroke={color} strokeWidth="1" />
            <circle cx="0" cy="0" r="20" fill="none" stroke={color} strokeWidth="1" />
            <circle cx="56" cy="56" r="20" fill="none" stroke={color} strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#p-${id})`} />
      </svg>
    );
  }

  if (variant === 'rays') {
    return (
      <svg style={base} viewBox="0 0 200 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        {Array.from({ length: 24 }).map((_, i) => (
          <line key={i} x1="100" y1="200" x2={100 + 200 * Math.cos((Math.PI * i) / 23)} y2={200 - 200 * Math.sin((Math.PI * i) / 23)} stroke={color} strokeWidth="0.6" />
        ))}
      </svg>
    );
  }

  // movement (chevrons)
  return (
    <svg style={base} aria-hidden="true">
      <defs>
        <pattern id={`p-${id}`} width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M0 8 L20 28 L40 8" fill="none" stroke={color} strokeWidth="1.2" />
          <path d="M0 22 L20 42 L40 22" fill="none" stroke={color} strokeWidth="1.2" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#p-${id})`} />
    </svg>
  );
}
