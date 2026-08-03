const fs = require('fs');
const { PNG } = require('pngjs');

function inspectPng(filePath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(new PNG())
      .on('parsed', function() {
        console.log(`${filePath}: ${this.width}x${this.height}`);
        // Check corners and center pixels
        const idxCenter = ((this.width >> 1) * this.width + (this.width >> 1)) << 2;
        const idxTopLeft = 0;
        console.log(`TopLeft pixel RGBA: [${this.data[idxTopLeft]}, ${this.data[idxTopLeft+1]}, ${this.data[idxTopLeft+2]}, ${this.data[idxTopLeft+3]}]`);
        console.log(`Center pixel RGBA: [${this.data[idxCenter]}, ${this.data[idxCenter+1]}, ${this.data[idxCenter+2]}, ${this.data[idxCenter+3]}]`);
        resolve();
      })
      .on('error', reject);
  });
}

async function main() {
  await inspectPng('./assets/images/icon.png');
  await inspectPng('./assets/images/android-icon-foreground.png');
  await inspectPng('./assets/images/android-icon-background.png');
  await inspectPng('./assets/images/splash-icon.png');
}

main().catch(console.error);
