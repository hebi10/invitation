import { NextResponse } from 'next/server';

import { getAllWeddingPageSeeds } from '@/config/weddingPages';
import { DEFAULT_INVITATION_THEME, isInvitationThemeKey } from '@/lib/invitationThemes';
import {
  getInvitationPageSlugValidationErrorMessage,
  validateInvitationPageSlugBase,
} from '@/lib/invitationPageSlug';
import { normalizeInvitationProductTier } from '@/lib/invitationProducts';
import {
  CLIENT_EDITOR_OWNER_SESSION_VERSION,
  createClientEditorSessionValue,
} from '@/server/clientEditorSession';
import {
  buildMobileInvitationLinks,
  MOBILE_CLIENT_EDITOR_SESSION_TTL_SECONDS,
  resolveMobileClientEditorPermissions,
} from '@/server/clientEditorMobileApi';
import { getServerAuth } from '@/server/firebaseAdmin';
import {
  createServerInvitationPageDraftFromSeed,
  getServerEditableInvitationPageConfig,
  getServerInvitationPageDisplayPeriodSummary,
} from '@/server/invitationPageServerService';
import { getServerPageTicketCount } from '@/server/pageTicketServerService';
import { firestoreEventRepository } from '@/server/repositories/eventRepository';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const MOBILE_CLIENT_EDITOR_DRAFT_RATE_LIMIT = {
  limit: 3,
  windowMs: 10 * 60 * 1000,
} as const;

function isMobileDraftCreationEnabled() {
  return process.env.MOBILE_DRAFT_CREATION_ENABLED === 'true';
}

async function verifyMobileCustomerUid(request: Request) {
  const authHeader = request.headers.get('authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!idToken) {
    return null;
  }

  const serverAuth = getServerAuth();
  if (!serverAuth) {
    throw new Error('Firebase Admin Auth is not available.');
  }

  return serverAuth.verifyIdToken(idToken);
}

export async function POST(request: Request) {
  try {
    if (!isMobileDraftCreationEnabled()) {
      return NextResponse.json(
        { error: 'Mobile invitation draft creation is disabled.' },
        { status: 403 }
      );
    }

    const customerIdentity = await verifyMobileCustomerUid(request);
    if (!customerIdentity) {
      return NextResponse.json(
        { error: 'Customer authentication is required.' },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as
      | {
          seedSlug?: unknown;
          slugBase?: unknown;
          groomName?: unknown;
          brideName?: unknown;
          productTier?: unknown;
          defaultTheme?: unknown;
        }
      | null;

    const slugBase = typeof body?.slugBase === 'string' ? body.slugBase.trim() : '';
    const groomName = typeof body?.groomName === 'string' ? body.groomName.trim() : '';
    const brideName = typeof body?.brideName === 'string' ? body.brideName.trim() : '';
    const seedSlug =
      typeof body?.seedSlug === 'string' && body.seedSlug.trim()
        ? body.seedSlug.trim()
        : getAllWeddingPageSeeds()[0]?.slug ?? '';

    if (!slugBase) {
      return NextResponse.json({ error: 'Page slug base is required.' }, { status: 400 });
    }

    const slugValidation = validateInvitationPageSlugBase(slugBase);
    if (!slugValidation.isValid) {
      return NextResponse.json(
        { error: getInvitationPageSlugValidationErrorMessage(slugValidation.reason) },
        { status: 400 }
      );
    }

    if (!groomName || !brideName) {
      return NextResponse.json({ error: 'Groom and bride names are required.' }, { status: 400 });
    }

    const rateLimitResult = await applyScopedRateLimit({
      request,
      scope: 'mobile-client-editor-drafts',
      keyParts: [slugValidation.normalizedSlugBase, seedSlug],
      ...MOBILE_CLIENT_EDITOR_DRAFT_RATE_LIMIT,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many draft creation attempts. Please try again later.' },
        {
          status: 429,
          headers: buildRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const defaultTheme = isInvitationThemeKey(body?.defaultTheme)
      ? body.defaultTheme
      : DEFAULT_INVITATION_THEME;
    const productTier = normalizeInvitationProductTier(body?.productTier);

    const createdDraft = await createServerInvitationPageDraftFromSeed({
      seedSlug,
      slugBase: slugValidation.normalizedSlugBase,
      groomName,
      brideName,
      published: false,
      defaultTheme,
      productTier,
      initialDisplayPeriodMonths: 6,
    });
    await firestoreEventRepository.assignOwnerBySlug({
      pageSlug: createdDraft.slug,
      ownerUid: customerIdentity.uid,
      ownerEmail:
        typeof customerIdentity.email === 'string' ? customerIdentity.email : null,
      ownerDisplayName:
        typeof customerIdentity.name === 'string' ? customerIdentity.name : null,
    });
    const [config, displayPeriod, ticketCount] = await Promise.all([
      getServerEditableInvitationPageConfig(createdDraft.slug),
      getServerInvitationPageDisplayPeriodSummary(createdDraft.slug),
      getServerPageTicketCount(createdDraft.slug),
    ]);

    if (!config) {
      throw new Error('Failed to create invitation page draft.');
    }

    const { value, expiresAt } = createClientEditorSessionValue(
      {
        pageSlug: createdDraft.slug,
        passwordVersion: CLIENT_EDITOR_OWNER_SESSION_VERSION,
      },
      {
        ttlSeconds: MOBILE_CLIENT_EDITOR_SESSION_TTL_SECONDS,
      }
    );
    const links = buildMobileInvitationLinks(
      new URL(request.url).origin,
      createdDraft.slug,
      config.defaultTheme
    );
    const permissions = resolveMobileClientEditorPermissions();

    return NextResponse.json(
      {
        permissions,
        session: {
          token: value,
          expiresAt,
          pageSlug: createdDraft.slug,
        },
        dashboardPage: config,
        page: {
          slug: config.slug,
          displayName: config.config.displayName,
          published: config.published,
          productTier: config.productTier,
          defaultTheme: config.defaultTheme,
          features: config.features,
          ticketCount,
          displayPeriod: {
            enabled: displayPeriod.enabled,
            startDate: displayPeriod.startDate?.toISOString() ?? null,
            endDate: displayPeriod.endDate?.toISOString() ?? null,
          },
        },
        links,
      },
      {
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    console.error('[mobile/client-editor/drafts] failed to create draft', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : 'Failed to create invitation page draft.',
      },
      { status: 500 }
    );
  }
}
