import type { ExpiryUrgency, ExpiryThresholds } from '@/lib/certificate-expiry';
import type { SystemStatus } from '@/types/settings-types';

export type DashboardAttentionCert = {
  id: string;
  subjectCN: string;
  serialNumber: string;
  validTo: Date;
  daysLeft: number;
  urgency: ExpiryUrgency;
  employeeName: string | null;
  /** Пояснение: актуальный / нет действующего / не привязан */
  contextLabel: string | null;
};

export type DashboardProblems = {
  unassignedCertificates: number;
  employeesWithoutCertificates: number;
  failedNotifications7d: number;
};

export type DashboardKpi = {
  totalCertificates: number;
  expiringSoon: number;
  expired: number;
  notificationsToday: number;
  notificationsFailed: number;
};

export type DashboardAuditItem = {
  id: string;
  createdAt: Date;
  adUsername: string | null;
  action: string;
  displayName: string | null;
};

export type DashboardExpiryCalendarItem = {
  id: string;
  subjectCN: string;
  employeeName: string | null;
  validTo: Date;
  daysLeft: number;
};

export type DashboardExpiryCalendarWeek = {
  weekStart: string;
  weekEnd: string;
  label: string;
  count: number;
  items: DashboardExpiryCalendarItem[];
};

export type DashboardExpiryCalendar = {
  weeks: DashboardExpiryCalendarWeek[];
  totalInRange: number;
};

export type DashboardData = {
  kpi: DashboardKpi;
  attentionCerts: DashboardAttentionCert[];
  expiryCalendar: DashboardExpiryCalendar;
  problems: DashboardProblems;
  recentActivity: DashboardAuditItem[];
  systemStatus: SystemStatus;
  notificationsEnabled: boolean;
  expiryThresholds: ExpiryThresholds;
  username: string;
};
