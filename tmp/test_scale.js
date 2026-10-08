const fs = require('fs');

// Generate the official Onewill Academy Logo SVG based on the uploaded color guide
const purple = '#43105B';
const gold = '#EBA107';

function getEmblemSvg(scale = 1, offsetX = 0, offsetY = 0) {
  return `
    <g transform="translate(${offsetX}, ${offsetY}) scale(${scale})">
      <!-- 1. Main Purple Body: Outer O-Ring, Outer Left Leg, and Right Foot -->
      <!-- Smooth, unified vector path -->
      <path d="M 100 20
               C 144.18 20 180 55.82 180 100
               C 180 119.5 173 137.4 161.3 151.3
               L 186 190
               L 154 190
               L 138.5 165.6
               C 127.3 173.3 114.1 177.8 100 177.8
               C 85.9 177.8 72.7 173.3 61.5 165.6
               L 46 190
               L 14 190
               L 38.7 151.3
               C 27 137.4 20 119.5 20 100
               C 20 55.82 55.82 20 100 20 Z" 
            fill="${purple}" />
    </g>
  `;
}

console.log('Script ready');
