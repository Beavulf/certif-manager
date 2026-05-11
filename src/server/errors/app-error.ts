import type { AppErrorCode } from "@/types/error-types";

type AppErrorOptions = { cause?: unknown }

export class AppError extends Error {
  public readonly status: number;
  public readonly code: AppErrorCode;

  constructor(
    message: string,
    code: AppErrorCode,
    status: number,
    options?: AppErrorOptions,
  ) {
    super(message, options);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found", options?: AppErrorOptions) {
    super(message, "NOT_FOUND", 404, options);
    this.name = "NotFoundError"
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad Request", options?: AppErrorOptions) {
    super(message, "BAD_REQUEST", 400, options);
    this.name = "BadRequestError"
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", options?: AppErrorOptions) {
    super(message, "UNAUTHORIZED", 401, options);
    this.name = "UnauthorizedError"
  }
}

export class AlreadyExistsError extends AppError {
  constructor(message = "Already exists", options?: AppErrorOptions) {
    super(message, "ALREADY_EXISTS", 409, options);
    this.name = "AlreadyExistsError"
  }
}