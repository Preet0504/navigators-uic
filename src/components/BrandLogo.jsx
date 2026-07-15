import React from 'react';

/**
 * Official Navigators brand mark — the gold ring + sail (with ®), served from
 * public/logo.svg. The source was cleaned to gold-only, transparent paths so it
 * sits correctly on any background (light navbar, dark teal footer/hero).
 *
 * @param {boolean} wordmark  show the "navigators" wordmark next to the mark
 * @param {boolean} light     render the wordmark in white (for dark backgrounds)
 */
export default function BrandLogo({ size = 38, wordmark = true, light = false, className = '' }) {
  const wordColor = light ? '#ffffff' : '#008c95';
  return (
    <span className={`brand-logo ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
      <img
        src="/logo.svg"
        alt="Navigators"
        width={size}
        height={size}
        style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
      />
      {wordmark && (
        <span
          style={{
            fontFamily: "'Comfortaa', 'Quicksand', sans-serif",
            fontWeight: 600,
            fontSize: size * 0.54,
            letterSpacing: '0.005em',
            color: wordColor,
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          navigators
          <sup style={{ fontSize: '0.34em', verticalAlign: 'super', fontWeight: 600, marginLeft: '0.08em' }}>®</sup>
        </span>
      )}
    </span>
  );
}
