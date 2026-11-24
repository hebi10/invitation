import 'server-only';

import { getServerFirestore } from '../firebaseAdmin';
import { MediaAssetError } from '../mediaAssetService';
import { normalizeEventSummaryRecord, type EventSummaryRecord } from './eventReadThroughDtos';

export type MediaRecord = { summary: EventSummaryRecord; content: unknown; blocked: boolean };

export async function readInvitationMediaRecord(slug: string): Promise<MediaRecord | null> {
  const db = getServerFirestore();
  if (!db) throw new MediaAssetError(503, '이미지 접근 정보를 확인하지 못했습니다.');
  // Direct, consistent reads. Do not call slug repair or sample fallback.
  return db.runTransaction(async transaction => {
    const index = await transaction.get(db.collection('eventSlugIndex').doc(slug));
    const data = index.data();
    if (!index.exists || data?.status !== 'active' || data.slug !== slug ||
        typeof data.eventId !== 'string' || !data.eventId || data.eventId.includes('/')) return null;
    const root = db.collection('events').doc(data.eventId);
    const [event, content] = await Promise.all([
      transaction.get(root), transaction.get(root.collection('content').doc('current')),
    ]);
    if (!event.exists || event.data()?.slug !== slug) return null;
    const raw = event.data() ?? {};
    const summary = normalizeEventSummaryRecord(event.id, raw);
    if (!summary || summary.eventId !== event.id) return null;
    return {
      summary,
      content: content.exists ? content.data() : null,
      blocked: raw.billingAccessHold != null ||
        ['pending', 'running', 'failed'].includes(raw.deletion?.status),
    };
  }, { readOnly: true });
}
