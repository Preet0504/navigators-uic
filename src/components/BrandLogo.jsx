import React from 'react';

// Real dimensions of the source cutouts (public/logo-lockup.png,
// public/logo-icon.png) — used to size the <img> by aspect ratio.
const LOCKUP_RATIO = 1058 / 286;

/**
 * Official Navigators brand mark, used exactly as supplied (the national
 * ministry's own artwork — gold ring + sail, teal "navigators®" wordmark).
 * Background removed for transparency; otherwise unedited. Since the mark's
 * colors are fixed in the image, it's used as-is on every background —
 * no recoloring for dark surfaces.
 *
 * @param {boolean} wordmark  true: full mark + "navigators®" wordmark (logo-lockup.png).
 *                            false: mark only (logo-icon.png), for tight/square spots.
 */
export default function BrandLogo({ size = 38, wordmark = true, className = '' }) {
  return (
    <span className={`brand-logo ${className}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
      <img
        src={wordmark ? '/logo-lockup.png' : '/logo-icon.png'}
        alt="Navigators"
        height={size}
        width={wordmark ? Math.round(size * LOCKUP_RATIO) : size}
        style={{ display: 'block', height: size, width: 'auto', maxWidth: '100%' }}
      />
    </span>
  );
}
