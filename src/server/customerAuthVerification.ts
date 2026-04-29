import 'server-only';

import type { DecodedIdToken } from 'firebase-admin/auth';

const TRUSTED_CUSTOMER_SIGN_IN_PROVIDERS = new Set([
  'google.com',
  'apple.com',
]);

export const CUSTOMER_EMAIL_VERIFICATION_REQUIRED_MESSAGE =
  '회원가입 계정은 인증 메일 확인 후 청첩장을 생성할 수 있습니다. 받은 편지함에서 인증 링크를 확인하거나 Google로 로그인해 주세요.';

export function canCreateCustomerOwnedInvitation(decodedToken: DecodedIdToken) {
  const signInProvider =
    typeof decodedToken.firebase?.sign_in_provider === 'string'
      ? decodedToken.firebase.sign_in_provider
      : '';

  return (
    decodedToken.email_verified === true ||
    TRUSTED_CUSTOMER_SIGN_IN_PROVIDERS.has(signInProvider)
  );
}
