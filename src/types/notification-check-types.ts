export type CheckExpiringResult = {
  disabled: boolean;
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  message: string;
  checkDays: number[];
  isTestRun: boolean;
};

export type CheckExpiringOptions = {
  daysOverride?: number[];
  ignoreAlreadySent?: boolean;
  isTestRun?: boolean;
  initiatedBy?: 'cron' | 'manual';
  adUsername?: string;
};
