import {
  MAX_NOTIFICATION_DAYS,
  MIN_NOTIFICATION_DAYS,
} from '@/constants/notification-days';

export function formatDaysList(days?: number[]): string {
  if (!days?.length) return '';
  return [...new Set(days)].sort((a, b) => b - a).join(', ');
}

/** Парсит строку в список дней. Поддерживает: "45", "30, 14, 7", "7 14 30". */
export function parseDaysInput(raw: string): number[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  return [...new Set(
    trimmed
      .split(/[,;\s]+/)
      .map((part) => parseInt(part.trim(), 10))
      .filter(
        (n) =>
          !Number.isNaN(n) &&
          n >= MIN_NOTIFICATION_DAYS &&
          n <= MAX_NOTIFICATION_DAYS,
      ),
  )].sort((a, b) => b - a);
}
