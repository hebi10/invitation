import 'server-only';

import {
  CLIENT_EDITOR_SESSION_COOKIE,
  verifyClientEditorSessionValue,
} from './clientEditorSession';

export async function getAuthorizedClientEditorSession(
  pageSlug: string,
  sessionValue: string | undefined | null
) {
  const session = verifyClientEditorSessionValue(sessionValue);
  if (!session || session.pageSlug !== pageSlug) {
    return null;
  }

  return {
    session,
    cookieName: CLIENT_EDITOR_SESSION_COOKIE,
  };
}
