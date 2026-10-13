export function shouldNormalizeAdminPageQuery({
  requestedPage,
  normalizedPage,
  active,
  loading,
  refreshing,
  error,
}: {
  requestedPage: number;
  normalizedPage: number;
  active: boolean;
  loading: boolean;
  refreshing: boolean;
  error: unknown;
}) {
  return active && !loading && !refreshing && !error && requestedPage !== normalizedPage;
}
