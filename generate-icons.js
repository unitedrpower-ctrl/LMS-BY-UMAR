import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('./public/icon-192.svg');
const publicDir = path.resolve('./public');

const sizes = [
  { size: 32, filename: 'icon-32.png' },
  { size: 180, filename: 'icon-180.png' },
  { size: 192, filename: 'icon-192.png' },
  { size: 512, filename: 'icon-512.png' }
];

async function generate() {
  console.log('Generating high-resolution PWA icons...');
  try {
    const svgBuffer = fs.readFileSync(svgPath);
    
    for (const item of sizes) {
      const destPath = path.join(publicDir, item.filename);
      await sharp(svgBuffer)
        .resize(item.size, item.size)
        .png()
        .toFile(destPath);
      console.log(`Generated: ${item.filename} (${item.size}x${item.size})`);
    }
    console.log('All PWA PNG icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generate();
