import { toast } from 'sonner';

import type { CheckExpiringResult } from '@/types/notification-check-types';
import type { SafeResult } from '@/types/safe-result-types';

const ERROR_CODE_HINTS: Record<string, string> = {
  NOT_FOUND: 'Запись не найдена в базе данных',
  UNAUTHORIZED: 'Сессия истекла или нет прав на операцию',
  ALREADY_EXISTS: 'Объект с такими данными уже существует',
  INTERNAL_ERROR: 'Непредвиденная ошибка на сервере',
  BAD_REQUEST: 'Данные запроса некорректны',
  CONFLICT: 'Операция конфликтует с текущим состоянием данных',
  DATABASE: 'Ошибка при обращении к базе данных',
  SMTP: 'Проблема с настройками или доступностью SMTP',
};

const FIELD_LABELS: Record<string, string> = {
  file: 'Файл',
  employeeId: 'Сотрудник',
  certificateId: 'Сертификат',
  documentId: 'Документ',
  id: 'Идентификатор',
  notes: 'Примечание',
  // Настройки приложения
  appName: 'Название системы',
  organizationName: 'Название организации',
  timezone: 'Часовой пояс',
  warningDays: 'Предупреждение (дней)',
  criticalDays: 'Критично (дней)',
  cronCheckTime: 'Время ежедневной проверки',
  maxFileSizeMb: 'Максимальный размер файла',
  allowedCertTypes: 'Типы сертификатов',
  allowedDocTypes: 'Типы документов',
  adEmailDomain: 'Домен email (AD)',
  auditLogRetentionDays: 'Хранение журнала аудита',
  // Настройки уведомлений
  isEnabled: 'Включить уведомления',
  daysBeforeExpiry: 'Дни до истечения',
  daysBeforeExpiryText: 'Дни до истечения',
  smtpHost: 'SMTP-хост',
  smtpPort: 'SMTP-порт',
  smtpUser: 'SMTP-пользователь',
  smtpPassword: 'SMTP-пароль',
  senderEmail: 'Email отправителя',
  senderName: 'Имя отправителя',
  testEmail: 'Тестовый email',
  // Прочее
  login: 'Логин',
  password: 'Пароль',
  fullName: 'ФИО',
  email: 'Email',
  adUsername: 'Логин AD',
  query: 'Поисковый запрос',
};

function isFailedResult(error: unknown): error is SafeResult {
  return (
    typeof error === 'object' &&
    error !== null &&
    'success' in error &&
    (error as SafeResult).success === false
  );
}

function formatFieldErrors(fieldErrors?: Record<string, unknown>): string | undefined {
  if (!fieldErrors) return undefined;

  const parts: string[] = [];

  for (const [field, value] of Object.entries(fieldErrors)) {
    const label = FIELD_LABELS[field] ?? field;
    const messages = Array.isArray(value) ? value : [value];

    for (const message of messages) {
      if (message === undefined || message === null || message === '') continue;
      parts.push(`${label}: ${String(message)}`);
    }
  }

  return parts.length > 0 ? parts.join('; ') : undefined;
}

export function extractErrorDetails(
  error: unknown,
  fallback = 'Операция не выполнена',
): { message: string; code?: string; fieldDetails?: string } {
  if (isFailedResult(error)) {
    return {
      message: error.error ?? fallback,
      code: error.code,
      fieldDetails: formatFieldErrors(error.fieldErrors),
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  if (error && typeof error === 'object') {
    const err = error as { error?: string; code?: string; message?: string };
    return {
      message: err.error ?? err.message ?? fallback,
      code: err.code,
    };
  }

  return { message: fallback };
}

export function formatErrorMessage(
  error: unknown,
  fallback = 'Операция не выполнена',
): string {
  const { message, code, fieldDetails } = extractErrorDetails(error, fallback);
  const codeHint = code ? ERROR_CODE_HINTS[code] ?? code : undefined;
  return [message, codeHint, fieldDetails].filter(Boolean).join(' · ');
}

export function showActionError(
  error: unknown,
  context: string,
  fallback = 'Операция не выполнена',
) {
  const { message, code, fieldDetails } = extractErrorDetails(error, fallback);
  const codeHint = code ? ERROR_CODE_HINTS[code] ?? code : undefined;
  const description = [context, codeHint, fieldDetails].filter(Boolean).join(' · ');

  toast.error(message, { description });
}

export function showActionSuccess(title: string, description?: string) {
  toast.success(title, description ? { description } : undefined);
}

export function showValidationError(title: string, description?: string) {
  toast.error(title, description ? { description } : undefined);
}

export function showNotificationCheckResult(data: CheckExpiringResult) {
  const daysHint = data.checkDays.length
    ? `Контрольные точки: ${data.checkDays.join(', ')} дн.`
  : undefined;

  if (data.disabled) {
    toast.warning(data.message, {
      description: daysHint ?? 'Включите уведомления в настройках SMTP',
    });
    return;
  }

  if (data.sent > 0) {
    toast.success(data.message, { description: daysHint });
    return;
  }

  if (data.failed > 0) {
    toast.error(data.message, {
      description: [
        daysHint,
        'Проверьте журнал уведомлений и настройки SMTP',
      ]
        .filter(Boolean)
        .join(' · '),
    });
    return;
  }

  if (data.skipped > 0) {
    toast.warning(data.message, { description: daysHint });
    return;
  }

  toast.info(data.message, { description: daysHint });
}

export function showLoginError(result: SafeResult) {
  if (result.error === 'Unauthorized') {
    toast.error('Неверный логин или пароль', {
      description: 'Проверьте учётные данные Active Directory',
    });
    return;
  }

  if (result.error?.includes('ETIMEDOUT')) {
    toast.error('Сервер авторизации не ответил вовремя', {
      description: 'Проверьте доступность AUTH_URL и сетевое подключение',
    });
    return;
  }

  if (result.error?.includes('ECONNREFUSED')) {
    toast.error('Сервер авторизации недоступен', {
      description: 'Служба по адресу AUTH_URL не принимает соединения',
    });
    return;
  }

  const codeHint = result.code ? ERROR_CODE_HINTS[result.code] ?? result.code : undefined;
  const fieldDetails = formatFieldErrors(result.fieldErrors);

  toast.error(result.error ?? 'Не удалось войти в систему', {
    description: [codeHint, fieldDetails].filter(Boolean).join(' · ') || undefined,
  });
}
