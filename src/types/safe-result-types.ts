import type { AppErrorCode } from "./error-types";

export interface SafeResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, unknown>;
  code?: AppErrorCode;
}