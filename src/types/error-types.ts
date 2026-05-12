// export type AppErrorCode = "NOT_FOUND" | "UNAUTHORIZED" | "ALREADY_EXISTS";
export const AppErrorCode = {
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  INTERNAL: "INTERNAL_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
  CONFLICT: "CONFLICT",
  DATABASE: "DATABASE"
} as const
export type AppErrorCode = typeof AppErrorCode[keyof typeof AppErrorCode];