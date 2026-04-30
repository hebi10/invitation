import 'server-only';

import type { DecodedIdToken } from 'firebase-admin/auth';

import { getServerAuth } from './firebaseAdmin';

export class CustomerApiAuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'CustomerApiAuthError';
    this.status = status;
  }
}

type CustomerDecodedToken = Pick<DecodedIdToken, 'uid'> & Partial<DecodedIdToken>;

type CustomerAuthVerifier = {
  verifyIdToken(idToken: string): Promise<CustomerDecodedToken>;
};

type VerifyCustomerRequestOptions = {
  auth?: CustomerAuthVerifier | null;
};

function readBearerToken(request: Request) {
  const authHeader = request.headers.get('authorization') ?? '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
}

export async function verifyCustomerRequest(
  request: Request,
  options: VerifyCustomerRequestOptions = {}
) {
  const idToken = readBearerToken(request);
  if (!idToken) {
    throw new CustomerApiAuthError(401, '로그인 토큰이 없습니다. 다시 로그인해 주세요.');
  }

  const auth = Object.hasOwn(options, 'auth') ? options.auth : getServerAuth();
  if (!auth) {
    throw new CustomerApiAuthError(
      500,
      'Firebase Admin Auth를 초기화하지 못했습니다.'
    );
  }

  try {
    return await auth.verifyIdToken(idToken);
  } catch {
    throw new CustomerApiAuthError(
      401,
      '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.'
    );
  }
}

export async function verifyCustomerUid(request: Request) {
  const decodedToken = await verifyCustomerRequest(request);
  return decodedToken.uid;
}
