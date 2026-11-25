// Writes public/poultry-guide.json from src/guidance/poultry-guide.js so the guide
// also works on static hosts (no /api) and is cached by the service worker.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getPoultryGuide } from '../src/guidance/poultry-guide.js';

const target = fileURLToPath(new URL('../public/poultry-guide.json', import.meta.url));
writeFileSync(target, `${JSON.stringify(getPoultryGuide(), null, 2)}\n`);
console.log(`Wrote ${target}`);
