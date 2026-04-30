import { NextResponse } from 'next/server';

export const GENERIC_SERVER_ERROR_MESSAGE =
  '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';

type HttpStatusError = Error & {
  status: number;
};

export function getSafeHttpErrorMessage(
  error: HttpStatusError,
  fallback = GENERIC_SERVER_ERROR_MESSAGE
) {
  return error.status >= 500 ? fallback : error.message;
}

export function toSafeHttpErrorResponse(
  error: HttpStatusError,
  fallback = GENERIC_SERVER_ERROR_MESSAGE
) {
  return NextResponse.json(
    { error: getSafeHttpErrorMessage(error, fallback) },
    { status: error.status }
  );
}

export function getInternalErrorReason(error: unknown) {
  const message =
    error instanceof Error
      ? error.message.trim()
      : typeof error === 'string'
        ? error.trim()
        : '';

  return message || 'unknown_error';
}
