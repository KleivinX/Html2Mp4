// Runs in the page's main world (contextIsolation:false) BEFORE page scripts.
// Freezes time so frames can be captured deterministically, and exposes
// window.__h2m_* controls that the Electron main process drives per frame.
(() => {
  let currentTime = 0;
  let callbacks = [];
  let nextId = 1;

  window.requestAnimationFrame = (cb) => {
    const id = nextId++;
    callbacks.push({ id, cb });
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    callbacks = callbacks.filter((c) => c.id !== id);
  };

  performance.now = () => currentTime;
  const startDate = Date.now();
  Date.now = () => startDate + currentTime;

  function flush() {
    if (document.getAnimations) {
      for (const a of document.getAnimations()) {
        try { a.currentTime = currentTime; } catch {}
      }
    }
    const pending = callbacks;
    callbacks = [];
    for (const { cb } of pending) {
      try { cb(currentTime); } catch (e) { /* noop */ }
    }
  }

  // Absolute seek (used by the probe) and per-frame advance (used by the renderer).
  window.__h2m_seek = (t) => { currentTime = t; flush(); return currentTime; };
  window.__h2m_advance = (dt) => { currentTime += dt; flush(); return currentTime; };
  window.__h2m_pause = () => {
    if (document.getAnimations) {
      for (const a of document.getAnimations()) { try { a.pause(); } catch {} }
    }
  };
  window.__h2m_time = () => currentTime;
})();
