const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

/**
 * RollBowl Kitchen Icon Generator
 * Generates dark-charcoal operational icons with a restrained spatula/kitchen badge
 * from existing RollBowl assets, without modifying customer source assets.
 */

const BG_CHARCOAL = [15, 17, 23, 255];       // #0F1117
const BADGE_ORANGE = [245, 166, 35, 255];    // #F5A623
const WHITE = [255, 255, 255, 255];

function loadPng(filePath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(new PNG())
      .on('parsed', function() { resolve(this); })
      .on('error', reject);
  });
}

function savePng(png, filePath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    png.pack()
      .pipe(fs.createWriteStream(filePath))
      .on('finish', resolve)
      .on('error', reject);
  });
}

function drawSolidRect(png, x1, y1, w, h, color) {
  for (let y = y1; y < y1 + h; y++) {
    for (let x = x1; x < x1 + w; x++) {
      if (x >= 0 && x < png.width && y >= 0 && y < png.height) {
        const idx = (png.width * y + x) << 2;
        png.data[idx] = color[0];
        png.data[idx + 1] = color[1];
        png.data[idx + 2] = color[2];
        png.data[idx + 3] = color[3];
      }
    }
  }
}

function drawBadge(png, scale) {
  // Draw a clean rounded badge with a spatula notch silhouette at the bottom right of safe zone
  const width = png.width;
  const badgeSize = Math.round(width * 0.18); // 18% of icon size
  const cx = Math.round(width * 0.72);
  const cy = Math.round(width * 0.72);
  const radius = badgeSize / 2;

  // Draw orange circular/rounded badge
  for (let y = Math.round(cy - radius); y <= Math.round(cy + radius); y++) {
    for (let x = Math.round(cx - radius); x <= Math.round(cx + radius); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        if (x >= 0 && x < png.width && y >= 0 && y < png.height) {
          const idx = (png.width * y + x) << 2;
          // Soft border / solid badge
          png.data[idx] = BADGE_ORANGE[0];
          png.data[idx + 1] = BADGE_ORANGE[1];
          png.data[idx + 2] = BADGE_ORANGE[2];
          png.data[idx + 3] = 255;
        }
      }
    }
  }

  // Draw spatula silhouette notch inside badge (white)
  const spW = Math.round(badgeSize * 0.45);
  const spH = Math.round(badgeSize * 0.12);
  const handleW = Math.round(badgeSize * 0.12);
  const handleH = Math.round(badgeSize * 0.4);

  // Spatula head
  drawSolidRect(
    png,
    Math.round(cx - spW / 2),
    Math.round(cy - spH * 1.5),
    spW,
    spH,
    WHITE
  );
  // Spatula handle
  drawSolidRect(
    png,
    Math.round(cx - handleW / 2),
    Math.round(cy - spH * 0.5),
    handleW,
    handleH,
    WHITE
  );
}

async function generateAll() {
  console.log('Loading source foreground asset...');
  const fgSource = await loadPng('./assets/images/android-icon-foreground.png'); // 512x512

  // 1. Kitchen Adaptive Background (512x512 solid charcoal)
  const adaptBg = new PNG({ width: 512, height: 512 });
  drawSolidRect(adaptBg, 0, 0, 512, 512, BG_CHARCOAL);
  await savePng(adaptBg, './assets/images/kitchen-adaptive-background.png');
  console.log('Generated kitchen-adaptive-background.png (512x512)');

  // 2. Kitchen Adaptive Foreground (512x512 transparent with logo + badge)
  const adaptFg = new PNG({ width: 512, height: 512 });
  fgSource.data.copy(adaptFg.data);
  drawBadge(adaptFg, 1);
  await savePng(adaptFg, './assets/images/kitchen-adaptive-foreground.png');
  console.log('Generated kitchen-adaptive-foreground.png (512x512)');

  // 3. Kitchen Icon (1024x1024)
  const icon1024 = new PNG({ width: 1024, height: 1024 });
  drawSolidRect(icon1024, 0, 0, 1024, 1024, BG_CHARCOAL);

  // Scale 512x512 fg onto 1024x1024 (2x nearest/bilinear clean upscale)
  for (let y = 0; y < 1024; y++) {
    for (let x = 0; x < 1024; x++) {
      const srcX = Math.floor(x / 2);
      const srcY = Math.floor(y / 2);
      const srcIdx = (512 * srcY + srcX) << 2;
      const dstIdx = (1024 * y + x) << 2;
      const alpha = fgSource.data[srcIdx + 3] / 255;

      // Blend foreground over solid charcoal
      icon1024.data[dstIdx] = Math.round(fgSource.data[srcIdx] * alpha + BG_CHARCOAL[0] * (1 - alpha));
      icon1024.data[dstIdx + 1] = Math.round(fgSource.data[srcIdx + 1] * alpha + BG_CHARCOAL[1] * (1 - alpha));
      icon1024.data[dstIdx + 2] = Math.round(fgSource.data[srcIdx + 2] * alpha + BG_CHARCOAL[2] * (1 - alpha));
      icon1024.data[dstIdx + 3] = 255;
    }
  }
  drawBadge(icon1024, 2);
  await savePng(icon1024, './assets/images/kitchen-icon.png');
  console.log('Generated kitchen-icon.png (1024x1024)');

  // 4. Kitchen Splash Icon (1024x1024 transparent logo + badge)
  const splash1024 = new PNG({ width: 1024, height: 1024 });
  for (let y = 0; y < 1024; y++) {
    for (let x = 0; x < 1024; x++) {
      const srcX = Math.floor(x / 2);
      const srcY = Math.floor(y / 2);
      const srcIdx = (512 * srcY + srcX) << 2;
      const dstIdx = (1024 * y + x) << 2;
      splash1024.data[dstIdx] = fgSource.data[srcIdx];
      splash1024.data[dstIdx + 1] = fgSource.data[srcIdx + 1];
      splash1024.data[dstIdx + 2] = fgSource.data[srcIdx + 2];
      splash1024.data[dstIdx + 3] = fgSource.data[srcIdx + 3];
    }
  }
  drawBadge(splash1024, 2);
  await savePng(splash1024, './assets/images/kitchen-splash-icon.png');
  console.log('Generated kitchen-splash-icon.png (1024x1024)');

  // 5. Kitchen Favicon (48x48)
  const fav48 = new PNG({ width: 48, height: 48 });
  for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
      const srcX = Math.floor((x / 48) * 512);
      const srcY = Math.floor((y / 48) * 512);
      const srcIdx = (512 * srcY + srcX) << 2;
      const dstIdx = (48 * y + x) << 2;
      const alpha = fgSource.data[srcIdx + 3] / 255;
      fav48.data[dstIdx] = Math.round(fgSource.data[srcIdx] * alpha + BG_CHARCOAL[0] * (1 - alpha));
      fav48.data[dstIdx + 1] = Math.round(fgSource.data[srcIdx + 1] * alpha + BG_CHARCOAL[1] * (1 - alpha));
      fav48.data[dstIdx + 2] = Math.round(fgSource.data[srcIdx + 2] * alpha + BG_CHARCOAL[2] * (1 - alpha));
      fav48.data[dstIdx + 3] = 255;
    }
  }
  await savePng(fav48, './assets/images/kitchen-favicon.png');
  console.log('Generated kitchen-favicon.png (48x48)');
}

generateAll().catch(console.error);
