function photoIdentity(imageUrl: string): string {
  const value = imageUrl.trim();

  try {
    const url = new URL(value);
    if (
      url.hostname === 'firebasestorage.googleapis.com' &&
      /^\/v0\/b\/[^/]+\/o\/.+/.test(url.pathname)
    ) {
      // Download tokens can rotate without changing the stored photograph.
      url.searchParams.delete('token');
      url.searchParams.sort();
      return url.toString();
    }
  } catch {
    // Local image paths keep their exact identity.
  }

  return value;
}

export function getRomanticPhotoSequence(
  images: string[],
  coverImageUrl: string,
  previewImages?: string[]
): { previewIndices: number[]; closingImageUrl: string | undefined } {
  const coverIdentity = photoIdentity(coverImageUrl);
  const imageIdentities = images.map((image, index) =>
    [photoIdentity(image), photoIdentity(previewImages?.[index] ?? '')].filter(Boolean)
  );
  // Resolve cover aliases first so a later preview also excludes earlier copies.
  const coverIdentities = imageIdentities
    .filter((identities) => identities.includes(coverIdentity))
    .flat();
  const seen = new Set([coverIdentity, ...coverIdentities].filter(Boolean));
  const candidateIndices: number[] = [];

  images.forEach((image, index) => {
    if (!image.trim()) return;

    const identities = imageIdentities[index];
    const isDuplicate = identities.some((identity) => seen.has(identity));
    identities.forEach((identity) => seen.add(identity));
    if (!isDuplicate) candidateIndices.push(index);
  });

  const closingIndex = candidateIndices.length >= 3 ? candidateIndices.pop() : undefined;

  return {
    previewIndices: candidateIndices.slice(0, 5),
    closingImageUrl: closingIndex === undefined ? undefined : images[closingIndex],
  };
}
