export function resolveGalleryOpacityTransition(
  prefersReducedMotion: boolean,
  durationMs: number
) {
  return prefersReducedMotion
    ? 'none'
    : `opacity ${durationMs / 1000}s ease`;
}
