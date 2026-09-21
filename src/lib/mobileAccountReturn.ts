export const MOBILE_ACCOUNT_RETURN_URL = 'mobileinvitation://create';

export function isMobileAccountSource(from: string | string[] | undefined | null) {
  return from === 'mobile';
}

export function shouldRedirectCustomerToDashboard(input: {
  mobileReturn: boolean;
  loading: boolean;
  loggedIn: boolean;
  register: boolean;
  emailVerified: boolean;
}) {
  return !input.mobileReturn && !input.loading && input.loggedIn && (!input.register || input.emailVerified);
}
