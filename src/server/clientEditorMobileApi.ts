import 'server-only';

import {
  buildInvitationThemeRoutePath,
  DEFAULT_INVITATION_THEME,
  INVITATION_THEME_KEYS,
  type InvitationThemeKey,
} from '@/lib/invitationThemes';

import { getAuthorizedClientEditorSession } from './clientEditorSessionAuth';
import { getServerFirestore } from './firebaseAdmin';

export const MOBILE_CLIENT_EDITOR_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface ServerGuestbookCommentSummary {
  id: string;
  author: string;
  message: string;
  pageSlug: string;
  createdAt: string | null;
}

function toIsoString(value: unknown) {
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = value ? new Date(String(value)) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;
}

export function readMobileClientEditorToken(request: Request) {
  const authorization = request.headers.get('authorization')?.trim() ?? '';
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  const token = authorization.slice(7).trim();
  return token || null;
}

export async function authorizeMobileClientEditorRequest(
  request: Request,
  pageSlug: string
) {
  return getAuthorizedClientEditorSession(
    pageSlug,
    readMobileClientEditorToken(request)
  );
}

export async function getServerGuestbookCommentsByPageSlug(pageSlug: string) {
  const normalizedPageSlug = pageSlug.trim();
  if (!normalizedPageSlug) {
    return [] as ServerGuestbookCommentSummary[];
  }

  const db = getServerFirestore();
  if (!db) {
    return [] as ServerGuestbookCommentSummary[];
  }

  const snapshot = await db
    .collection('guestbooks')
    .doc(normalizedPageSlug)
    .collection('comments')
    .get();

  return snapshot.docs
    .map((commentSnapshot) => {
      const data = commentSnapshot.data() ?? {};
      if (data.deleted === true) {
        return null;
      }

      return {
        id: commentSnapshot.id,
        author:
          typeof data.author === 'string' && data.author.trim()
            ? data.author.trim()
            : '익명',
        message:
          typeof data.message === 'string' ? data.message.trim() : '',
        pageSlug:
          typeof data.pageSlug === 'string' && data.pageSlug.trim()
            ? data.pageSlug.trim()
            : normalizedPageSlug,
        createdAt: toIsoString(data.createdAt),
      } satisfies ServerGuestbookCommentSummary;
    })
    .filter(
      (comment): comment is ServerGuestbookCommentSummary =>
        comment !== null && Boolean(comment.message)
    )
    .sort((left, right) => {
      const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
      const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
      return rightTime - leftTime;
    });
}

export function buildMobileInvitationLinks(
  origin: string,
  pageSlug: string,
  defaultTheme: InvitationThemeKey = DEFAULT_INVITATION_THEME
) {
  const baseOrigin = origin.replace(/\/+$/g, '');
  const normalizedPageSlug = pageSlug.trim().replace(/^\/+|\/+$/g, '');
  const themeUrls = INVITATION_THEME_KEYS.reduce<Record<InvitationThemeKey, string>>(
    (accumulator, theme) => {
      accumulator[theme] = `${baseOrigin}${buildInvitationThemeRoutePath(
        normalizedPageSlug,
        theme
      )}`;
      return accumulator;
    },
    {} as Record<InvitationThemeKey, string>
  );

  return {
    publicUrl: `${baseOrigin}/${normalizedPageSlug}`,
    previewUrls: {
      default: themeUrls[defaultTheme],
      ...themeUrls,
    },
  };
}
