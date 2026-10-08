const fs = require('fs');

const purple = '#43105B';
const gold = '#EBA107';

// Generate SVG string
function getOnewillLogo() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 520" fill="none" role="img" aria-label="Onewill Academy - Your Strategic Learning &amp; Growth Partner.">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&amp;display=swap');
      .logo-title {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        font-weight: 800;
        fill: ${purple};
      }
      .logo-tagline {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        font-weight: 700;
        fill: ${purple};
      }
    </style>
  </defs>

  <!-- ==================== 1. EMBLEM (X: 45..245, Y: 60..260) ==================== -->
  <g transform="translate(45, 60)">
    <!-- Main Purple Body: Outer Ring, Left Outer Leg, and Merged Right Leg -->
    <path fill-rule="evenodd" clip-rule="evenodd" d="
      M 110 16
      C 149.76 16 182 48.24 182 88
      C 182 108.5 173.5 127 169.8 134
      L 198 195
      L 152 195
      L 110 92
      L 92.5 138
      L 118.5 138
      L 110 68
      C 117.5 76 124 81.5 132 84
      C 144 87.5 152 98 152 110
      C 152 124 142 135 128 136
      L 142 165
      C 158 155 168 137 168 116
      C 168 84.19 142 58.4 110 58.4
      C 82 58.4 59.4 78 54.8 105
      L 74 115
      C 77 101 87.5 91 101 89
      C 103 89 105 89 107 89.2
      L 110 68
      C 102 68 94 71 88 75
      C 71 86 60 105 60 126
      L 45 195
      L 14 195
      L 49 126
      C 42 104 45 80 57 60
      C 69 40 88 16 110 16 Z
    " fill="${purple}" />

    <!-- Chevron Upper Purple Stroke -->
    <path d="M 110 68 L 132 115 L 115 115 L 110 92 L 95 126 L 80 126 Z" fill="${purple}" />

    <!-- Chevron Lower Left Accent (Golden Amber Parallelogram) -->
    <path d="M 57 195 L 83 195 L 111 140 L 85 140 Z" fill="${gold}" />
  </g>

  <!-- ==================== 2. WORDMARK (Right: X=275) ==================== -->
  <text x="272" y="156" class="logo-title" font-size="78" letter-spacing="-0.035em">Onewill</text>
  <text x="272" y="242" class="logo-title" font-size="78" letter-spacing="-0.035em">Academy</text>

  <!-- ==================== 3. TAGLINE (Bottom: X=45) ==================== -->
  <text x="45" y="348" class="logo-tagline" font-size="28.5" letter-spacing="-0.01em">Your Strategic Learning &amp; Growth Partner.</text>
</svg>`;
}

fs.writeFileSync('/tmp/test_logo_v3.svg', getOnewillLogo());
console.log('Saved /tmp/test_logo_v3.svg');
