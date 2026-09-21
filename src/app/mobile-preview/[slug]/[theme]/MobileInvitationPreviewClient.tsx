'use client';

import { useEffect, useState } from 'react';
import { EventInvitationRoutePage } from '@/app/_components/EventInvitationPage';
import type { InvitationPage, InvitationThemeKey } from '@/types/invitationPage';

export default function MobileInvitationPreviewClient({ slug, theme }: { slug: string; theme: InvitationThemeKey }) {
  const [page, setPage] = useState<InvitationPage | null>(null);
  const [error, setError] = useState('');
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token');
    window.history.replaceState(null, '', window.location.pathname);
    setToken(current => current ?? value ?? '');
  }, []);
  useEffect(() => {
    if (token === null) return;
    if (!token) { setError('앱의 미리보기 버튼으로 다시 열어 주세요.'); return; }
    let active = true;
    void fetch(`/api/mobile/client-editor/pages/${encodeURIComponent(slug)}/preview`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', referrerPolicy: 'no-referrer',
    }).then(async response => {
      const data = await response.json();
      if (!response.ok || !data.page) throw new Error(data.error || '미리보기를 불러오지 못했습니다.');
      if (active) setPage(data.page);
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : '다시 시도해 주세요.'); });
    return () => { active = false; };
  }, [slug, token]);
  return <>
    <div role="status" style={{ padding: 16, background: '#f4f4f4', color: '#222', textAlign: 'center', fontSize: 14 }}>
      {error || '편집자 미리보기입니다. 확인 후 브라우저를 닫고 앱에서 공개·공유해 주세요.'}
    </div>
    {page ? <EventInvitationRoutePage slug={slug} theme={theme} initialPageConfig={page}
      pageLoader={async () => page} queryScope="experience" showGuestbook={false} externalShareEnabled={false} />
      : !error ? <p role="status">청첩장을 불러오는 중입니다.</p> : null}
  </>;
}
