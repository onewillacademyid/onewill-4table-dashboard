const fs = require('fs');

const PURPLE = '#43105B';
const GOLD = '#EBA107';

// 1. EMBLEM PATHS (in 240 x 240 viewBox)
// Outer ring + legs + inner chevron + gold accent
const emblemPaths = `
  <!-- Outer purple loop & right leg -->
  <path d="
    M 120 18
    C 174.1 18 218 61.9 218 116
    C 218 144.5 205.8 170.1 186.2 187.8
    L 211 226
    L 174 226
    L 155.4 197.2
    C 144.8 202.8 132.8 206 120 206
    C 107.5 206 95.8 202.9 85.4 197.5
    L 66.8 226
    L 29 226
    L 53.6 188
    C 34.1 170.3 22 144.6 22 116
    C 22 61.9 65.9 18 120 18 Z
    
    M 120 54
    C 85.8 54 58 81.8 58 116
    C 58 132.2 64.3 147 74.6 158
    L 94.2 127.8
    C 91 124.3 89 119.5 89 114
    C 89 96.9 102.9 83 120 83
    C 137.1 83 151 96.9 151 114
    C 151 121.2 148.5 127.8 144.3 133
    L 165.2 158
    C 175.6 147 182 132.2 182 116
    C 182 81.8 154.2 54 120 54 Z
  " fill="${PURPLE}" />

  <!-- Inner Chevron Apex & Right Leg -->
  <path d="
    M 120 98
    L 166 226
    L 134 226
    L 120 186
    L 106 226
    L 92 186
  " fill="${PURPLE}" />
`;

console.log('Emblem draft ready');
