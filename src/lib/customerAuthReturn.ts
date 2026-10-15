function validateConnectReturnTo(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;

  // Accept only the literal local route and the base64url token format we issue.
  // No URL normalization: encoded separators, dot segments, queries, and external
  // URLs must not become valid destinations after browser/router parsing.
  const match = /^\/connect\/[A-Za-z0-9_-]+#token=[A-Za-z0-9_-]+$/.exec(value);
  return match?.[0] === value ? value : null;
}

function validateCustomerReturnTo(value: string | null | undefined): string | null {
  const connectReturnTo = validateConnectReturnTo(value);
  if (connectReturnTo) return connectReturnTo;
  if (typeof value !== 'string') return null;

  // Only existing local editor and owner-preview paths may survive authentication.
  // Keep query strings, encoded separators and arbitrary fragments out of this list.
  const match = /^\/(?:page-wizard\/[A-Za-z0-9_-]+|my-invitations\/preview\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+)$/.exec(value);
  return match?.[0] === value ? value : null;
}

export function buildConnectReturnTo(slug: string, token: string): string | null {
  return validateConnectReturnTo(`/connect/${slug}#token=${token}`);
}

export function buildCustomerAuthPath(
  pathname: '/forgot-password' | '/login',
  returnTo?: string | null
): string {
  const safeReturnTo = validateCustomerReturnTo(returnTo);
  // Fragments stay in the browser and are excluded from requests and referrers.
  return safeReturnTo ? `${pathname}#returnTo=${encodeURIComponent(safeReturnTo)}` : pathname;
}

export function readCustomerAuthReturnTo(hash: string): string | null {
  if (!hash.startsWith('#')) return null;
  const values = new URLSearchParams(hash.slice(1)).getAll('returnTo');
  return values.length === 1 ? validateCustomerReturnTo(values[0]) : null;
}
