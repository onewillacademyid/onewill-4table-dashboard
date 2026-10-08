const fs = require('fs');

const purple = '#43105B';
const gold = '#EBA107';

// Generate precision vector SVG for Onewill Academy Logo
function generateSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 500" fill="none" role="img" aria-label="Onewill Academy - Your Strategic Learning &amp; Growth Partner.">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&amp;display=swap');
      .title-text {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        font-weight: 800;
        fill: ${purple};
      }
      .tagline-text {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        font-weight: 700;
        fill: ${purple};
      }
    </style>
  </defs>

  <!-- ==================== EMBLEM (Left: X=45..245, Y=60..260) ==================== -->
  <g transform="translate(48, 65)">
    <!-- 1. Main Purple Structure (Outer O-Loop + Right Leg + Left Outer Leg + Apex) -->
    <path fill-rule="evenodd" clip-rule="evenodd" d="
      M 100 12
      C 148.6 12 188 51.4 188 100
      C 188 126.8 176 150.8 157.2 167.2
      L 182 208
      L 146 208
      L 127.2 176.8
      C 118.8 181.2 109.6 183.6 100 183.6
      C 86.4 183.6 73.8 178.4 64.2 170
      L 46 208
      L 10 208
      L 41.6 142.8
      C 23.2 131.6 12 117.2 12 100
      C 12 51.4 51.4 12 100 12 Z
      
      M 100 44
      C 73.2 44 51 64.2 46.8 90
      L 70.8 90
      C 74.4 78 86 69.2 100 69.2
      C 116.4 69.2 130 82.8 130 99.2
      C 130 114 119.2 126.4 104.8 128.8
      L 116.8 152
      C 139.2 144 155.2 123.6 155.2 99.2
      C 155.2 68.8 130.4 44 100 44 Z
    " fill="${purple}" />

    <!-- 2. Inner Chevron Right Leg (Purple) -->
    <path d="M 100 78 L 146 208 L 118 208 L 84 112 Z" fill="${purple}" />

    <!-- 3. Inner Chevron Left Upper Leg (Purple) -->
    <path d="M 100 78 L 84 112 L 68 142 L 52 126 L 80 84 Z" fill="${purple}" />

    <!-- 4. Inner Chevron Lower Left Accent (Golden Amber) -->
    <path d="M 58 148 L 74 148 L 100 208 L 70 208 Z" fill="${gold}" />
  </g>

  <!-- ==================== WORDMARK (Right: X=275, Y=65..265) ==================== -->
  <text x="272" y="152" class="title-text" font-size="76" letter-spacing="-0.035em">Onewill</text>
  <text x="272" y="235" class="title-text" font-size="76" letter-spacing="-0.035em">Academy</text>

  <!-- ==================== TAGLINE (Bottom: X=48, Y=335) ==================== -->
  <text x="48" y="340" class="tagline-text" font-size="28.5" letter-spacing="-0.01em">Your Strategic Learning &amp; Growth Partner.</text>
</svg>`;
}

fs.writeFileSync('/tmp/onewill_logo_test.svg', generateSvg());
console.log('Saved to /tmp/onewill_logo_test.svg');
