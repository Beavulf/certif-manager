import type { AppSettings, Prisma } from '@/generated/prisma/client';
import {
  APP_SETTINGS_ID,
  appSettingsRepository,
} from '../repositories/app-settings-repository';

export const appSettingsService = {
  async getOrCreate(): Promise<AppSettings> {
    const existing = await appSettingsRepository.findById(APP_SETTINGS_ID);
    if (existing) return existing;

    return appSettingsRepository.create({
      id: APP_SETTINGS_ID,
    });
  },

  async update(
    data: Prisma.AppSettingsUpdateInput,
    updatedBy?: string,
  ): Promise<AppSettings> {
    await this.getOrCreate();
    return appSettingsRepository.updateById(APP_SETTINGS_ID, {
      ...data,
      updatedBy,
    });
  },
};
