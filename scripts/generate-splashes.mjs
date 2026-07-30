/**
 * Generates iOS splash screens for all current iPhone/iPad sizes.
 * Output: public/splash/apple-launch-{width}x{height}.png
 * Run with: node scripts/generate-splashes.mjs
 */

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const publicDir = join(root, 'public');
const outDir = join(publicDir, 'splash');
const logoPath = join(publicDir, 'mascot_joy_nobg.png');

if (!existsSync(logoPath)) {
  console.error(`Logo not found at ${logoPath}`);
  process.exit(1);
}

if (!existsSync(outDir)) {
  await mkdir(outDir, { recursive: true });
}

// Each size records:
//   w, h: actual splash image pixels (real device pixels)
//   cssW, cssH: viewport CSS pixels (w/dpr, h/dpr)
//   dpr: device pixel ratio
const SIZES = [
  // ───── iPhone 16 / 15 / 14 / 13 Pro Max ─────
  { name: 'iphone-16-pro-max',  cssW: 440, cssH: 956, dpr: 3, w: 1320, h: 2868 },
  { name: 'iphone-15-pro-max',  cssW: 430, cssH: 932, dpr: 3, w: 1290, h: 2796 },
  { name: 'iphone-14-pro-max',  cssW: 430, cssH: 932, dpr: 3, w: 1290, h: 2796 },
  // ───── iPhone 16 / 15 / 14 Pro ─────
  { name: 'iphone-16-pro',       cssW: 402, cssH: 874, dpr: 3, w: 1206, h: 2622 },
  { name: 'iphone-15-pro',       cssW: 393, cssH: 852, dpr: 3, w: 1179, h: 2556 },
  { name: 'iphone-14-pro',       cssW: 393, cssH: 852, dpr: 3, w: 1179, h: 2556 },
  // ───── iPhone 16 / 15 / 14 Plus ─────
  { name: 'iphone-16-plus',      cssW: 430, cssH: 956, dpr: 3, w: 1290, h: 2868 },
  { name: 'iphone-15-plus',      cssW: 430, cssH: 932, dpr: 3, w: 1290, h: 2796 },
  { name: 'iphone-14-plus',      cssW: 428, cssH: 926, dpr: 3, w: 1284, h: 2778 },
  // ───── iPhone 16 / 15 / 14 ─────
  { name: 'iphone-16',           cssW: 393, cssH: 852, dpr: 3, w: 1179, h: 2556 },
  { name: 'iphone-15',           cssW: 393, cssH: 852, dpr: 3, w: 1179, h: 2556 },
  { name: 'iphone-14',           cssW: 390, cssH: 844, dpr: 3, w: 1170, h: 2532 },
  // ───── iPhone 13 Pro Max ─────
  { name: 'iphone-13-pro-max',   cssW: 428, cssH: 926, dpr: 3, w: 1284, h: 2778 },
  // ───── iPhone 13 / 13 Pro / 12 / 12 Pro ─────
  { name: 'iphone-13-pro',       cssW: 390, cssH: 844, dpr: 3, w: 1170, h: 2532 },
  { name: 'iphone-13',           cssW: 390, cssH: 844, dpr: 3, w: 1170, h: 2532 },
  { name: 'iphone-12-pro',       cssW: 390, cssH: 844, dpr: 3, w: 1170, h: 2532 },
  { name: 'iphone-12',           cssW: 390, cssH: 844, dpr: 3, w: 1170, h: 2532 },
  // ───── iPhone 13 mini / 12 mini ─────
  { name: 'iphone-13-mini',      cssW: 360, cssH: 780, dpr: 3, w: 1080, h: 2340 },
  { name: 'iphone-12-mini',      cssW: 360, cssH: 780, dpr: 3, w: 1080, h: 2340 },
  // ───── iPhone 11 Pro Max / XS Max ─────
  { name: 'iphone-11-pro-max',   cssW: 414, cssH: 896, dpr: 3, w: 1242, h: 2688 },
  { name: 'iphone-xs-max',       cssW: 414, cssH: 896, dpr: 3, w: 1242, h: 2688 },
  // ───── iPhone 11 Pro / X ─────
  { name: 'iphone-11-pro',       cssW: 375, cssH: 812, dpr: 3, w: 1125, h: 2436 },
  { name: 'iphone-x',            cssW: 375, cssH: 812, dpr: 3, w: 1125, h: 2436 },
  // ───── iPhone 11 / XR ─────
  { name: 'iphone-11',           cssW: 414, cssH: 896, dpr: 2, w: 828,  h: 1792 },
  { name: 'iphone-xr',           cssW: 414, cssH: 896, dpr: 2, w: 828,  h: 1792 },
  // ───── iPhone 8 Plus ─────
  { name: 'iphone-8-plus',       cssW: 414, cssH: 736, dpr: 3, w: 1242, h: 2208 },
  { name: 'iphone-7-plus',       cssW: 414, cssH: 736, dpr: 3, w: 1242, h: 2208 },
  // ───── iPhone 8 / SE (3rd/2nd) ─────
  { name: 'iphone-8',            cssW: 375, cssH: 667, dpr: 2, w: 750,  h: 1334 },
  { name: 'iphone-se-3rd',       cssW: 375, cssH: 667, dpr: 2, w: 750,  h: 1334 },
  { name: 'iphone-se-2nd',       cssW: 375, cssH: 667, dpr: 2, w: 750,  h: 1334 },
  // ───── iPad Pro 13" M4 ─────
  { name: 'ipad-pro-13-m4',      cssW: 1032, cssH: 1376, dpr: 2, w: 2064, h: 2752 },
  // ───── iPad Pro 12.9" ─────
  { name: 'ipad-pro-12-9',       cssW: 1024, cssH: 1366, dpr: 2, w: 2048, h: 2732 },
  // ───── iPad Pro 11" M4 ─────
  { name: 'ipad-pro-11-m4',      cssW: 834,  cssH: 1210, dpr: 2, w: 1668, h: 2420 },
  // ───── iPad Pro 11" ─────
  { name: 'ipad-pro-11',         cssW: 834,  cssH: 1194, dpr: 2, w: 1668, h: 2388 },
  // ───── iPad Air 13" M2 / Air 11" M2 / iPad 10 ─────
  { name: 'ipad-air-13-m2',      cssW: 820,  cssH: 1180, dpr: 2, w: 1640, h: 2360 },
  { name: 'ipad-air-11-m2',      cssW: 820,  cssH: 1180, dpr: 2, w: 1640, h: 2360 },
  { name: 'ipad-10',             cssW: 820,  cssH: 1180, dpr: 2, w: 1640, h: 2360 },
  // ───── iPad mini 6 ─────
  { name: 'ipad-mini-6',         cssW: 744,  cssH: 1133, dpr: 2, w: 1488, h: 2266 },
];

