import { NextResponse } from 'next/server';

import { authorizeMobileClientEditorRequest } from '@/server/clientEditorMobileApi';
import { verifyServerClientPassword } from '@/server/clientPasswordServerService';
import {
  createMobileClientEditorHighRiskSessionValue,
  writeMobileClientEditorAuditLog,
} from '@/server/mobileClientEditorHighRisk';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const MOBILE_CLIENT_EDITOR_HIGH_RISK_VERIFY_RATE_LIMIT = {
  limit: 5,
  windowMs: 10 * 60 * 1000,
} as const;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { pageSlug?: unknown; password?: unknown }
    | null;
  const pageSlug = typeof body?.pageSlug === 'string' ? body.pageSlug.trim() : '';
  const password = typeof body?.password === 'string' ? body.password.trim() : '';

  if (!pageSlug || !password) {
    return NextResponse.json(
      { error: 'Page slug and password are required.' },
      { status: 400 }
    );
  }

  const access = await authorizeMobileClientEditorRequest(request, pageSlug);
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const rateLimitResult = await applyScopedRateLimit({
    request,
    scope: 'mobile-client-editor-high-risk-verify',
    keyParts: [pageSlug],
    ...MOBILE_CLIENT_EDITOR_HIGH_RISK_VERIFY_RATE_LIMIT,
  });

  if (!rateLimitResult.allowed) {
    await writeMobileClientEditorAuditLog({
      action: 'verifyHighRisk',
      result: 'failure',
      pageSlug,
      sessionPageSlug: access.session.pageSlug,
      reason: 'rate_limited',
    });

    return NextResponse.json(
      { error: 'Too many high-risk verification attempts. Please try again later.' },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }

  const verification = await verifyServerClientPassword(pageSlug, password);
  if (!verification.verified || !verification.record) {
    await writeMobileClientEditorAuditLog({
      action: 'verifyHighRisk',
      result: 'failure',
      pageSlug,
      sessionPageSlug: access.session.pageSlug,
      reason: 'invalid_password',
    });

    return NextResponse.json(
      { error: 'Invalid page password.' },
      {
        status: 401,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }

  const highRiskSession = createMobileClientEditorHighRiskSessionValue({
    pageSlug,
    passwordVersion: verification.record.passwordVersion,
  });

  await writeMobileClientEditorAuditLog({
    action: 'verifyHighRisk',
    result: 'success',
    pageSlug,
    sessionPageSlug: access.session.pageSlug,
  });

  return NextResponse.json(
    {
      verified: true,
      session: {
        token: highRiskSession.value,
        pageSlug,
        verifiedAt: highRiskSession.verifiedAt * 1000,
        expiresAt: highRiskSession.expiresAt * 1000,
      },
    },
    {
      headers: buildRateLimitHeaders(rateLimitResult),
    }
  );
}
