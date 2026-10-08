const fs = require('fs');

const purple = '#43105B';
const gold = '#EBA107';

function generateCleanLogo() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 500" fill="none" role="img" aria-label="Onewill Academy - Your Strategic Learning &amp; Growth Partner.">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&amp;display=swap');
      .title-font {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        font-weight: 800;
        fill: ${purple};
      }
      .tagline-font {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        font-weight: 700;
        fill: ${purple};
      }
    </style>
  </defs>

  <!-- ==================== EMBLEM (Left: X=45..245, Y=60..260) ==================== -->
  <g transform="translate(45, 60)">
    <!-- 1. Outer O-Ring Upper Arc -->
    <!-- Arc from (38, 116) up and around (100, 17) to (162, 116) -->
    <path d="
      M 38 116
      C 32 94 38 68 54 48
      C 73 24 100 17 127 22
      C 152 27 172 47 178 72
      C 183 95 177 116 162 132
      L 190 195
      L 148 195
      L 100 88
      L 86 120
      L 108 120
      L 100 70
      C 106 78 114 83 123 85
      C 134 88 143 96 144 108
      C 145 120 137 131 125 134
      L 138 163
      C 152 153 160 137 160 119
      C 160 86 133 59 100 59
      C 67 59 40 86 40 119
      C 40 126 41 133 44 140
      L 12 195
      L 38 195
      Z
    " fill="${purple}" />

    <!-- 2. Lower Left Golden Amber Segment -->
    <polygon points="50,195 76,195 104,136 78,136" fill="${gold}" />

    <!-- 3. Upper Left Chevron Purple Segment -->
    <polygon points="85,124 107,124 100,70 82,106" fill="${purple}" />

    <!-- 4. Outer Left Leg (Purple) -->
    <polygon points="12,195 38,195 64,136 38,136" fill="${purple}" />

    <!-- 5. Right Merged Leg (Purple) -->
    <polygon points="148,195 190,195 162,132 125,134" fill="${purple}" />
  </g>

  <!-- ==================== WORDMARK (Right) ==================== -->
  <text x="268" y="154" class="title-font" font-size="76" letter-spacing="-0.035em">Onewill</text>
  <text x="268" y="240" class="title-font" font-size="76" letter-spacing="-0.035em">Academy</text>

  <!-- ==================== TAGLINE (Bottom) ==================== -->
  <text x="45" y="342" class="tagline-font" font-size="28" letter-spacing="-0.01em">Your Strategic Learning &amp; Growth Partner.</text>
</svg>`;
}

fs.writeFileSync('/tmp/clean_logo.svg', generateCleanLogo());
console.log('Saved /tmp/clean_logo.svg');
