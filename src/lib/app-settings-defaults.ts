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
  { value: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' },
  { value: 'Europe/Kyiv', label: 'Киев (UTC+2/+3)' },
  { value: 'Europe/Minsk', label: 'Минск (UTC+3)' },
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { value: 'Europe/Samara', label: 'Самара (UTC+4)' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
  { value: 'Asia/Almaty', label: 'Алматы (UTC+5/+6)' },
  { value: 'Asia/Tashkent', label: 'Ташкент (UTC+5)' },
  { value: 'Asia/Novosibirsk', label: 'Новосибирск (UTC+7)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' },
  { value: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
  { value: 'Europe/Warsaw', label: 'Варшава (UTC+1/+2)' },
  { value: 'Europe/Berlin', label: 'Берлин (UTC+1/+2)' },
  { value: 'Europe/Istanbul', label: 'Стамбул (UTC+3)' },
  { value: 'Asia/Baku', label: 'Баку (UTC+4)' },
  { value: 'Asia/Tbilisi', label: 'Тбилиси (UTC+4)' },
  { value: 'Asia/Yerevan', label: 'Ереван (UTC+4)' },
  { value: 'Asia/Dubai', label: 'Дубай (UTC+4)' },
  { value: 'UTC', label: 'UTC' },
] as const;
