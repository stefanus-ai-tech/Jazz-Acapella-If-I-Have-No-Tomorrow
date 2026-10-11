// Preview helper: bundle once, render small stills for the given frames -> out/stills/sNN.jpg
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const frames = process.argv.slice(2).map(Number);
fs.mkdirSync('out/stills', {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browser = await openBrowser('chrome');
const composition = await selectComposition({serveUrl, id: 'MV', puppeteerInstance: browser});
for (const [i, frame] of frames.entries()) {
  await renderStill({serveUrl, composition, frame, output: `out/stills/s${String(i).padStart(2, '0')}.jpg`, imageFormat: 'jpeg', scale: 0.3, puppeteerInstance: browser});
}
await browser.close({silent: true});
