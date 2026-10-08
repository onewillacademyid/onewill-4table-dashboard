const fs = require('fs');

const PURPLE = '#43105B';
const GOLD = '#EBA107';

// 1. FULL LOGO (Square-ish, identical to uploaded "Onewill Academy Logo Color Guide.png")
const fullLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 560" fill="none" role="img" aria-label="Onewill Academy - Your Strategic Learning &amp; Growth Partner.">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&amp;display=swap');
      .title-onewill {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        font-weight: 800;
        fill: ${PURPLE};
      }
      .tagline-onewill {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        font-weight: 700;
        fill: ${PURPLE};
      }
    </style>
  </defs>

  <!-- ==================== ICON EMBLEM ==================== -->
  <g transform="translate(60, 65)">
    <!-- Outer Circle Arc & Left Leg -->
    <path d="
      M 14 195 
      L 42 195 
      L 70 134 
      C 62 120 58 104 58 88 
      C 58 59.8 80.8 37 109 37 
      C 137.2 37 160 59.8 160 88 
      C 160 106 151 123 138 134 
      L 164 195 
      L 194 195 
      C 183 145 190 98 168 62 
      C 155 41 133 22 109 22 
      C 72 22 42 51 36 88 
      C 34 104 38 120 45 134 
      Z
    " fill="${PURPLE}" />

    <!-- Right Leg (Solid Purple) -->
    <path d="
      M 109 72 
      L 155 195 
      L 194 195 
      L 138 72 
      Z
    " fill="${PURPLE}" />

    <!-- Chevron Upper Purple Segment -->
    <path d="
      M 109 72 
      L 125 116 
      L 105 116 
      L 96 90 
      L 82 124 
      L 66 124 
      Z
    " fill="${PURPLE}" />

    <!-- Golden Amber Accent (Chevron Lower Left Segment) -->
    <polygon points="50,195 78,195 106,134 78,134" fill="${GOLD}" />
  </g>

  <!-- ==================== WORDMARK ==================== -->
  <g transform="translate(290, 70)">
    <text x="0" y="92" class="title-onewill" font-size="84" letter-spacing="-0.035em">Onewill</text>
    <text x="0" y="184" class="title-onewill" font-size="84" letter-spacing="-0.035em">Academy</text>
  </g>

  <!-- ==================== TAGLINE ==================== -->
  <text x="60" y="360" class="tagline-onewill" font-size="31" letter-spacing="-0.015em">Your Strategic Learning &amp; Growth Partner.</text>
</svg>`;

// Write to public directory
fs.writeFileSync('public/onewill-logo.svg', fullLogoSvg);
console.log('Saved public/onewill-logo.svg successfully');
