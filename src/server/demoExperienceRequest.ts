import 'server-only';

import { NextResponse } from 'next/server';

import { getKstDateKey } from '@/lib/demoExperienceTime';
import type {
  DemoExperienceErrorCode,
  DemoExperienceRole,
} from '@/types/demoExperience';

import {
  DEMO_EXPERIENCE_SESSION_COOKIE,
  readSignedDemoExperienceSessionValue,
  verifyDemoExperienceSessionValue,
} from './demoExperienceSession';

export class DemoExperienceRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: DemoExperienceErrorCode
  ) {
    super(message);
    this.name = 'DemoExperienceRequestError';
  }
}

type SessionVerificationOptions = {
  now?: Date;
  secret?: string;
};

function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get('cookie') ?? '';
  for (const part of cookieHeader.split(';')) {
    const [key, ...valueParts] = part.trim().split('=');
    if (key === name) {
      return valueParts.join('=');
    }
  }
  return null;
}

export function assertSameOriginDemoMutation(request: Request) {
  const origin = request.headers.get('origin')?.trim() ?? '';
  const requestUrl = new URL(request.url);
  const allowedOrigins = new Set([requestUrl.origin]);
  const host = request.headers.get('host')?.split(',')[0]?.trim() ?? '';
  const forwardedProtocol =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase() ?? '';
  const protocol =
    forwardedProtocol === 'http' || forwardedProtocol === 'https'
      ? `${forwardedProtocol}:`
      : requestUrl.protocol;
  if (host && /^[a-z0-9.:[\]-]+$/i.test(host)) {
    allowedOrigins.add(`${protocol}//${host}`);
  }

  let normalizedOrigin = '';
  try {
    normalizedOrigin = origin ? new URL(origin).origin : '';
  } catch {
    normalizedOrigin = '';
  }

  if (!normalizedOrigin || !allowedOrigins.has(normalizedOrigin)) {
    throw new DemoExperienceRequestError(
      '허용되지 않은 출처의 체험 요청입니다.',
      403,
      'DEMO_ROLE_FORBIDDEN'
    );
  }
}

export function requireDemoExperienceSession(
  request: Request,
  allowedRoles: readonly DemoExperienceRole[] = ['admin', 'customer'],
  options: SessionVerificationOptions = {}
) {
  const sessionValue = readCookie(request, DEMO_EXPERIENCE_SESSION_COOKIE);
  const session = verifyDemoExperienceSessionValue(sessionValue, options);
  if (!session) {
    const signed = readSignedDemoExperienceSessionValue(sessionValue, options);
    const now = options.now ?? new Date();
    if (signed && signed.dateKey !== getKstDateKey(now)) {
      throw new DemoExperienceRequestError(
        '새로운 체험일이 시작되어 데이터가 초기화되었습니다.',
        410,
        'DEMO_DAY_ROLLED_OVER'
      );
    }

    throw new DemoExperienceRequestError(
      '체험 세션을 확인할 수 없습니다.',
      401,
      'DEMO_SESSION_REQUIRED'
    );
  }

  if (!allowedRoles.includes(session.role)) {
    throw new DemoExperienceRequestError(
      '현재 체험 역할로는 이 작업을 실행할 수 없습니다.',
      403,
      'DEMO_ROLE_FORBIDDEN'
    );
  }

  return session;
}

export function toDemoExperienceErrorResponse(error: DemoExperienceRequestError) {
  return NextResponse.json(
    { error: error.message, code: error.code },
    { status: error.status }
  );
}
