export const queryKeys = {
  certificates: {
    all: ['certificates'] as const,
    list: (filters?: object) => ['certificates', 'list', filters] as const,
    detail: (id: number) => ['certificates', 'detail', id] as const,
  },
  employees: {
    all: ['employees'] as const,
    detail: (id: number) => ['employees', 'detail', id] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    settings: ['notifications', 'settings'] as const,
  },
  reports: {
    all: ['reports'] as const,
  },
}