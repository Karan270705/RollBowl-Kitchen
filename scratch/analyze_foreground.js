const fs = require('fs');
const { PNG } = require('pngjs');

function analyzeForeground(filePath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(new PNG())
      .on('parsed', function() {
        let minX = this.width, maxX = 0, minY = this.height, maxY = 0;
        let nonZero = 0;
        for (let y = 0; y < this.height; y++) {
          for (let x = 0; x < this.width; x++) {
            const idx = (this.width * y + x) << 2;
            const a = this.data[idx + 3];
            if (a > 10) {
              nonZero++;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        console.log(`${filePath}: nonZero=${nonZero}, bbox=(${minX},${minY})-(${maxX},${maxY})`);
        resolve();
      })
      .on('error', reject);
  });
}

async function main() {
  await analyzeForeground('./assets/images/android-icon-foreground.png');
  await analyzeForeground('./assets/images/splash-icon.png');
}

main().catch(console.error);
