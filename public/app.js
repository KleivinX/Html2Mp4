// html2mp4 frontend

let presets = {};
let selectedPreset = 'youtube';
let selectedFiles = null;
let currentJobId = null;
let pollInterval = null;

// DOM
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const clearFile = document.getElementById('clearFile');
const presetGrid = document.getElementById('presetGrid');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const fpsInput = document.getElementById('fpsInput');
const durationInput = document.getElementById('durationInput');
const qualitySelect = document.getElementById('qualitySelect');
const outputName = document.getElementById('outputName');
const frameCount = document.getElementById('frameCount');
const renderEstimate = document.getElementById('renderEstimate');
const renderBtn = document.getElementById('renderBtn');
const progressSection = document.getElementById('progressSection');
const progressTitle = document.getElementById('progressTitle');
const progressBar = document.getElementById('progressBar');
const walker = document.getElementById('walker');
const progressPercent = document.getElementById('progressPercent');
const progressPhase = document.getElementById('progressPhase');
const logBox = document.getElementById('logBox');
const cancelBtn = document.getElementById('cancelBtn');
const completeSection = document.getElementById('completeSection');
const completePath = document.getElementById('completePath');
const completeTime = document.getElementById('completeTime');
const openFileBtn = document.getElementById('openFileBtn');
const openFolderBtn = document.getElementById('openFolderBtn');
const newExportBtn = document.getElementById('newExportBtn');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');
const errorLogBox = document.getElementById('errorLogBox');
const retryBtn = document.getElementById('retryBtn');
const healthBtn = document.getElementById('healthBtn');
const healthModal = document.getElementById('healthModal');
const healthContent = document.getElementById('healthContent');
const closeHealth = document.getElementById('closeHealth');
const openOutputBtn = document.getElementById('openOutputBtn');
const hideControls = document.getElementById('hideControls');

// Init
async function init() {
  const res = await fetch('/api/presets');
  presets = await res.json();
  renderPresets();

  // Load saved settings
  try {
    const settings = await (await fetch('/api/settings')).json();
    if (settings.preset && presets[settings.preset]) {
      selectPreset(settings.preset);
    }
    if (settings.quality) qualitySelect.value = settings.quality;
    if (settings.outputName) outputName.value = settings.outputName;
  } catch {}

  updateEstimates();
}

// Presets
function renderPresets() {
  presetGrid.innerHTML = '';
  for (const [key, preset] of Object.entries(presets)) {
    const card = document.createElement('div');
    card.className = `preset-card ${key === selectedPreset ? 'active' : ''}`;
    card.dataset.key = key;
    card.innerHTML = `
      <div class="preset-icon">${preset.icon}</div>
      <div class="preset-name">${preset.name}</div>
      <div class="preset-desc">${key !== 'custom' ? `${preset.width}×${preset.height}` : preset.description}</div>
    `;
    card.addEventListener('click', () => selectPreset(key));
    presetGrid.appendChild(card);
  }
}

function selectPreset(key) {
  selectedPreset = key;
  const preset = presets[key];

  document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
  document.querySelector(`.preset-card[data-key="${key}"]`)?.classList.add('active');

  if (key !== 'custom') {
    widthInput.value = preset.width;
    heightInput.value = preset.height;
    fpsInput.value = preset.fps;
    durationInput.value = preset.duration;
  }

  // All fields stay editable; presets just prefill the values.
  updateEstimates();
}

// Estimates
function updateEstimates() {
  const fps = parseInt(fpsInput.value) || 30;
  const dur = parseFloat(durationInput.value) || 10;
  const frames = Math.ceil(fps * dur);
  const estimatedSec = Math.ceil(frames * 0.15);
  frameCount.textContent = `${frames} frames`;
  renderEstimate.textContent = `~${estimatedSec}s estimated`;
}

// When the user edits a value away from the active preset, switch to Custom.
function onSettingEdit() {
  if (selectedPreset !== 'custom') {
    const p = presets[selectedPreset];
    if (p && (parseInt(widthInput.value) !== p.width ||
              parseInt(heightInput.value) !== p.height ||
              parseInt(fpsInput.value) !== p.fps ||
              parseFloat(durationInput.value) !== p.duration)) {
      selectedPreset = 'custom';
      document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
      document.querySelector('.preset-card[data-key="custom"]')?.classList.add('active');
    }
  }
  updateEstimates();
}

widthInput.addEventListener('input', onSettingEdit);
heightInput.addEventListener('input', onSettingEdit);
fpsInput.addEventListener('input', onSettingEdit);
durationInput.addEventListener('input', onSettingEdit);

// File handling
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', () => {
  handleFiles(fileInput.files);
});

