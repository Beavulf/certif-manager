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
  },
  reports: {
    all: ['reports'] as const,
  },
}