const LOGO_RATIO = 0.22;
const LOGO_RADIUS = 0.18;

async function buildLogoBuffer(logoWidth) {
  const logoHeight = Math.round(logoWidth);

  const meta = await sharp(logoPath).metadata();
  const srcW = meta.width || 1024;
  const srcH = meta.height || 1024;
  const cropHeight = Math.round(srcH * 0.95);

  const resized = await sharp(logoPath)
    .trim({ background: { r: 0, g: 0, b: 0 }, threshold: 30 })
    .resize(logoWidth, logoHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return await sharp(resized)
    .png()
    .toBuffer();
}

async function generateSplash(size) {
  const { name, w, h } = size;
  const filename = `apple-launch-${w}x${h}-${name}.png`;
  const filepath = join(outDir, filename);

  const logoWidth = Math.round(w * LOGO_RATIO);
  const logoBuffer = await buildLogoBuffer(logoWidth);

  const glowSize = Math.round(w * 0.7);
  const glow = Buffer.from(
    `<svg width="${glowSize}" height="${glowSize}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stop-color="#a78bfa" stop-opacity="0.22"/>
          <stop offset="55%" stop-color="#2dd4bf" stop-opacity="0.06"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="${glowSize/2}" cy="${glowSize/2}" r="${glowSize/2}" fill="url(#g)"/>
    </svg>`
  );

  const left = Math.round((w - logoWidth) / 2);
  const top = Math.round((h - logoWidth) / 2);

  const bg = Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg" cx="0.5" cy="0.5" r="0.85">
          <stop offset="0%" stop-color="#1f1530" stop-opacity="1"/>
          <stop offset="55%" stop-color="#0a0612" stop-opacity="1"/>
          <stop offset="100%" stop-color="#000" stop-opacity="1"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
    </svg>`
  );

  await sharp(bg)
    .composite([
      { input: glow, left: Math.round((w - glowSize) / 2), top: Math.round((h - glowSize) / 2) },
      { input: logoBuffer, left, top },
    ])
    .png({ compressionLevel: 9 })
    .toFile(filepath);

  return { filename, ...size };
}

/**
 * Generates Android Chrome PWA splash screens.
 *
 * Chrome 96+ automatically generates a splash by combining:
 *   - The largest icon (192/512)
 *   - The background_color from the manifest
 *
 * The icon should respect a "safe zone" of ~40% of its dimensions to avoid
 * being clipped by Android's adaptive icon mask. We render the logo at
 * ~50% of the canvas and keep the rest transparent.
 */
async function generateAndroidSplash({ size, w, h, suffix }) {
  const filename = `android-splash-${w}x${h}${suffix ? '-' + suffix : ''}.png`;
  const filepath = join(outDir, filename);

  // Logo fits inside the inner 40% safe zone
  const logoWidth = Math.round(Math.min(w, h) * 0.4);
  const logoBuffer = await buildLogoBuffer(logoWidth);

  const left = Math.round((w - logoWidth) / 2);
  const top = Math.round((h - logoWidth) / 2);

  // Transparent background — Chrome will composite over manifest background_color
  await sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: logoBuffer, left, top }])
    .png({ compressionLevel: 9 })
    .toFile(filepath);

  return { filename, w, h };
}

const ANDROID_SIZES = [
  // Chrome PWA icon sizes (also used for splash composition in Chrome 96+)
  { w: 192, h: 192, size: '192x192' },
  { w: 512, h: 512, size: '512x512' },
  // Splash for common Android device resolutions (Chrome uses icon + bg, but
  // these are useful for fallback web splash / WebAPK splash screens)
  { w: 1080, h: 1920, size: 'android-phone-portrait-1x', suffix: 'phone-1x' },
  { w: 2160, h: 3840, size: 'android-phone-portrait-2x', suffix: 'phone-2x' },
  { w: 1920, h: 1080, size: 'android-phone-landscape-1x', suffix: 'phone-landscape-1x' },
];

console.log('🎨 Generating iOS splash screens...\n');

const results = [];
for (const size of SIZES) {
  try {
    const r = await generateSplash(size);
    const stats = statSync(join(outDir, r.filename));
    const kb = (stats.size / 1024).toFixed(1);
    console.log(`  ✓ iOS  ${r.filename.padEnd(46)} ${kb} KB`);
    results.push(r);
  } catch (err) {
    console.error(`  ✗ iOS  ${size.name}: ${err.message}`);
  }
}

console.log('\n🤖 Generating Android splash assets...\n');

const androidResults = [];
for (const size of ANDROID_SIZES) {
  try {
    const r = await generateAndroidSplash(size);
    const stats = statSync(join(outDir, r.filename));
    const kb = (stats.size / 1024).toFixed(1);
    console.log(`  ✓ AOSP ${r.filename.padEnd(46)} ${kb} KB`);
    androidResults.push(r);
  } catch (err) {
    console.error(`  ✗ AOSP ${size.size}: ${err.message}`);
  }
}

// Generate correct media queries using CSS pixels + DPR
// Format: (width: Xpx) and (height: Ypx) and (-webkit-device-pixel-ratio: N) and (orientation: portrait)
const lines = results.map(r => {
  return `    <link rel="apple-touch-startup-image" href="/splash/${r.filename}" media="(width: ${r.cssW}px) and (height: ${r.cssH}px) and (-webkit-device-pixel-ratio: ${r.dpr}) and (orientation: portrait)" />`;
}).join('\n');

const androidLines = androidResults.map(r => {
  return `    <link rel="icon" type="image/png" sizes="${r.w}x${r.h}" href="/splash/${r.filename}" />`;
}).join('\n');

const snippet = `# ─── iOS splash screens ──────────────────────────────────────────
${lines}

# ─── Android Chrome PWA icon variants (used for splash composition) ─
# These are referenced from manifest.json + for native Android WebAPK splash
${androidLines}
`;

const snippetPath = join(root, 'scripts', 'splash-manifest.txt');
await writeFile(snippetPath, snippet, 'utf8');

const totalBytes = [...results, ...androidResults].reduce((s, r) => {
  try { return s + statSync(join(outDir, r.filename)).size; }
  catch { return s; }
}, 0);

console.log(`\n✅ ${results.length} iOS + ${androidResults.length} Android splash assets generated`);
console.log(`📋 Manifest snippet: ${snippetPath}`);
console.log(`   Total size: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);