import prisma from '@/lib/prisma';
import minioClient, { BUCKET } from '@/minio/minio';
import { appSettingsService } from '@/server/services/app-settings-service';
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

export async function getSystemStatus(): Promise<SystemStatus> {
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
    const exists = await minioClient.bucketExists(BUCKET);
    minio = exists
      ? { ok: true, message: `Бакет «${BUCKET}» доступен` }
      : { ok: false, message: `Бакет «${BUCKET}» не найден` };
  } catch (error) {
    minio = {
      ok: false,
      message:
        error instanceof Error ? error.message : 'Ошибка подключения к MinIO',
    };
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
    },
  };
}
