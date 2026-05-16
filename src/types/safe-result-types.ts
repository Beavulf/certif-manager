export interface SafeResult {
  success: boolean;
  data?: string;
  error?: string;
  fieldErrors?: Record<string, unknown>;
}