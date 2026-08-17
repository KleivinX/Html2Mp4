import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

console.log('html2mp4 dependency check\n');

const checks = [];

// Node version
const nodeMajor = parseInt(process.version.slice(1));
checks.push({
  name: 'Node.js',
  ok: nodeMajor >= 18,
  detail: nodeMajor >= 18 ? `${process.version} ✓` : `${process.version} (need v18+)`,
});

// FFmpeg (bundled binary used for encoding)
try {
  const ffmpegPath = (await import('ffmpeg-static')).default;
  const exists = !!ffmpegPath && fs.existsSync(ffmpegPath);
  checks.push({ name: 'FFmpeg', ok: exists, detail: exists ? `${ffmpegPath} ✓` : 'binary not found' });
} catch {
  checks.push({ name: 'FFmpeg', ok: false, detail: 'ffmpeg-static not installed. Run: npm install' });
}

// Electron (the runtime + the Chromium used for rendering)
try {
  const electronPath = require('electron');
  const exists = typeof electronPath === 'string' && fs.existsSync(electronPath);
  checks.push({ name: 'Electron', ok: exists, detail: exists ? `${electronPath} ✓` : 'binary not found' });
} catch {
  checks.push({ name: 'Electron', ok: false, detail: 'not installed. Run: npm install' });
}

console.log('Results:');
for (const c of checks) console.log(`  ${c.ok ? '✅' : '❌'} ${c.name}: ${c.detail}`);

const allGood = checks.every((c) => c.ok);
console.log('');
console.log(allGood ? 'All dependencies OK. Run the app with: npm start' : 'Some dependencies are missing. Run: npm install');
process.exit(allGood ? 0 : 1);
