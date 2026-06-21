import { notificationSettingsRepository } from "../repositories/notification-settings-repository";
import type { NotificationSettings, Prisma } from "@/generated/prisma/client";
import { AlreadyExistsError, NotFoundError } from "../errors/app-error";

export const notificationSettingsService = {
  async findMany(
    args?: Prisma.NotificationSettingsFindManyArgs
  ): Promise<NotificationSettings[]> {
    return await notificationSettingsRepository.findMany(args);
  },

  async findFirst(
    args?: Prisma.NotificationSettingsFindFirstArgs
  ): Promise<NotificationSettings | null> {
    return await notificationSettingsRepository.findFirst(args);
  },

  async create(data: Prisma.NotificationSettingsCreateInput): Promise<NotificationSettings> {
    const notifySettings = await notificationSettingsRepository.findFirst({
      where: {
        smtpHost: data.smtpHost,
        smtpPort: data.smtpPort,
      }
    });
    if (notifySettings) {
      throw new AlreadyExistsError("Настройка уведомления уже существует");
    }
    return await notificationSettingsRepository.create(data);
  },

  async update(
    id: string, data: Prisma.NotificationSettingsUpdateInput
  ): Promise<NotificationSettings> {
    const notificationSettings = await this.findByIdOrThrow(id);
    const updated = await notificationSettingsRepository.updateById(notificationSettings.id, data);
    if (!updated) {
      throw new NotFoundError("Настройка уведомления при обновлении не найдена");
    }
    return updated;
  },

  async deleteById(id: string): Promise<NotificationSettings> {
    const notificationSettings = await this.findByIdOrThrow(id);
    const deleted = await notificationSettingsRepository.deleteById(notificationSettings.id);
    if (!deleted) {
      throw new NotFoundError("Настройка уведомления для удаления не найдена");
    }
    return deleted;
  },

  async findByIdOrThrow(id: string): Promise<NotificationSettings> {
    const notificationSettings = await notificationSettingsRepository.findById(id);
    if (!notificationSettings) {
      throw new NotFoundError("Настройка уведомления не найдена");
    }
    return notificationSettings;
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