function handleFiles(files) {
  if (!files || files.length === 0) return;
  selectedFiles = files;
  const htmlFile = Array.from(files).find(f => f.name.endsWith('.html') || f.name.endsWith('.htm'));
  const displayName = htmlFile ? htmlFile.name : `${files.length} files`;
  fileName.textContent = displayName;
  fileInfo.style.display = 'flex';
  dropZone.style.display = 'none';
  renderBtn.disabled = false;

  if (!outputName.value) {
    const base = htmlFile ? htmlFile.name.replace(/\.(html|htm)$/, '') : 'export';
    outputName.value = base;
  }
}

clearFile.addEventListener('click', () => {
  selectedFiles = null;
  fileInput.value = '';
  fileInfo.style.display = 'none';
  dropZone.style.display = '';
  renderBtn.disabled = true;
});

// Render

// Fills the bar and walks the mascot along it. `--p` is a 0→1 number the
// stylesheet turns into his left offset, so both stay in lockstep.
function setProgress(pct) {
  const p = Math.max(0, Math.min(100, pct || 0));
  progressBar.style.width = `${p}%`;
  walker.style.setProperty('--p', p / 100);
}

renderBtn.addEventListener('click', startRender);

async function startRender() {
  if (!selectedFiles) return;

  // Prepare form data
  const formData = new FormData();
  for (const file of selectedFiles) {
    formData.append('files', file);
  }

  const config = {
    preset: selectedPreset,
    width: parseInt(widthInput.value),
    height: parseInt(heightInput.value),
    fps: parseInt(fpsInput.value),
    duration: parseFloat(durationInput.value),
    quality: qualitySelect.value,
    outputName: outputName.value || `html2mp4-${Date.now()}`,
    hideControls: hideControls.checked,
  };
  formData.append('config', JSON.stringify(config));

  // Show progress
  renderBtn.style.display = 'none';
  progressSection.style.display = '';
  completeSection.style.display = 'none';
  errorSection.style.display = 'none';
  progressBar.style.width = '0%';
  setProgress(0);
  progressPercent.textContent = '0%';
  progressTitle.textContent = 'Rendering...';
  progressPhase.textContent = 'Starting...';
  logBox.textContent = '';
  // Rendering is CPU-bound, so give it the cycles the backdrop was using.
  backdrop.pause();

  try {
    const res = await fetch('/api/render', { method: 'POST', body: formData });
    const data = await res.json();

    if (data.error) {
      showError(data.error, []);
      return;
    }

    currentJobId = data.jobId;
    pollJob();
  } catch (err) {
    showError(err.message, []);
  }
}

function pollJob() {
  if (pollInterval) clearInterval(pollInterval);

  pollInterval = setInterval(async () => {
    if (!currentJobId) return;

    try {
      const res = await fetch(`/api/job/${currentJobId}`);
      const job = await res.json();

      setProgress(job.progress);
      progressPercent.textContent = `${job.progress}%`;

      if (job.progress <= 50) {
        progressPhase.textContent = 'Capturing frames';
        progressTitle.textContent = 'Rendering...';
      } else {
        progressPhase.textContent = 'Encoding video';
        progressTitle.textContent = 'Encoding...';
      }

      logBox.textContent = job.logs.join('\n');
      logBox.scrollTop = logBox.scrollHeight;

      if (job.status === 'complete') {
        clearInterval(pollInterval);
        showComplete(job);
      } else if (job.status === 'error') {
        clearInterval(pollInterval);
        showError(job.error, job.logs);
      } else if (job.status === 'cancelled') {
        clearInterval(pollInterval);
        resetUI();
      }
    } catch {}
  }, 500);
}

cancelBtn.addEventListener('click', async () => {
  if (!currentJobId) return;
  await fetch(`/api/job/${currentJobId}/cancel`, { method: 'POST' });
  clearInterval(pollInterval);
  resetUI();
});

function showComplete(job) {
  backdrop.resume();
  progressSection.style.display = 'none';
  completeSection.style.display = '';
  completePath.textContent = job.outputPath;
  completeTime.textContent = `Completed in ${job.duration}s`;

  openFileBtn.onclick = () => {
    fetch('/api/open-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: job.outputPath })
    });
  };

  openFolderBtn.onclick = () => {
    fetch('/api/open-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderPath: job.outputDir })
    });
  };
}

newExportBtn.addEventListener('click', resetUI);

function showError(message, logs) {
  backdrop.resume();
  progressSection.style.display = 'none';
  errorSection.style.display = '';
  errorMessage.textContent = message;
  errorLogBox.textContent = (logs || []).join('\n');
}

