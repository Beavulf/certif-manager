/**
 * Standalone entry for production.
 *
 * Next.js 16 + `output: 'standalone'` often skips instrumentation.ts and may not
 * even ship a usable instrumentation.js chunk. Instead of requiring that file,
 * we start the Next server and hit /api/health to bootstrap cron in-process.
 *
 * Usage (from release / .next/standalone):
 *   node standalone-start.cjs
 */
const http = require('http');
const path = require('path');

const port = Number(process.env.PORT || 3003);
const warmupPath = '/api/health';
const warmupAttempts = 40;
const warmupDelayMs = 1000;

function requestHealth() {
  return new Promise((resolve) => {
    const req = http.get(
      {
        host: '127.0.0.1',
        port,
        path: warmupPath,
        timeout: 5000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode || 0, body });
        });
      },
    );

    req.on('error', (error) => {
      resolve({ statusCode: 0, body: '', error });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ statusCode: 0, body: '', error: new Error('timeout') });
    });
  });
}

async function warmupBackgroundJobs() {
  for (let attempt = 1; attempt <= warmupAttempts; attempt += 1) {
    const result = await requestHealth();
    if (result.statusCode === 200) {
      console.log(
        `[BOOT] Background jobs ready (${warmupPath}, attempt ${attempt})`,
      );
      return;
    }

    const detail =
      result.error?.message ||
      result.body ||
      `HTTP ${result.statusCode || 'no response'}`;
    console.log(
      `[BOOT] Waiting for app/cron… ${attempt}/${warmupAttempts} (${detail})`,
    );
    await new Promise((r) => setTimeout(r, warmupDelayMs));
  }

  console.error(
    '[BOOT] Warmup failed. Open the app in browser once — cron starts on first request.',
  );
}

function main() {
  console.log(`[BOOT] Starting Next standalone server on port ${port}…`);
  // Side-effect: binds HTTP server and keeps the process alive.
  // eslint-disable-next-line import/no-dynamic-require, global-require
  require(path.join(__dirname, 'server.js'));

  // Do not await in a way that blocks — fire warmup after server module loads.
  setTimeout(() => {
    warmupBackgroundJobs().catch((error) => {
      console.error('[BOOT] Warmup error:', error);
    });
  }, 1500);
}

main();
