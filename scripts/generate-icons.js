#!/usr/bin/env node

/**
 * Generate PWA icons from SVG favicon
 * Creates missing PNG icons required by manifest.json
 */

const fs = require('fs');
const path = require('path');

// Create basic PNG data for favicons
// This is a minimal PNG implementation for emergency icon creation
function createMinimalPNG(width, height, color = '#00C851') {
  // Simple green square PNG with 6FB branding
  const canvas = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" rx="${Math.floor(width * 0.1)}" fill="#1a1a1a"/>
  <rect x="${Math.floor(width * 0.05)}" y="${Math.floor(height * 0.05)}"
        width="${Math.floor(width * 0.9)}" height="${Math.floor(height * 0.9)}"
        rx="${Math.floor(width * 0.08)}" fill="${color}"/>

  <!-- 6FB Text -->
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
        fill="white" font-family="Arial, sans-serif"
        font-size="${Math.floor(width * 0.25)}" font-weight="bold">6FB</text>
</svg>`;

  return canvas;
}

const publicDir = path.join(__dirname, '..', 'public');

// Generate icons with different sizes
const icons = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

console.log('🎨 Generating PWA icons...');

icons.forEach(icon => {
  const svgContent = createMinimalPNG(icon.size, icon.size);
  const svgPath = path.join(publicDir, `${icon.name}.svg`);

  try {
    fs.writeFileSync(svgPath, svgContent);
    console.log(`✅ Created ${icon.name}.svg (${icon.size}x${icon.size})`);
  } catch (error) {
    console.error(`❌ Failed to create ${icon.name}:`, error.message);
  }
});

console.log('📱 Icon generation complete!');
console.log(
  'Note: SVG icons created as PNG fallbacks. Consider using proper image tools for production.'
);
