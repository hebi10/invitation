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

type AdminDecodedToken = Pick<DecodedIdToken, 'uid'> & Partial<DecodedIdToken>;

type AdminAuthVerifier = {
  verifyIdToken(idToken: string): Promise<AdminDecodedToken>;
};

type VerifyAdminRequestOptions = {
  auth?: AdminAuthVerifier | null;
  isAdminEnabled?: (uid: string) => Promise<boolean>;
};

export async function verifyAdminRequest(
  request: Request,
  options: VerifyAdminRequestOptions = {}
) {
  const authHeader = request.headers.get('authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!idToken) {
    throw new AdminApiAuthError(401, '로그인 토큰이 없습니다. 다시 로그인해 주세요.');
  }

  const auth = Object.hasOwn(options, 'auth') ? options.auth : getServerAuth();
  if (!auth) {
    throw new AdminApiAuthError(500, 'Firebase Admin Auth를 초기화하지 못했습니다.');
  }

  let decodedToken: AdminDecodedToken;
  try {
    decodedToken = await auth.verifyIdToken(idToken);
  } catch {
    throw new AdminApiAuthError(
      401,
      '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.'
    );
  }

  const isAdminEnabled = options.isAdminEnabled ?? isServerAdminUserEnabled;
  const isAdmin = await isAdminEnabled(decodedToken.uid);

  if (!isAdmin) {
    throw new AdminApiAuthError(403, '관리자 권한이 없습니다.');
  }

  return decodedToken;
}
