import type { NotificationSettings } from '@/generated/prisma/client'
import { AppError, SmtpError } from '@/server/errors/app-error'
import { auditlogService } from '@/server/services/auditlog-service'
import { appSettingsService } from '@/server/services/app-settings-service'
import { notificationSettingsService } from '@/server/services/notification-settings-service'
import { AUDIT_ENTITY } from '@/types/auditlog-types'
import nodemailer from 'nodemailer'

// Типы входных данных
interface SendExpiryEmailParams {
  to: string
  employeeName: string
  certCN: string
  validTo: Date
  daysLeft: number
  appName?: string | null
  organizationName?: string | null
}

interface EmailResult {
  success: boolean
  error?: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Название системы и организации подставляются из «Настроек» приложения. */
function resolveBrand(params?: Pick<SendExpiryEmailParams, 'appName' | 'organizationName'>) {
  const appName = params?.appName?.trim() || 'Cert Manager';
  const organizationName = params?.organizationName?.trim() || '';
  return { appName, organizationName };
}

// HTML-шаблон письма
function buildEmailHtml(params: SendExpiryEmailParams): string {
  const { employeeName, certCN, validTo, daysLeft } = params
  // В HTML-шаблон значения вставляются экранированными.
  const { appName, organizationName } = (() => {
    const brand = resolveBrand(params)
    return {
      appName: escapeHtml(brand.appName),
      organizationName: escapeHtml(brand.organizationName),
    }
  })()

  const formattedDate = validTo.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const urgencyColor = daysLeft <= 7 ? '#dc2626' : daysLeft <= 14 ? '#f59e0b' : '#2563eb'
  const urgencyText = daysLeft <= 7 ? 'Срочно!' : `Осталось ${daysLeft} дней`

  return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0"
              style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

              <!-- Шапка -->
              <tr>
                <td style="background:${urgencyColor};padding:20px 32px;">
                  <p style="margin:0;color:#ffffff;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">
                    ${appName}
                  </p>
                  <h1 style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:700;">
                    ${urgencyText} — истекает сертификат
                  </h1>
                </td>
              </tr>

              <!-- Тело -->
              <tr>
                <td style="padding:32px;">
                  <p style="margin:0 0 16px;color:#374151;font-size:15px;">
                    Здравствуйте, <strong>${employeeName}</strong>!
                  </p>
                  <p style="margin:0 0 24px;color:#374151;font-size:15px;">
                    Уведомляем вас, что срок действия вашего сертификата истекает
                    через <strong style="color:${urgencyColor};">${daysLeft} ${pluralizeDays(daysLeft)}</strong>.
                  </p>

                  <!-- Карточка сертификата -->
                  <table width="100%" cellpadding="0" cellspacing="0"
                    style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:24px;">
                    <tr>
                      <td style="padding:16px 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px;">Имя сертификата</td>
                            <td style="padding:4px 0;color:#111827;font-size:13px;font-weight:600;">${certCN}</td>
                          </tr>
                          <tr>
                            <td style="padding:4px 0;color:#6b7280;font-size:13px;">Действует до</td>
                            <td style="padding:4px 0;color:${urgencyColor};font-size:13px;font-weight:600;">${formattedDate}</td>
                          </tr>
                          <tr>
                            <td style="padding:4px 0;color:#6b7280;font-size:13px;">Осталось</td>
                            <td style="padding:4px 0;color:${urgencyColor};font-size:13px;font-weight:700;">
                              ${daysLeft} ${pluralizeDays(daysLeft)}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0;color:#6b7280;font-size:13px;">
                    Пожалуйста, своевременно обратитесь к администратору для продления сертификата.
                  </p>
                </td>
              </tr>

              <!-- Подвал -->
              <tr>
                <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;">
                  <p style="margin:0;color:#9ca3af;font-size:12px;">
                    Это автоматическое уведомление системы ${appName}${organizationName ? ` (${organizationName})` : ''}. Не отвечайте на это письмо.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

// Склонение слова "день"
function pluralizeDays(days: number): string {
  const mod10 = days % 10
  const mod100 = days % 100

  if (mod100 >= 11 && mod100 <= 14) return 'дней'
  if (mod10 === 1) return 'день'
  if (mod10 >= 2 && mod10 <= 4) return 'дня'
  return 'дней'
}

// Тема письма
function buildSubject(daysLeft: number, certCN: string): string {
  if (daysLeft <= 7) return `🔴 Срочно: сертификат "${certCN}" истекает через ${daysLeft} ${pluralizeDays(daysLeft)}`
  if (daysLeft <= 14) return `🟡 Сертификат "${certCN}" истекает через ${daysLeft} ${pluralizeDays(daysLeft)}`
  return `🔵 Напоминание: сертификат "${certCN}" истекает через ${daysLeft} ${pluralizeDays(daysLeft)}`
}

function createTransporterFromSettings(settings: NotificationSettings) {
  if (!settings.smtpHost || !settings.senderEmail) {
    throw new SmtpError('SMTP не настроен. Заполните настройки уведомлений.');
  }

  const port = Number(settings.smtpPort ?? 25);
  const allowInsecureTls = process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false';

  return nodemailer.createTransport({
    host: settings.smtpHost,
    port,
    secure: port === 465,
    auth: settings.smtpUser
      ? {
          user: settings.smtpUser,
          pass: settings.smtpPassword ?? '',
        }
      : undefined,
    // Prevent SMTP hangs from blocking the Node event loop (and missing cron ticks).
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 60_000,
    ...(allowInsecureTls
      ? { tls: { rejectUnauthorized: false } }
      : {}),
  });
}

// Основная функция отправки
export async function sendExpiryEmail(
  params: SendExpiryEmailParams,
  settings?: NotificationSettings
): Promise<EmailResult> {

  const config = settings ?? await notificationSettingsService.findFirst({
    where: {
      isEnabled: true,
    },
  })

  if (!config) {
    console.warn('❌ Настройки уведомлений не найдены')
    await auditlogService.log({
      action: 'sendNotification',
      entityType: AUDIT_ENTITY.notificationSettings,
      displayName: `Ошибка отправки письма (${params.certCN} → ${params.to}): настройки уведомлений не найдены`,
    })
    
    return {
      success: false,
      error: 'Таблица SMTP настроек не найдена',
    };
  }

  if (!config.smtpHost || !config.smtpPort || !config.senderEmail) {
    console.warn('❌ SMTP не настроен')
    await auditlogService.log({
      action: 'sendNotification',
      entityType: AUDIT_ENTITY.notificationSettings,
      displayName: `Ошибка отправки письма (${params.certCN} → ${params.to}): SMTP не настроен`,
    })
    
    return {
      success: false,
      error: 'SMTP не настроен',
    };
  }

  const transporter = createTransporterFromSettings(config);

  try {
    await transporter.sendMail({
      from: `"${config.senderName}" <${config.senderEmail}>`,
      to: params.to,
      subject: buildSubject(params.daysLeft, params.certCN),
      html: buildEmailHtml(params),
    })

    return { success: true }
  } catch (error) {
    console.error('[MAIL] Ошибка отправки письма:', error)
    await auditlogService.log({
      action: 'sendNotification',
      entityType: AUDIT_ENTITY.system,
      displayName: `Ошибка отправки письма (${params.certCN} → ${params.to}): ${
        error instanceof Error ? error.message : 'Неизвестная ошибка'
      }`,
    })
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
    }
  }
}

// проверка соединения SMTP сервера
export async function verifySmtpConnection(
  settings?: NotificationSettings,
): Promise<EmailResult> {
  try {
    const config = settings ?? (await notificationSettingsService.getOrCreate());
    const transporter = createTransporterFromSettings(config);
    await transporter.verify();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof AppError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Не удалось подключиться',
    };
  }
}

