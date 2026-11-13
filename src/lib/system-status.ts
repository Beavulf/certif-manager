import dayjs from '@/lib/dayjs-config';
import prisma from '@/lib/prisma';
import minioClient, { BUCKET } from '@/minio/minio';
import { appSettingsService } from '@/server/services/app-settings-service';
import { auditlogService } from '@/server/services/auditlog-service';
import type { SystemStatus } from '@/types/settings-types';

function describeNextCronRun(time: string, timezone: string): string {
  const [hourStr, minuteStr] = time.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  const now = new Date();
  const formatter = new Intl.DateTimeFormat('ru-RU', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const currentHour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const currentMinute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);

  const currentTotal = currentHour * 60 + currentMinute;
  const targetTotal = hour * 60 + minute;
  const isToday = currentTotal < targetTotal;

  return isToday
    ? `Сегодня в ${time} (${timezone})`
    : `Завтра в ${time} (${timezone})`;
}

function minioErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

/**
 * Читающая проба хранилища: statObject по (обычно отсутствующему) ключу.
 * Ответ S3 NotFound означает, что API хранилища отвечает и бакет читается —
 * это ровно тот путь, который используется при скачивании файлов.
 * bucketExists такой путь не проверяет.
 */
async function probeMinioRead(): Promise<{ ok: boolean; message: string }> {
  const exists = await minioClient.bucketExists(BUCKET);
  if (!exists) {
    return { ok: false, message: `Бакет «${BUCKET}» не найден` };
  }

  try {
    await minioClient.statObject(BUCKET, 'healthcheck/probe');
    return { ok: true, message: `Бакет «${BUCKET}» доступен, чтение работает` };
  } catch (probeError) {
    const code = minioErrorCode(probeError);
    if (code === 'NotFound' || code === 'NoSuchKey') {
      return { ok: true, message: `Бакет «${BUCKET}» доступен, чтение работает` };
    }
    if (code === 'AccessDenied') {
      return {
        ok: false,
        message: 'Хранилище отвечает, но отказывает в доступе (проверьте MINIO_ACCESS_KEY/SECRET_KEY)',
      };
    }
    return {
      ok: false,
      message:
        probeError instanceof Error
          ? `Бакет существует, но чтение не работает: ${probeError.message}`
          : 'Ошибка чтения из хранилища',
    };
  }
}

/**
 * Дата последней автоматической cron-проверки — по audit-логу.
 * checkExpiringCertificates пишет запись «Автоматическая проверка: …» при каждом
 * запуске (включая catch-up после простоя), так что это фактический признак работы.
 */
async function getLastCronCheck(
  timezone: string,
): Promise<{ at: string | null; ok: boolean; message: string }> {
  const [latest] = await auditlogService.findMany({
    where: {
      action: 'sendNotification',
      displayName: { startsWith: 'Автоматическая проверка' },
    },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });

  if (!latest) {
    return { at: null, ok: false, message: 'Автоматические проверки ещё не выполнялись' };
  }

  const at = dayjs(latest.createdAt).tz(timezone);
  const hoursAgo = dayjs().diff(at, 'hour');
  const formatted = at.format('DD.MM.YYYY HH:mm');

  // Суточный слот + запас на catch-up в тот же день.
  if (hoursAgo > 26) {
    return {
      at: latest.createdAt.toISOString(),
      ok: false,
      message: `Последняя проверка была ${formatted} — больше суток назад`,
    };
  }

  return {
    at: latest.createdAt.toISOString(),
    ok: true,
    message: `Последняя проверка: ${formatted}`,
  };
}

const STATUS_CACHE_TTL_MS = 30_000;

let statusCache: { at: number; status: SystemStatus } | null = null;
let statusCachePromise: Promise<SystemStatus> | null = null;

/**
 * Статус системы запрашивается при каждом рендере «Обзора» и его авто-обновлениях.
 * Пробы MinIO/БД — сетевые вызовы, поэтому кэшируем результат на короткий TTL
 * и схлопываем параллельные запросы в один. force=true (кнопка «Обновить»)
 * игнорирует кэш и делает свежие пробы.
 */
export async function getSystemStatus(force = false): Promise<SystemStatus> {
  if (!force) {
    if (statusCache && Date.now() - statusCache.at < STATUS_CACHE_TTL_MS) {
      return statusCache.status;
    }

    if (statusCachePromise) {
      return statusCachePromise;
    }
  }

  statusCachePromise = computeSystemStatus().finally(() => {
    statusCachePromise = null;
  });

  const status = await statusCachePromise;
  statusCache = { at: Date.now(), status };
  return status;
}

async function computeSystemStatus(): Promise<SystemStatus> {
  const settings = await appSettingsService.getOrCreate();

  let database = { ok: false, message: 'Нет соединения' };
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = { ok: true, message: 'PostgreSQL доступна' };
  } catch (error) {
    database = {
      ok: false,
      message:
        error instanceof Error ? error.message : 'Ошибка подключения к БД',
    };
  }

  let minio = { ok: false, message: 'Нет соединения' };
  try {
    minio = await probeMinioRead();
  } catch (error) {
    minio = {
      ok: false,
      message:
        error instanceof Error ? error.message : 'Ошибка подключения к MinIO',
    };
  }

  let lastCronCheck: SystemStatus['cron']['lastCheck'] = {
    at: null,
    ok: false,
    message: 'Неизвестно',
  };
  try {
    lastCronCheck = await getLastCronCheck(settings.timezone);
  } catch {
    // Нет доступа к audit-логу — не валим весь статус, показываем «Неизвестно».
  }

  return {
    database,
    minio,
    cron: {
      checkTime: settings.cronCheckTime,
      timezone: settings.timezone,
      nextDescription: describeNextCronRun(
        settings.cronCheckTime,
        settings.timezone,
      ),
      lastCheck: lastCronCheck,
    },
  };
}
