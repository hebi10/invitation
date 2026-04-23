import 'server-only';

import type { DecodedIdToken } from 'firebase-admin/auth';

import { isServerAdminUserEnabled } from './adminUserServerService';
import { getServerAuth } from './firebaseAdmin';

export class AdminApiAuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'AdminApiAuthError';
    this.status = status;
  }
}

export async function verifyAdminRequest(request: Request): Promise<DecodedIdToken> {
  const authHeader = request.headers.get('authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!idToken) {
    throw new AdminApiAuthError(401, '로그인 토큰이 없습니다. 다시 로그인해 주세요.');
  }

  const serverAuth = getServerAuth();
  if (!serverAuth) {
    throw new AdminApiAuthError(500, 'Firebase Admin Auth를 초기화하지 못했습니다.');
  }

  const decodedToken = await serverAuth.verifyIdToken(idToken);
  const isAdmin = await isServerAdminUserEnabled(decodedToken.uid);

  if (!isAdmin) {
    throw new AdminApiAuthError(403, '관리자 권한이 없습니다.');
  }

  return decodedToken;
}
