import { AppError } from "@/server/errors/app-error";
import type { SafeResult } from "@/types/safe-result-types";
import { NextResponse } from "next/server";

export function mapErrorToSafeResult<T = unknown>(error: unknown):SafeResult<T> {

  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
    }
  }

  console.error('[Unexpected error]',error);
  const causeCode =
    error &&
    typeof error === 'object' &&
    'cause' in error &&
    error.cause &&
    typeof error.cause === 'object' &&
    'code' in error.cause
      ? String(error.cause.code)
      : undefined;
  return {
    success: false,
    error: `Внутренняя ошибка сервера(${causeCode}): ${error}`,
    code: 'INTERNAL_ERROR',
  }
}

export function mapErrorToResponse(error: unknown) {

  if (error instanceof AppError) {
    console.error("AppError:", error.code, error.message, "cause:", error.cause);
    
    return NextResponse.json(
      { code: error.code, message: error.message }, 
      { status: error.status }
    );
  }

  console.error(error);
  return Response.json(
    { code: "INTERNAL", message: "Internal error" }, 
    { status: 500 }
  );
}