retryBtn.addEventListener('click', () => {
  errorSection.style.display = 'none';
  resetUI();
});

function resetUI() {
  backdrop.resume();
  progressSection.style.display = 'none';
  completeSection.style.display = 'none';
  errorSection.style.display = 'none';
  renderBtn.style.display = '';
  setProgress(0);
  currentJobId = null;
}

// Health check
healthBtn.addEventListener('click', async () => {
  healthModal.style.display = 'flex';
  healthContent.innerHTML = 'Checking dependencies...';

  try {
    const res = await fetch('/api/health');
    const data = await res.json();

    healthContent.innerHTML = `
      <div class="${data.node ? 'health-ok' : 'health-fail'}">
        ${data.node ? '✅' : '❌'} Node.js
      </div>
      <div class="${data.ffmpeg ? 'health-ok' : 'health-fail'}">
        ${data.ffmpeg ? '✅' : '❌'} FFmpeg ${data.ffmpegPath ? `<small style="color:var(--cream-mute)">(${data.ffmpegPath})</small>` : ''}
      </div>
      <div class="${data.browser ? 'health-ok' : 'health-fail'}">
        ${data.browser ? '✅' : '❌'} ${data.engine || 'Rendering engine'}
        ${data.browserError ? `<br><small style="color:var(--cream-mute)">${data.browserError}</small>` : ''}
      </div>
      <div style="margin-top:12px;padding-top:12px;border-top:3px solid var(--cream-mute);font-family:var(--display);letter-spacing:.5px;${data.allGood ? 'color:var(--orange)' : 'color:var(--alarm)'}">
        ${data.allGood ? '✅ All good, ready to export!' : '⚠️ Fix missing dependencies above'}
      </div>
    `;
  } catch (err) {
    healthContent.innerHTML = `<div class="health-fail">Could not check: ${err.message}</div>`;
  }
});

closeHealth.addEventListener('click', () => {
  healthModal.style.display = 'none';
});
healthModal.addEventListener('click', (e) => {
  if (e.target === healthModal) healthModal.style.display = 'none';
});

// Open the output folder (to browse previously rendered videos)
openOutputBtn.addEventListener('click', () => {
  fetch('/api/open-output', { method: 'POST' }).catch(() => {});
});

// Rubber-hose backdrop: a slow sunburst behind a drifting halftone screen,
// the two things every 1930s cartoon cel had going on behind the character.
function initBackdrop() {
  const canvas = document.getElementById('bgParticles');
  if (!canvas) return { pause() {}, resume() {} };

  const ctx = canvas.getContext('2d');
  const RAYS = 16;
  const DOT_STEP = 30;
  const FRAME_MS = 1000 / 24;   // the backdrop never needs 60fps
  let w, h, dpr, cx, cy, radius;
  let running = false, raf = 0, last = 0, t = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = window.innerWidth * dpr;
    h = canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    cx = w * 0.5;
    cy = h * 0.3;
    radius = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));
    draw(0);
  }

  function draw(dt) {
    t += dt;
    ctx.clearRect(0, 0, w, h);

    // Sunburst wedges, turning about once every four minutes.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.000026);
    ctx.fillStyle = 'rgba(241, 114, 23, 0.055)';
    const step = (Math.PI * 2) / RAYS;
    for (let i = 0; i < RAYS; i++) {
      const a0 = i * step;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, a0, a0 + step * 0.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Halftone screen: dots grow towards the edges, like a printed gradient.
    const stepPx = DOT_STEP * dpr;
    const drift = (t * 0.006) % stepPx;
    ctx.fillStyle = 'rgba(253, 251, 246, 0.05)';
    for (let y = -stepPx + drift; y < h + stepPx; y += stepPx) {
      for (let x = -stepPx + drift; x < w + stepPx; x += stepPx) {
        const d = Math.hypot(x - cx, y - cy) / radius;
        const r = (0.4 + d * 1.9) * dpr;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Keep the middle of the page dark enough to read against.
    const vignette = ctx.createRadialGradient(cx, cy, radius * 0.15, cx, cy, radius);
    vignette.addColorStop(0, 'rgba(11, 10, 8, 0)');
    vignette.addColorStop(1, 'rgba(11, 10, 8, 0.75)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }

  function loop(now) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const dt = now - last;
    if (dt < FRAME_MS) return;
    last = now;
    draw(dt);
  }

  const api = {
    pause() {
      running = false;
      cancelAnimationFrame(raf);
    },
    resume() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    },
  };

  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) api.pause(); else api.resume();
  });
  api.resume();
  return api;
}

// Init
const backdrop = initBackdrop();
init();
