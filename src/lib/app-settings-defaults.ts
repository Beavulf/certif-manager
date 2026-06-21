export const DEFAULT_EXPIRY_THRESHOLDS = {
  warningDays: 30,
  criticalDays: 7,
} as const;

export const DEFAULT_UPLOAD_LIMITS = {
  maxFileSizeMb: 10,
  allowedCertTypes: ['.cer', '.p7b'],
  allowedDocTypes: ['.pdf', '.docx', '.doc'],
} as const;

export const DEFAULT_APP_SETTINGS = {
  appName: 'Cert Manager',
  timezone: 'Europe/Minsk',
  cronCheckTime: '08:00',
  auditLogRetentionDays: 365,
} as const;

export const TIMEZONE_OPTIONS = [
  { value: 'Europe/Minsk', label: 'Минск (UTC+3)' },
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { value: 'Europe/Kyiv', label: 'Киев (UTC+2/+3)' },
  { value: 'Asia/Almaty', label: 'Алматы (UTC+5/+6)' },
  { value: 'UTC', label: 'UTC' },
] as const;
