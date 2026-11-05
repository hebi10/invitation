export function canOpenOwnedWeddingPage(
  ownership: {
    status: string;
    summary: { slug?: string; eventType?: string } | null;
  },
  requestedSlug: string
) {
  return ownership.status === 'owner' &&
    ownership.summary?.eventType === 'wedding' &&
    ownership.summary.slug === requestedSlug;
}
