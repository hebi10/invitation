'use client';

import { useEffect, useState } from 'react';
import InvitationIntroPicker from '@/components/sections/InvitationIntro/InvitationIntroPicker';
import type { InvitationIntroChoice } from '@/lib/invitationIntroCatalog';

export default function IntroCatalogPreviewClient() {
  const [selected, setSelected] = useState<InvitationIntroChoice | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px', color: '#242424' }}
      data-intro-catalog-fixture data-intro-catalog-ready={hydrated ? 'true' : 'false'}>
      <h1 style={{ margin: '0 0 12px', fontSize: 22 }}>고객 선택형 인트로 카탈로그</h1>
      <p style={{ fontSize: 14, lineHeight: 1.7 }}>
        개발용 UI 검증 화면입니다. 이곳에서 선택하거나 미리 보는 동작은 저장되지 않습니다.
      </p>
      <InvitationIntroPicker value={selected} onChange={setSelected} savedValue={null} />
      <p role="status" data-intro-catalog-choice style={{ fontSize: 14 }}>
        미저장 선택: {selected ?? '없음'}
      </p>
    </main>
  );
}
