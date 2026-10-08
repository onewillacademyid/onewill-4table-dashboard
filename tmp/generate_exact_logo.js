const fs = require('fs');

// Mathematical construction of the official Onewill Academy Logo
// Based on "Onewill Academy Logo Color Guide.png"

const purple = '#43105B';
const gold = '#EAA000';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 380" fill="none" role="img" aria-label="Onewill Academy - Your Strategic Learning &amp; Growth Partner.">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&amp;display=swap');
      .brand-name {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        font-weight: 800;
        fill: ${purple};
        letter-spacing: -0.025em;
      }
      .brand-tagline {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        font-weight: 700;
        fill: ${purple};
        letter-spacing: -0.01em;
      }
    </style>
  </defs>

  <g transform="translate(30, 25)">
    <!-- ==================== EMBLEM (Width ~ 190, Height ~ 200) ==================== -->
    <g transform="translate(0, 5)">
      <!-- 1. Outer Loop (O-Shape) & Outer Left / Right Feet -->
      <!-- Outer circle top center: (98, 92), R=74, r=46 -->
      <path d="M 98 18
               C 139 18 172 51 172 92
               C 172 118 159 141 139 155
               L 165 210
               L 137 210
               L 117 168
               C 111 170 105 171 98 171
               C 91 171 85 170 79 168
               L 92 142
               C 94 142 96 143 98 143
               C 126 143 144 121 144 92
               C 144 67 123 46 98 46
               C 73 46 52 67 52 92
               C 52 108 60 122 72 131
               L 54 167
               C 34 151 24 125 24 92
               C 24 51 57 18 98 18 Z" 
            fill="${purple}" />

      <!-- Left Outer Leg -->
      <path d="M 24 92
               L 52 92
               L 12 210
               L -16 210 Z" 
            fill="${purple}" />

      <!-- Right Leg Extension -->
      <path d="M 139 155
               L 172 92
               L 144 92
               L 117 168 Z" 
            fill="${purple}" />
    </g>
  </g>
</svg>`;

fs.writeFileSync('/tmp/test_logo_out.svg', svg);
console.log('Saved test logo');
