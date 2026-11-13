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

type StorageFailure = {
  status: number;
  code: string;
  message: string;
};

/**
 * Ошибки S3-хранилища (RustFS/MinIO) и сетевого уровня маппим в понятные ответы,
 * а не в безликий 500: файл удалён из бакета → 404, хранилище недоступно → 503.
 */
function storageFailure(error: unknown): StorageFailure | undefined {
  if (!error || typeof error !== 'object') return undefined;

  const candidates: unknown[] = [error, (error as { cause?: unknown }).cause];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const code = (candidate as { code?: unknown }).code;
    if (typeof code !== 'string') continue;

    if (code === 'NotFound' || code === 'NoSuchKey') {
      return { status: 404, code: 'FILE_NOT_FOUND', message: 'Файл не найден в хранилище' };
    }
    if (code === 'AccessDenied') {
      return { status: 403, code: 'STORAGE_ACCESS_DENIED', message: 'Хранилище отказало в доступе к файлу' };
    }
    if (/^E(CONNREFUSED|TIMEDOUT|HOSTUNREACH|NETUNREACH|CONNRESET|NOTFOUND)$/.test(code)) {
      return { status: 503, code: 'STORAGE_UNAVAILABLE', message: 'Файловое хранилище недоступно' };
    }
  }
  return undefined;
}

export function mapErrorToResponse(error: unknown) {

  if (error instanceof AppError) {
    console.error("AppError:", error.code, error.message, "cause:", error.cause);

    return NextResponse.json(
      { code: error.code, message: error.message },
      { status: error.status }
    );
  }

  const storage = storageFailure(error);
  if (storage) {
    console.error(`[Storage] ${storage.code}:`, error);
    return Response.json(
      { code: storage.code, message: storage.message },
      { status: storage.status }
    );
  }

  console.error(error);
  return Response.json(
    { code: "INTERNAL", message: "Internal error" },
    { status: 500 }
  );
}