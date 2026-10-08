const fs = require('fs');

const primaryColor = '#43105B'; // Deep violet / purple from guide
const goldColor = '#EBA107';    // Vibrant golden yellow from guide

// High-precision vector representation of the official Onewill Academy emblem
const emblemSvg = `
  <!-- Standalone Emblem (viewBox: 0 0 240 240) -->
  <g id="onewill-emblem">
    <!-- 1. Outer Ring & Right Leg (Deep Purple) -->
    <path d="M 120 20
             C 172.5 20 215 62.5 215 115
             C 215 142 204 166.5 186.5 184
             L 212 225
             L 178 225
             L 155 188
             C 144.5 192 132.5 194.5 120 194.5
             C 112 194.5 104.5 193.5 97.5 191.5
             L 76 225
             L 42 225
             L 68 184
             C 38 163 25 124 35 88
             C 47 48 81 20 120 20 Z" 
          fill="${primaryPurple}" />
  </g>
`;
