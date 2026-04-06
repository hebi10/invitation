import 'server-only';

import {
  CLIENT_EDITOR_SESSION_COOKIE,
  verifyClientEditorSessionValue,
} from './clientEditorSession';
import { getServerClientPasswordRecord } from './clientPasswordServerService';

export async function getAuthorizedClientEditorSession(
  pageSlug: string,
  sessionValue: string | undefined | null
) {
  const session = verifyClientEditorSessionValue(sessionValue);
  if (!session || session.pageSlug !== pageSlug) {
    return null;
  }

  const passwordRecord = await getServerClientPasswordRecord(pageSlug);
  if (!passwordRecord) {
    return null;
  }

  if (session.passwordVersion !== passwordRecord.passwordVersion) {
    return null;
  }

  return {
    session,
    passwordRecord,
    cookieName: CLIENT_EDITOR_SESSION_COOKIE,
  };
}
