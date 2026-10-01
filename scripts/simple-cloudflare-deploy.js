import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const updatesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs/updates');
for (const filename of ['index.html', 'onemed-logo.png', 'latest.yml', 'latest.json']) {
  if (!fs.existsSync(path.join(updatesDir, filename))) {
    throw new Error(`Missing download page asset: ${filename}`);
  }
}
console.log('Cloudflare Pages serves docs/updates from main. The download page is ready.');
console.log('For a new binary release, run npm run release:prepare after building the installers.');
console.log(
  'This command preserves the page and update metadata; it does not publish a deployment.'
);
