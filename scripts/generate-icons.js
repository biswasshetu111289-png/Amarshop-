import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const source = path.resolve('public/assets/aistudio/file_00000000312481fabfb649d53c7c85c6_7cd0cbb9.png');

async function generateIcons() {
  console.log('Generating icons from:', source);

  // 192x192 standard icon
  await sharp(source)
    .resize(192, 192, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 0 } })
    .toFile('public/pwa-192x192.png');
  console.log('Generated public/pwa-192x192.png');

  // 512x512 standard icon
  await sharp(source)
    .resize(512, 512, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 0 } })
    .toFile('public/pwa-512x512.png');
  console.log('Generated public/pwa-512x512.png');

  // 512x512 maskable icon with safe zone padding (~12% padding around)
  // safe zone: 80% circle -> icon resized to 410x410 and placed on matching dark blue canvas (#0a1628)
  const innerIcon = await sharp(source)
    .resize(410, 410, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 10, g: 22, b: 40, alpha: 1 } // Dark blue matching the logo's outer tone
    }
  })
    .composite([{ input: innerIcon, gravity: 'centre' }])
    .toFile('public/pwa-maskable-512x512.png');
  console.log('Generated public/pwa-maskable-512x512.png');

  // Apple touch icon 180x180
  await sharp(source)
    .resize(180, 180, { fit: 'contain', background: { r: 10, g: 22, b: 40, alpha: 1 } })
    .toFile('public/apple-touch-icon.png');
  console.log('Generated public/apple-touch-icon.png');

  // Copy to src/assets/logo.png for bundled imports if needed
  if (!fs.existsSync('src/assets')) {
    fs.mkdirSync('src/assets', { recursive: true });
  }
  fs.copyFileSync(source, 'src/assets/logo.png');
  console.log('Copied to src/assets/logo.png');

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
