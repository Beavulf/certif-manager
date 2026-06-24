import { notificationSettingsRepository } from "../repositories/notification-settings-repository";
import type { NotificationSettings, Prisma } from "@/generated/prisma/client";

export const notificationSettingsService = {
  async findFirst(
    args?: Prisma.NotificationSettingsFindFirstArgs
  ): Promise<NotificationSettings | null> {
    return await notificationSettingsRepository.findFirst(args);
  },

  async getOrCreate(): Promise<NotificationSettings> {
    const existing = await notificationSettingsRepository.findFirst();
    if (existing) return existing;

    return notificationSettingsRepository.create({
      smtpHost: 'localhost',
      smtpPort: 25,
      senderEmail: 'noreply@example.com',
      senderName: 'Cert Manager',
      daysBeforeExpiry: [30, 14, 7],
      isEnabled: false,
    });
  },

  async upsertSettings(data: {
    isEnabled: boolean;
    daysBeforeExpiry: number[];
    smtpHost: string;
    smtpPort: number;
    smtpUser: string | null;
    smtpPassword: string | null;
    senderEmail: string;
    senderName: string | null;
    updatedBy?: string;
  }): Promise<NotificationSettings> {
    const existing = await this.getOrCreate();

    const updateData: Prisma.NotificationSettingsUpdateInput = {
      isEnabled: data.isEnabled,
      daysBeforeExpiry: data.daysBeforeExpiry,
      smtpHost: data.smtpHost,
      smtpPort: data.smtpPort,
      smtpUser: data.smtpUser,
      senderEmail: data.senderEmail,
      senderName: data.senderName,
      updatedBy: data.updatedBy,
    };

    if (data.smtpPassword) {
      updateData.smtpPassword = data.smtpPassword;
    }

    return notificationSettingsRepository.updateById(existing.id, updateData);
  },
}
