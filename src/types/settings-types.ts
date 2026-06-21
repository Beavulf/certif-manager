import type { AppSettings, NotificationSettings } from '@/generated/prisma/client';

export type NotificationSettingsPublic = Omit<
  NotificationSettings,
  'smtpPassword'
> & {
  hasSmtpPassword: boolean;
};

export type SystemStatus = {
  database: { ok: boolean; message: string };
  minio: { ok: boolean; message: string };
  cron: {
    checkTime: string;
    timezone: string;
    nextDescription: string;
  };
};

export type PublicAppSettings = {
  warningDays: number;
  criticalDays: number;
  maxFileSizeMb: number;
  allowedCertTypes: string[];
  allowedDocTypes: string[];
};

export type SettingsBundle = {
  app: AppSettings;
  notification: NotificationSettingsPublic;
  systemStatus: SystemStatus;
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  uploadCert: 'Загрузка сертификата',
  deleteCert: 'Удаление сертификата',
  viewCert: 'Просмотр сертификата',
  uploadDoc: 'Загрузка документа',
  deleteDoc: 'Удаление документа',
  editEmployee: 'Изменение сотрудника',
  exportReport: 'Экспорт отчёта',
  login: 'Вход в систему',
  sendNotification: 'Уведомление',
  editCertificate: 'Изменение сертификата',
  editSettings: 'Изменение настроек',
};
