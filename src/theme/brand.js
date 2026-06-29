// Single source of truth for the Navigators brand identity.
// Values come straight from the official "Navigators Color Guide" (digital palette).

export const BRAND = {
  // Primary
  teal: '#008c95', // Navigator Teal  (Pantone 321 C)
  gold: '#d19f2a', // Navigator Gold  (Pantone 7555 C)

  // Primary neutrals
  sage: '#8e9c9c', // Pantone 443 C
  mist: '#dad9d7', // Cool Grey 1 C
  espresso: '#392f2c', // Pantone 412 C
  cocoa: '#61514e', // Pantone 411 C

  // Secondary palette
  orange: '#e16b2a', // Pantone 7578 C
  yellow: '#fdb714', // Pantone 7549 C
  blue: '#228cc0', // Pantone 7689 C
  purple: '#7f4182', // Pantone 7662 C

  // Convenience tints/shades (derived, brand-compliant)
  tealDark: '#00666c',
  tealDarker: '#024247',
  goldDark: '#a87d18',
  ink: '#24201e',
  paper: '#fbfaf7',
};

// Each section of the site gets a brand "accent" so it feels distinct
// while staying on-brand. Used by the shared <Section accent> helper.
export const ACCENTS = {
  teal: BRAND.teal,
  gold: BRAND.gold,
  orange: BRAND.orange,
  blue: BRAND.blue,
  purple: BRAND.purple,
};

export const FONTS = {
  display: "'Playfair Display', Georgia, serif",
  body: "'Montserrat', 'Segoe UI', Arial, sans-serif",
};
