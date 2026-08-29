import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ALPHA_THRESHOLD = 4;
const SAFE_PADDING = 24;
const assetDirectory = fileURLToPath(new URL('../public/assets/', import.meta.url));

const assets = [
  'drink_brend.png',
  'drink_iced-coffee.png',
  'drink_tea.png',
  'drink_cafe-latte-v1.png',
  'drink_cappuccino-v1.png',
  'drink_cafe-mocha-v1.png',
  'drink_espresso-v1.png',
  'drink_matcha-latte-v1.png',
  'drink_hot-chocolate-v1.png',
  'drink_cream-soda-v1.png',
  'food_cheese-cake.png',
  'food_coffee-jelly.png',
  'food_pudding.png',
  'food_butter-toast-v1.png',
  'food_croissant-v1.png',
  'food_egg-sandwich-v1.png',
  'food_pancakes-v1.png',
  'food_napolitan-v1.png',
  'food_tiramisu-v1.png',
  'food_fruit-tart-v1.png',
];

const findVisibleBounds = async (input) => {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha < ALPHA_THRESHOLD) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error(`No visible pixels found in ${input}`);
  }

  const left = Math.max(0, minX - SAFE_PADDING);
  const top = Math.max(0, minY - SAFE_PADDING);
  const right = Math.min(info.width - 1, maxX + SAFE_PADDING);
  const bottom = Math.min(info.height - 1, maxY + SAFE_PADDING);

  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
    sourceWidth: info.width,
    sourceHeight: info.height,
  };
};

await mkdir(assetDirectory, { recursive: true });

for (const filename of assets) {
  const input = `${assetDirectory}/${filename}`;
  const outputFilename = filename.replace(/\.png$/, '-trimmed.png');
  const output = `${assetDirectory}/${outputFilename}`;
  const bounds = await findVisibleBounds(input);

  await sharp(input)
    .extract({ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height })
    .png({ compressionLevel: 9 })
    .toFile(output);

  console.log(
    `${filename}: ${bounds.sourceWidth}x${bounds.sourceHeight} -> ${bounds.width}x${bounds.height} (${outputFilename})`,
  );
}
