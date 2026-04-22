import { NextResponse } from 'next/server';

import { getServerInvitationPageSlugAvailability } from '@/server/invitationPageServerService';
import {
  applyScopedInMemoryRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const MOBILE_CLIENT_EDITOR_SLUG_AVAILABILITY_RATE_LIMIT = {
  limit: 20,
  windowMs: 5 * 60 * 1000,
} as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slugBase = searchParams.get('slugBase')?.trim() ?? '';

    const rateLimitResult = applyScopedInMemoryRateLimit({
      request,
      scope: 'mobile-client-editor-slug-availability',
      keyParts: [slugBase],
      ...MOBILE_CLIENT_EDITOR_SLUG_AVAILABILITY_RATE_LIMIT,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many slug availability checks. Please try again later.' },
        {
          status: 429,
          headers: buildRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const result = await getServerInvitationPageSlugAvailability(slugBase);
    return NextResponse.json(result, {
      headers: buildRateLimitHeaders(rateLimitResult),
    });
  } catch (error) {
    console.error('[mobile/client-editor/slug-availability] failed to resolve availability', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : 'Failed to resolve slug availability.',
      },
      { status: 500 }
    );
  }
}
