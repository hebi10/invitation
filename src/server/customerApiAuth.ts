import 'server-only';

import type { DecodedIdToken } from 'firebase-admin/auth';

import { getServerAuth } from './firebaseAdmin';
import { canUseVerifiedCustomerFeatures } from './customerAuthVerification';

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
  requireVerified?: boolean;
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

  let decodedToken: CustomerDecodedToken;
  try {
    decodedToken = await auth.verifyIdToken(idToken);
  } catch {
    throw new CustomerApiAuthError(
      401,
      '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.'
    );
  }

  if (options.requireVerified && !canUseVerifiedCustomerFeatures(decodedToken)) {
    throw new CustomerApiAuthError(
      403,
      '이메일 인증 후 청첩장을 관리할 수 있습니다. 받은 편지함의 인증 링크를 확인해 주세요.'
    );
  }

  return decodedToken;
}

export async function verifyCustomerUid(
  request: Request,
  options: VerifyCustomerRequestOptions = {}
) {
  const decodedToken = await verifyCustomerRequest(request, options);
  return decodedToken.uid;
}
