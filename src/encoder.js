import ffmpegStatic from 'ffmpeg-static';
import { spawn } from 'child_process';

// When packaged inside an Electron asar, the ffmpeg binary is unpacked to
// app.asar.unpacked, because binaries can't run from inside the asar archive.
const FFMPEG = ffmpegStatic && ffmpegStatic.includes('app.asar')
  ? ffmpegStatic.replace('app.asar', 'app.asar.unpacked')
  : ffmpegStatic;

/**
 * Streaming encoder.
 *
 * Instead of writing every frame to disk as a PNG and re-reading the whole
 * sequence afterwards, we spawn FFmpeg once reading an image stream from stdin
 * (image2pipe). The renderer writes each captured frame straight into FFmpeg,
 * so rendering and encoding overlap and there is zero intermediate disk I/O.
 */
export class Encoder {
  constructor(options = {}) {
    this.fps = options.fps || 30;
    this.quality = options.quality || 'standard';
    this.onLog = options.onLog || (() => {});
    this.process = null;
    this.donePromise = null;
    this.cancelled = false;
  }

  getCrf() {
    switch (this.quality) {
      case 'draft': return '28';
      case 'high': return '17';
      default: return '21';
    }
  }

  getPreset() {
    switch (this.quality) {
      case 'draft': return 'veryfast';
      case 'high': return 'slow';
      default: return 'medium';
    }
  }

  start(outputPath) {
    const args = [
      '-y',
      '-f', 'image2pipe',
      '-framerate', String(this.fps),
      '-i', 'pipe:0',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-crf', this.getCrf(),
      '-preset', this.getPreset(),
      '-movflags', '+faststart',
      // Guarantee even dimensions (required by yuv420p / H.264)
      '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',
      outputPath,
    ];

    this.onLog(`Encoding → ${outputPath}`);
    this.process = spawn(FFMPEG, args, { stdio: ['pipe', 'ignore', 'pipe'] });

    let stderrTail = '';
    this.process.stderr.on('data', (d) => {
      stderrTail = (stderrTail + d.toString()).slice(-2000);
    });

    this.donePromise = new Promise((resolve, reject) => {
      this.process.on('close', (code) => {
        this.process = null;
        if (this.cancelled) return reject(new Error('Encoding cancelled'));
        if (code === 0) resolve(outputPath);
        else reject(new Error(`FFmpeg exited with code ${code}:\n${stderrTail.slice(-600)}`));
      });
      this.process.on('error', (err) => {
        this.process = null;
        reject(new Error(`FFmpeg error: ${err.message}`));
      });
    });

    // Swallow EPIPE if the process dies while we're still writing.
    this.process.stdin.on('error', () => {});

    return this.donePromise;
  }

  /** Write one encoded frame (PNG or JPEG buffer), honoring backpressure. */
  writeFrame(buffer) {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin.writable) {
        return reject(new Error('Encoder stream is not writable'));
      }
      const ok = this.process.stdin.write(buffer);
      if (ok) resolve();
      else this.process.stdin.once('drain', resolve);
    });
  }

  /** Close the input stream and wait for FFmpeg to finish muxing. */
  async finish() {
    if (this.process && this.process.stdin.writable) {
      this.process.stdin.end();
    }
    return this.donePromise;
  }

  cancel() {
    this.cancelled = true;
    if (this.process) {
      try { this.process.stdin.destroy(); } catch {}
      this.process.kill('SIGKILL');
    }
  }
}
