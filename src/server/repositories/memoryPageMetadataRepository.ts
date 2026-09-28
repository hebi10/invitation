import 'server-only';

import { getServerFirestore } from '../firebaseAdmin';

export const memoryPageMetadataRepository = {
  async findBySlug(slug: string): Promise<Record<string, unknown> | null> {
    const db = getServerFirestore();
    if (!db) return null;
    const snapshot = await db.collection('memory-pages').doc(slug).get();
    return snapshot.exists ? snapshot.data() ?? null : null;
  },
};
