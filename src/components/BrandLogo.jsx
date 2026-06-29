import React from 'react';

/**
 * Navigators brand mark: a stylized sail inside the gold ring, with the
 * "navigators" wordmark in Navigator Teal. Faithful to the brand guide
 * (gold ring, gold sail, teal lowercase wordmark).
 *
 * @param {boolean} wordmark  show the "navigators" text next to the icon
 * @param {string}  light     render wordmark in white (for dark backgrounds)
 */
export default function BrandLogo({ size = 38, wordmark = true, light = false, className = '' }) {
  const wordColor = light ? '#ffffff' : '#008c95';
  return (
    <span className={`brand-logo ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Navigators">
        <circle cx="50" cy="50" r="43" fill="none" stroke="#d19f2a" strokeWidth="7" />
        <path d="M50 20 C42 40 36 58 30 72 L62 72 C60 54 56 36 50 20 Z" fill="#d19f2a" />
        <path d="M50 20 C46 38 44 56 44 72 L30 72 C36 58 42 40 50 20 Z" fill="#b9881d" />
      </svg>
      {wordmark && (
        <span
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 700,
            fontSize: size * 0.5,
            letterSpacing: '-0.01em',
            color: wordColor,
            lineHeight: 1,
          }}
        >
          navigators
        </span>
      )}
    </span>
  );
}
