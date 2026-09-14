import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');

const files = [
  'mascot_anger.png',
  'mascot_anger_nobg.png',
  'mascot_anxiety.png',
  'mascot_anxiety_nobg.png',
  'mascot_calm.png',
  'mascot_calm_nobg.png',
  'mascot_joy.png',
  'mascot_joy_nobg.png',
  'mascot_sadness.png',
  'mascot_sadness_nobg.png',
  'logo.jpg',
  'apple-touch-icon.png',
  'badge.png'
];

async function run() {
  console.log('🖼️  Iniciando optimización de imágenes en /public...\n');
  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of files) {
    const filePath = path.join(publicDir, file);
    if (!fs.existsSync(filePath)) continue;

    const statBefore = fs.statSync(filePath);
    const beforeKB = statBefore.size / 1024;
    totalBefore += statBefore.size;

    const inputBuffer = fs.readFileSync(filePath);
    let outputBuffer;

    if (file.endsWith('.png')) {
      outputBuffer = await sharp(inputBuffer)
        .png({
          compressionLevel: 9,
          palette: true,
          quality: 85,
          effort: 10
        })
        .toBuffer();
    } else if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
      outputBuffer = await sharp(inputBuffer)
        .jpeg({
          quality: 80,
          mozjpeg: true
        })
        .toBuffer();
    }

    if (outputBuffer && outputBuffer.length < inputBuffer.length) {
      fs.writeFileSync(filePath, outputBuffer);
      const statAfter = fs.statSync(filePath);
      const afterKB = statAfter.size / 1024;
      totalAfter += statAfter.size;
      const saved = ((1 - statAfter.size / statBefore.size) * 100).toFixed(1);
      console.log(`  ✓ ${file.padEnd(26)} ${beforeKB.toFixed(1)} KB -> ${afterKB.toFixed(1)} KB (-${saved}%)`);
    } else {
      totalAfter += statBefore.size;
      console.log(`  • ${file.padEnd(26)} ${beforeKB.toFixed(1)} KB (ya optimizado)`);
    }
  }

  console.log('\n──────────────────────────────────────────────');
  console.log(`  Total Inicial: ${(totalBefore / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Total Final:   ${(totalAfter / 1024).toFixed(1)} KB (${(totalAfter / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`  Ahorro Total:  ${((1 - totalAfter / totalBefore) * 100).toFixed(1)}%`);
  console.log('──────────────────────────────────────────────\n');
}

run().catch(console.error);
