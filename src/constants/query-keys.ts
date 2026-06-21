export const queryKeys = {
  certificates: {
    all: ['certificates'] as const,
    list: (filters?: string[]) => ['certificates', 'list', ...(filters ?? [])] as const,
    detail: (id: string) => ['certificates', 'detail', id] as const,
  },
  employees: {
    all: ['employees'] as const,
    list: () => ['employees', 'list'] as const,
    detail: (id: string) => ['employees', 'detail', id] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    settings: ['notifications', 'settings'] as const,
    byCertificate: (id: string) => ['notifications', 'logs', id] as const,
    page: (filters: Record<string, unknown>) =>
      ['notifications', 'page', filters] as const,
  },
  documents: {
    all: ['documents'] as const,
    byCertificate: (id: string) => ['documents', 'certificate', id] as const,
  },
  reports: {
    all: ['reports'] as const,
  },
  settings: {
    all: ['settings'] as const,
    bundle: ['settings', 'bundle'] as const,
    publicApp: ['settings', 'public-app'] as const,
    auditLogs: (page: number, pageSize: number) =>
      ['settings', 'audit-logs', page, pageSize] as const,
  },
}