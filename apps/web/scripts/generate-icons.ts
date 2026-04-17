/**
 * Generates PWA PNG icons from public/icon-source.svg at the sizes required by
 * manifest.json and Apple touch icons.
 *
 * Run with: `pnpm --filter @wts/web run generate-icons`
 * Output goes to public/icons/*.png, tracked in git so Vercel deploys don't re-run.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512];
const HERE = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(HERE, '..');

async function main() {
  const source = await readFile(join(WEB_ROOT, 'public/icon-source.svg'));
  const outDir = join(WEB_ROOT, 'public/icons');
  await mkdir(outDir, { recursive: true });

  for (const size of SIZES) {
    const out = await sharp(source).resize(size, size).png().toBuffer();
    await writeFile(join(outDir, `icon-${size}.png`), out);
    console.log(`✓ icon-${size}.png`);
  }

  // Favicon: 32x32 PNG served as icon; modern browsers accept PNG favicons.
  const favicon = await sharp(source).resize(32, 32).png().toBuffer();
  await writeFile(join(WEB_ROOT, 'public/favicon.png'), favicon);
  console.log('✓ favicon.png (32x32)');
}

main().catch((err) => {
  console.error('✗ generate-icons failed:', err);
  process.exit(1);
});
