import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { Encoder } from './encoder.js';
import { PRESETS } from './presets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3847;

// Rendering uses Electron's own Chromium, injected by the desktop shell — so no
// separate browser is ever bundled or downloaded. Run the app with `npm start`.
async function makeRenderer(opts) {
  if (globalThis.__h2m_createRenderer) return globalThis.__h2m_createRenderer(opts);
  throw new Error('No renderer available — launch the desktop app with: npm start');
}

// Settings persistence
const SETTINGS_PATH = path.join(os.homedir(), '.html2mp4-settings.json');

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
  } catch {}
}

// State
const activeJobs = new Map();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Upload config
const uploadDir = path.join(os.tmpdir(), 'html2mp4-uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const jobDir = path.join(uploadDir, `job-${Date.now()}`);
    fs.mkdirSync(jobDir, { recursive: true });
    req.jobDir = jobDir;
    cb(null, jobDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.html', '.htm', '.css', '.js', '.json', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.woff', '.woff2', '.ttf', '.otf', '.mp3', '.wav', '.ogg'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext) || file.mimetype.startsWith('text/'));
  }
});

// API Routes
app.get('/api/presets', (req, res) => {
  res.json(PRESETS);
});

app.get('/api/settings', (req, res) => {
  res.json(loadSettings());
});

app.post('/api/settings', (req, res) => {
  saveSettings(req.body);
  res.json({ ok: true });
});

app.post('/api/render', upload.array('files', 100), async (req, res) => {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const config = JSON.parse(req.body.config || '{}');

  const preset = PRESETS[config.preset] || PRESETS['youtube'];
  const width = config.width || preset.width;
  const height = config.height || preset.height;
  const fps = config.fps || preset.fps;
  const duration = config.duration || preset.duration;
  const quality = config.quality || 'standard';
  const outputName = config.outputName || `html2mp4-${Date.now()}`;
  const hideControls = config.hideControls !== false;

  // Determine input path
  let inputPath;
  if (config.localPath) {
    inputPath = config.localPath;
  } else if (req.files && req.files.length > 0) {
    const htmlFile = req.files.find(f => f.originalname.endsWith('.html') || f.originalname.endsWith('.htm'));
    if (!htmlFile) {
      return res.status(400).json({ error: 'No HTML file found in upload' });
    }
    inputPath = htmlFile.path;
  } else {
    return res.status(400).json({ error: 'No input file provided' });
  }

  // Determine output path
  const outputDir = config.outputDir || path.join(os.homedir(), 'html2mp4-output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${outputName}.mp4`);

  const job = {
    id: jobId,
    status: 'rendering',
    progress: 0,
    logs: [],
    outputPath: null,
    error: null,
    startTime: Date.now(),
  };
  activeJobs.set(jobId, job);

  res.json({ jobId });

  // Run async
  (async () => {
    const log = (msg) => {
      job.logs.push(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
    };

    try {
      const renderer = await makeRenderer({
        width, height, fps, duration, quality, hideControls,
        onProgress: (p) => { job.progress = p; },
        onLog: log,
      });
      const encoder = new Encoder({ fps, quality, onLog: log });

      job.renderer = renderer;
      job.encoder = encoder;

      // Spawn FFmpeg up front; frames are streamed straight into it as they render.
      const done = encoder.start(outputPath);
      done.catch(() => {}); // real reason surfaced via finish(); avoid unhandled rejection

      const result = await renderer.render(inputPath, {
        onFrame: (buf) => encoder.writeFrame(buf),
      });

      if (!result) {
        encoder.cancel();
        job.status = 'cancelled';
        return;
      }

      job.status = 'encoding';
      log('Finalizing video…');
      await encoder.finish();

      job.progress = 100;
      job.status = 'complete';
      job.outputPath = outputPath;
      job.outputDir = outputDir;
      job.duration = ((Date.now() - job.startTime) / 1000).toFixed(1);
      log(`Done in ${job.duration}s — ${outputPath}`);

      // Save last used settings
      saveSettings({ preset: config.preset, width, height, fps, duration, quality, outputDir, outputName });

    } catch (err) {
      job.status = 'error';
      job.error = err.message;
      log(`Error: ${err.message}`);
    }
  })();
});

app.get('/api/job/:id', (req, res) => {
  const job = activeJobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    logs: job.logs,
    outputPath: job.outputPath,
    outputDir: job.outputDir,
    error: job.error,
    duration: job.duration,
  });
});

app.post('/api/job/:id/cancel', (req, res) => {
  const job = activeJobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  job.renderer?.cancel();
  job.encoder?.cancel();
  job.status = 'cancelled';
  res.json({ ok: true });
});

app.post('/api/open-folder', (req, res) => {
  const { folderPath } = req.body;
  if (!folderPath) return res.status(400).json({ error: 'No path' });

  import('open').then(({ default: open }) => {
    open(folderPath);
    res.json({ ok: true });
  }).catch(() => res.status(500).json({ error: 'Could not open folder' }));
});

app.post('/api/open-file', (req, res) => {
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'No path' });

  import('open').then(({ default: open }) => {
    open(filePath);
    res.json({ ok: true });
  }).catch(() => res.status(500).json({ error: 'Could not open file' }));
});

// Open the default output folder (where rendered videos are saved).
app.post('/api/open-output', (req, res) => {
  const last = loadSettings();
  const outputDir = (last && last.outputDir) || path.join(os.homedir(), 'html2mp4-output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  import('open').then(({ default: open }) => {
    open(outputDir);
    res.json({ ok: true, outputDir });
  }).catch(() => res.status(500).json({ error: 'Could not open folder' }));
});

// Health check
app.get('/api/health', async (req, res) => {
  const checks = { node: true, ffmpeg: false, browser: false, engine: '' };

  try {
    const ffmpegPath = (await import('ffmpeg-static')).default;
    checks.ffmpeg = !!ffmpegPath && fs.existsSync(ffmpegPath);
    checks.ffmpegPath = ffmpegPath;
  } catch {}

  // Rendering uses Electron's own Chromium, injected by the desktop shell.
  checks.engine = 'Electron Chromium';
  if (globalThis.__h2m_createRenderer) {
    checks.browser = true;
  } else {
    checks.browserError = 'Renderer not available — launch the desktop app with: npm start';
  }

  checks.allGood = checks.node && checks.ffmpeg && checks.browser;
  // Legacy alias for the frontend.
  checks.playwright = checks.browser;
  checks.playwrightError = checks.browserError;
  res.json(checks);
});

app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║          html2mp4 is running          ║');
  console.log('  ╠══════════════════════════════════════╣');
  console.log(`  ║  → http://localhost:${PORT}              ║`);
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
});