export async function sendTestEmail(
  to: string,
  settings?: NotificationSettings,
): Promise<EmailResult> {
  const config = settings ?? (await notificationSettingsService.getOrCreate());

  if (!config.smtpHost || !config.senderEmail) {
    return { success: false, error: 'SMTP не настроен' };
  }

  // Название системы и организации — из настроек приложения, с запасным дефолтом.
  let brand = { appName: 'Cert Manager', organizationName: '' };
  try {
    brand = resolveBrand(await appSettingsService.getOrCreate());
  } catch {
    // Нет доступа к настройкам приложения — отправляем с дефолтным названием.
  }

  // Тема — обычный текст (без HTML-экранирования), в шаблон — экранированные.
  const orgLine = brand.organizationName
    ? `<p style="margin:12px 0 0;color:#6b7280;">Организация: ${escapeHtml(brand.organizationName)}</p>`
    : '';
  const safeAppName = escapeHtml(brand.appName);

  const transporter = createTransporterFromSettings(config);

  try {
    await transporter.sendMail({
      from: `"${config.senderName ?? 'Cert Manager'}" <${config.senderEmail}>`,
      to,
      subject: `Тестовое письмо — ${brand.appName}`,
      html: `
        <div style="font-family:Arial,sans-serif;padding:24px;">
          <h2 style="margin:0 0 12px;">Тестовое письмо — ${safeAppName}</h2>
          <p style="margin:0;color:#374151;">
            SMTP настроен корректно. Уведомления об истечении сертификатов будут отправляться с этого адреса.
          </p>
          ${orgLine}
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Не удалось отправить письмо',
    };
  }
}