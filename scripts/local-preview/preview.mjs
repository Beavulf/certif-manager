// Локальное превью cert-manager на dev-машине (без доступа к серверу).
//
//   node scripts/local-preview/preview.mjs start   — поднять всё и открыть на :3010
//   node scripts/local-preview/preview.mjs stop    — остановить превью-процессы
//
// Что делает start:
//   1. поднимает контейнеры cert-manager-db (:54320) и cert-manager-minio (:9100);
//   2. запускает стаб AD-авторизации на :3005 (любой логин/пароль);
//   3. запускает next start на :3010 с переменными окружения поверх .env.
// Демо-данные заливаются один раз скриптом seed.ts (см. README.md).
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../..');

function readEnv() {
  const file = fs.readFileSync(path.join(root, '.env'), 'utf8');
  const get = (key) => {
    const line = file.split(/\r?\n/).find((l) => l.startsWith(key + '='));
    return line ? line.split('=').slice(1).join('=').trim() : '';
  };
  const dbUrl = new URL(get('DB_URL'));
  dbUrl.port = '54320';
  return {
    DB_URL: dbUrl.toString(),
    MINIO_ENDPOINT: 'localhost',
    MINIO_PORT: '9100',
    MINIO_USE_SSL: get('MINIO_USE_SSL'),
    MINIO_BUCKET: get('MINIO_BUCKET'),
    MINIO_ACCESS_KEY: get('MINIO_ACCESS_KEY'),
    MINIO_SECRET_KEY: get('MINIO_SECRET_KEY'),
  };
}

function sh(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe' }).toString().trim();
  } catch {
    return '';
  }
}

function waitHealthy(url, tries = 30) {
  return new Promise((resolve) => {
    const tick = (left) => {
      http
        .get(url, () => resolve(true))
        .on('error', () => (left > 0 ? setTimeout(() => tick(left - 1), 1000) : resolve(false)));
    };
    tick(tries);
  });
}

async function start() {
  const env = readEnv();

  for (const name of ['cert-manager-db', 'cert-manager-minio']) {
    const state = sh(`docker inspect ${name} --format "{{.State.Status}}"`);
    if (state !== 'running') {
      console.log(`[preview] Запускаю контейнер ${name}…`);
      sh(`docker start ${name}`) || console.log(`[preview] ${name}: контейнера нет — создайте его (см. README.md)`);
    }
  }

  const auth = spawn('node', [path.join(root, 'scripts/local-preview/auth-mock.mjs')], {
    detached: true,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  auth.unref();
  console.log('[preview] Стаб авторизации: http://localhost:3005 (любой логин/пароль)');

  const appEnv = { ...process.env, ...env };
  const app = spawn('npx', ['next', 'start', '-p', '3010'], {
    cwd: root,
    env: appEnv,
    detached: true,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  app.unref();

  const ok = await waitHealthy('http://localhost:3010/login');
  console.log(
    ok
      ? '[preview] Готово: откройте http://localhost:3010 — вход с любым логином и паролем.'
      : '[preview] Приложение не ответило на :3010 — проверьте логи вручную.',
  );
}

function stop() {
  // next start и auth-mock: ищем процессы по командной строке
  const out = sh(
    'wmic process where "commandline like \'%next start -p 3010%\' or commandline like \'%auth-mock.mjs%\'" get processid',
  );
  const pids = out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^\d+$/.test(l));
  for (const pid of pids) {
    sh(`taskkill /F /PID ${pid}`);
    console.log(`[preview] Остановлен процесс ${pid}`);
  }
  sh('docker stop cert-manager-db cert-manager-minio');
  console.log('[preview] Контейнеры остановлены.');
}

const command = process.argv[2] ?? 'start';
if (command === 'start') await start();
else if (command === 'stop') stop();
else console.log('Использование: node scripts/local-preview/preview.mjs [start|stop]');
