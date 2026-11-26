import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { normalizeEventTypeKey, DEFAULT_EVENT_TYPE } from '@/lib/eventTypes';
import { resolvePublicInvitationIntro } from '@/lib/publicInvitationIntro';
import PublicInvitationGifIntro from '@/components/sections/InvitationIntro/PublicInvitationGifIntro';

export const metadata: Metadata = {
  title: '공개 인트로 통합 QA',
  robots: { index: false, follow: false },
};

export default async function PublicIntroQaPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; intro?: string; slug?: string }>;
}) {
  if (process.env.NODE_ENV !== 'development') notFound();

  const params = await searchParams;
  const eventType = normalizeEventTypeKey(params.event, DEFAULT_EVENT_TYPE);
  const slug = typeof params.slug === 'string' && /^[a-z0-9-]{1,50}$/.test(params.slug)
    ? params.slug
    : 'qa-invitation';
  const decision = resolvePublicInvitationIntro(params.intro, 'none', eventType);

  return (
    <>
      <main
        data-intro-qa-body
        data-event-type={eventType}
        style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#fafafa', color: '#222' }}
      >
        <section id="details" style={{ textAlign: 'center', padding: 16 }}>
          <h1>초대장 본문</h1>
          <p>테스트 전용 가상 초대장입니다.</p>
        </section>
      </main>
      {decision.kind === 'gif' ? (
        <PublicInvitationGifIntro slug={slug} preset={decision.preset} />
      ) : null}
    </>
  );
}
