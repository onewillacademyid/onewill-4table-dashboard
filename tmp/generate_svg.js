const fs = require('fs');

// Generate SVG for Onewill Academy Logo
// Based on official Onewill Academy Logo Color Guide:
// - Color: Deep Plum / Violet: #43105B (or #400C54)
// - Accent: Golden Amber: #ECA200 (or #EAA000)
// - Wordmark: "Onewill" / "Academy" in bold geometric sans
// - Tagline: "Your Strategic Learning & Growth Partner."

function generateFullLogoSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 540" fill="none" role="img" aria-label="Onewill Academy">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&amp;display=swap');
      .brand-title {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        font-weight: 800;
        fill: #43105B;
        letter-spacing: -0.02em;
      }
      .brand-tagline {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        font-weight: 700;
        fill: #43105B;
        letter-spacing: -0.01em;
      }
    </style>
  </defs>

  <g transform="translate(40, 40)">
    <!-- EMBLEM ICON -->
    <g transform="translate(0, 20)">
      <!-- Outer Ring & Legs (Deep Purple) -->
      <!-- Outer circle top: cx=90, cy=90, R=78, r=52 -->
      <!-- Left leg descends at ~60 deg to (6, 210) -->
      <!-- Right leg descends at ~60 deg to (174, 210) -->
      
      <!-- 1. Outer Loop & Outer Left/Right Shell -->
      <!-- Left outer leg -->
      <path d="M 12 210 L 46 210 L 66 172 L 32 172 Z" fill="#43105B" />
      <path d="M 32 172 L 66 172 L 86 134 L 52 134 Z" fill="#43105B" />

      <!-- Outer circle arc -->
      <path d="M 40 148 C 24 116 26 76 50 48 C 76 18 120 16 148 42 C 174 68 178 110 156 142 L 186 210 L 152 210 L 134 168 C 146 146 146 120 134 100 C 120 78 90 74 72 90 C 60 102 54 120 58 138 Z" fill="#43105B" />

      <!-- Inner Chevron (Apex pointing up) -->
      <!-- Right stroke of chevron -->
      <path d="M 100 74 L 142 168 L 168 210 L 134 210 L 118 172 L 88 106 Z" fill="#43105B" />

      <!-- Left stroke upper (purple) -->
      <path d="M 100 74 L 88 106 L 68 144 L 54 120 L 78 82 Z" fill="#43105B" />

      <!-- Golden Amber Accent (Lower left stroke of chevron) -->
      <path d="M 52 152 L 76 152 L 100 210 L 66 210 Z" fill="#ECA200" transform="matrix(1 0 0 1 -14 0)" />
    </g>
  </g>
</svg>`;
}

fs.writeFileSync('/tmp/logo_test.svg', generateFullLogoSvg());
console.log('Generated test SVG');
