const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');

// Colors derived from Material You tonal palette based on #4E5D94:
// Primary 90: #DDE1FF
// Primary 80: #B8C4F6
// Primary 70: #9FAEDF
// Primary 40: #4E5D94
// Primary 20: #1D2A57
// Dark Surface Tone: #131520 (Neutral Tone 10, deep indigo obsidian)
// Container Tone: #1A1D2B (Neutral Tone 15)

const fullIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background subtle gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="38%" r="65%">
      <stop offset="0%" stop-color="#1E2235" />
      <stop offset="55%" stop-color="#141724" />
      <stop offset="100%" stop-color="#0E101A" />
    </radialGradient>

    <!-- Glowing outline filter -->
    <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#4E5D94" flood-opacity="0.38" />
    </filter>

    <filter id="grenadeShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="2" dy="5" stdDeviation="5" flood-color="#000000" flood-opacity="0.5" />
    </filter>
  </defs>

  <!-- App Icon Background Squircle (Material You Dark Palette) -->
  <rect x="16" y="16" width="480" height="480" rx="112" fill="url(#bgGrad)" stroke="#2B314B" stroke-width="3" />
  
  <!-- Subtle decorative ring in Material You Indigo -->
  <circle cx="256" cy="256" r="215" fill="none" stroke="#4E5D94" stroke-width="1.5" stroke-dasharray="8 14" opacity="0.18" />

  <!-- MAIN GROUP: TILTED AT -12 DEGREES -->
  <g transform="translate(242, 262) rotate(-12)" filter="url(#subtleGlow)">
    
    <!-- === THE CAT (TRANSPARENT BODY, CLEAN OUTLINES & FACIAL FEATURES) === -->
    
    <!-- Outer Cat Box with Triangular Ears -->
    <path d="M -95 -95 L -95 -145 L -45 -95 L 45 -95 L 95 -145 L 95 95 L -95 95 Z" 
          fill="none" 
          stroke="#B8C4F6" 
          stroke-width="11" 
          stroke-linejoin="round" 
          stroke-linecap="round" />

    <!-- 3 Stripes on Head (between the ears) -->
    <!-- Center stripe -->
    <path d="M 0 -95 L 0 -52" stroke="#B8C4F6" stroke-width="12" stroke-linecap="round" />
    <!-- Left stripe -->
    <path d="M -26 -95 L -26 -60" stroke="#B8C4F6" stroke-width="10" stroke-linecap="round" />
    <!-- Right stripe -->
    <path d="M 26 -95 L 26 -60" stroke="#B8C4F6" stroke-width="10" stroke-linecap="round" />

    <!-- 2 Stripes on Left Cheek -->
    <path d="M -94 -16 L -62 -16" stroke="#B8C4F6" stroke-width="10" stroke-linecap="round" />
    <path d="M -94 14 L -62 14" stroke="#B8C4F6" stroke-width="10" stroke-linecap="round" />

    <!-- 2 Stripes on Right Cheek -->
    <path d="M 94 -16 L 62 -16" stroke="#B8C4F6" stroke-width="10" stroke-linecap="round" />
    <path d="M 94 14 L 62 14" stroke="#B8C4F6" stroke-width="10" stroke-linecap="round" />

    <!-- Belly curve at bottom (outline style) -->
    <path d="M -58 95 A 58 48 0 0 1 58 95" fill="none" stroke="#B8C4F6" stroke-width="8" stroke-linecap="round" stroke-dasharray="140" opacity="0.8" />

    <!-- Left Eye (Round Dot) -->
    <circle cx="-38" cy="-5" r="14" fill="#DDE1FF" stroke="#131520" stroke-width="2" />
    <circle cx="-34" cy="-9" r="4.5" fill="#FFFFFF" />

    <!-- Right Eye (Round Dot) -->
    <circle cx="38" cy="-5" r="14" fill="#DDE1FF" stroke="#131520" stroke-width="2" />
    <circle cx="42" cy="-9" r="4.5" fill="#FFFFFF" />

    <!-- Snout / Muzzle Outline -->
    <path d="M 0 -10 C -12 -10 -28 0 -28 16 C -28 26 -14 30 0 30 C 14 30 28 26 28 16 C 28 0 12 -10 0 -10 Z" 
          fill="none" 
          stroke="#DDE1FF" 
          stroke-width="5" 
          stroke-linejoin="round" />

    <!-- Cute Cat Mouth :3 inside Snout -->
    <path d="M -14 16 Q -7 25 0 17 Q 7 25 14 16" 
          fill="none" 
          stroke="#B8C4F6" 
          stroke-width="6" 
          stroke-linecap="round" 
          stroke-linejoin="round" />


    <!-- === GRENADE (HELD BY CAT ON RIGHT/FRONT) === -->
    <g transform="translate(108, 48) rotate(16)" filter="url(#grenadeShadow)">
      
      <!-- Grenade Neck & Fuze Cap -->
      <rect x="-14" y="-46" width="28" height="14" rx="3" fill="#36457A" stroke="#B8C4F6" stroke-width="4" />
      <rect x="-8" y="-53" width="16" height="8" rx="2" fill="#4E5D94" stroke="#B8C4F6" stroke-width="3" />

      <!-- Grenade Pull Ring (on the left) -->
      <circle cx="-22" cy="-44" r="9" fill="none" stroke="#DDE1FF" stroke-width="4" />
      <line x1="-14" y1="-44" x2="-13" y2="-44" stroke="#DDE1FF" stroke-width="4" stroke-linecap="round" />

      <!-- Grenade Safety Lever (curving over the right side) -->
      <path d="M 12 -48 C 24 -46 28 -28 26 12 C 25 24 20 38 14 44" fill="none" stroke="#DDE1FF" stroke-width="4.5" stroke-linecap="round" />

      <!-- Grenade Body (Egg / Capsule Shape) -->
      <!-- Balanced grid: 3 rows x 3 columns of segments (not too full, not too empty) -->
      <path d="M -24 -32 C -36 -12 -36 24 -20 46 C -10 57 10 57 20 46 C 36 24 36 -12 24 -32 Z" 
            fill="#1C2033" 
            stroke="#B8C4F6" 
            stroke-width="6" 
            stroke-linejoin="round" />

      <!-- Grenade Segmentation Grid Lines -->
      <path d="M -28 -12 C -10 -8 10 -8 28 -12" fill="none" stroke="#B8C4F6" stroke-width="4.5" stroke-linecap="round" />
      <path d="M -30 10 C -10 14 10 14 30 10" fill="none" stroke="#B8C4F6" stroke-width="4.5" stroke-linecap="round" />
      <path d="M -24 30 C -8 34 8 34 24 30" fill="none" stroke="#B8C4F6" stroke-width="4" stroke-linecap="round" />

      <!-- Vertical division lines -->
      <path d="M 0 -30 L 0 52" fill="none" stroke="#B8C4F6" stroke-width="4" stroke-linecap="round" />
      <path d="M -14 -24 C -18 0 -18 20 -12 40" fill="none" stroke="#B8C4F6" stroke-width="3.5" stroke-linecap="round" />
      <path d="M 14 -24 C 18 0 18 20 12 40" fill="none" stroke="#B8C4F6" stroke-width="3.5" stroke-linecap="round" />

      <!-- Highlight glint -->
      <path d="M -8 -22 C -4 -25 4 -25 8 -22" fill="none" stroke="#DDE1FF" stroke-width="3" stroke-linecap="round" opacity="0.75" />
    </g>

    <!-- === CAT PAW HOLDING THE GRENADE === -->
    <g transform="translate(85, 48) rotate(14)">
      <!-- Arm bridge -->
      <path d="M -8 2 C 2 0 14 -2 22 -1" fill="none" stroke="#B8C4F6" stroke-width="14" stroke-linecap="round" />
      <!-- Paw mitten / clutch fingers wrapped around grenade -->
      <rect x="15" y="-12" width="24" height="26" rx="9" fill="#141724" stroke="#DDE1FF" stroke-width="5" />
      <!-- Paw dividers -->
      <line x1="23" y1="-8" x2="23" y2="10" stroke="#DDE1FF" stroke-width="3.5" stroke-linecap="round" />
      <line x1="31" y1="-8" x2="31" y2="10" stroke="#DDE1FF" stroke-width="3.5" stroke-linecap="round" />
    </g>

  </g>
</svg>`;

// Write master SVG files
const masterSvgPath = path.join(PROJECT_ROOT, 'kittyfrag_icon.svg');
fs.writeFileSync(masterSvgPath, fullIconSvg);

// Generate Android Mipmap PNG icons
const mipmaps = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 }
];

mipmaps.forEach(({ dir, size }) => {
  const targetDir = path.join(PROJECT_ROOT, 'app/src/main/res', dir);
  if (fs.existsSync(targetDir)) {
    const targetFile = path.join(targetDir, 'ic_launcher.png');
    execSync(`convert -background none -resize ${size}x${size} "${masterSvgPath}" "${targetFile}"`);
    console.log(`Generated ${targetFile} (${size}x${size})`);
  }
});

// Also generate full-resolution 512x512 preview image
const previewPng = path.join(PROJECT_ROOT, 'kittyfrag_icon.png');
execSync(`convert -background none -resize 512x512 "${masterSvgPath}" "${previewPng}"`);
console.log(`Generated 512x512 preview: ${previewPng}`);
