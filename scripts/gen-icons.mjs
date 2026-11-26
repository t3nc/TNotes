import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT_DIR = fileURLToPath(new URL('../apps/web/public/icons', import.meta.url));
mkdirSync(OUT_DIR, { recursive: true });

function insideRoundedRect(x, y, left, top, right, bottom, radius) {
  if (x < left || x > right || y < top || y > bottom) return false;
  const cx = Math.min(Math.max(x, left + radius), right - radius);
  const cy = Math.min(Math.max(y, top + radius), bottom - radius);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function createIcon(size, maskable) {
  const png = new PNG({ width: size, height: size });
  const inset = maskable ? 0 : size * 0.04;
  const radius = maskable ? size * 0.5 : size * 0.22;
  const glyphScale = maskable ? 0.62 : 0.78;
  const cx = size / 2;
  const cy = size / 2;
  const sheetW = size * 0.46 * glyphScale;
  const sheetH = size * 0.5 * glyphScale;
  const sheetLeft = cx - sheetW / 2;
  const sheetTop = cy - sheetH / 2;
  const sheetRadius = size * 0.05;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (size * y + x) << 2;
      const inBg = maskable
        ? true
        : insideRoundedRect(x, y, inset, inset, size - inset, size - inset, radius);
      if (!inBg) {
        png.data[i + 3] = 0;
        continue;
      }
      const t = (x / size + y / size) / 2;
      png.data[i] = Math.round(124 + (91 - 124) * t);
      png.data[i + 1] = Math.round(108 + (79 - 108) * t);
      png.data[i + 2] = Math.round(246 + (214 - 246) * t);
      png.data[i + 3] = 255;

      const inSheet = insideRoundedRect(
        x,
        y,
        sheetLeft,
        sheetTop,
        sheetLeft + sheetW,
        sheetTop + sheetH,
        sheetRadius,
      );
      if (inSheet) {
        png.data[i] = 250;
        png.data[i + 1] = 249;
        png.data[i + 2] = 252;
        const lineTop = sheetTop + sheetH * 0.26;
        const lineGap = sheetH * 0.2;
        const lineHeight = Math.max(2, sheetH * 0.055);
        for (let line = 0; line < 3; line += 1) {
          const top = lineTop + line * lineGap;
          const inLine =
            y >= top &&
            y <= top + lineHeight &&
            x >= sheetLeft + sheetW * 0.16 &&
            x <= sheetLeft + sheetW * (line === 2 ? 0.62 : 0.84);
          if (inLine) {
            png.data[i] = 91;
            png.data[i + 1] = 79;
            png.data[i + 2] = 214;
          }
        }
      }
    }
  }
  return PNG.sync.write(png);
}

writeFileSync(OUT_DIR + '/icon-192.png', createIcon(192, false));
writeFileSync(OUT_DIR + '/icon-512.png', createIcon(512, false));
writeFileSync(OUT_DIR + '/maskable-512.png', createIcon(512, true));
console.log('icons generated');
