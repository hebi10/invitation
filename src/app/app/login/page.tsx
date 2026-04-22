'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';

function buildAppLoginLink(linkToken: string, next: string) {
  const params = new URLSearchParams({
    linkToken,
    next,
  });

  return `mobileinvitation://login?${params.toString()}`;
}

export default function AppLoginRedirectPage() {
  const searchParams = useSearchParams();
  const linkToken = searchParams.get('linkToken')?.trim() ?? '';
  const next = searchParams.get('next')?.trim() || '/manage';
  const appLink = useMemo(() => {
    if (!linkToken) {
      return '';
    }

    return buildAppLoginLink(linkToken, next.startsWith('/') ? next : '/manage');
  }, [linkToken, next]);

  useEffect(() => {
    if (!appLink) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.location.href = appLink;
    }, 200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [appLink]);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'linear-gradient(180deg, rgba(245,239,228,1) 0%, rgba(252,249,244,1) 100%)',
        padding: '24px',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '420px',
          borderRadius: '24px',
          background: '#ffffff',
          border: '1px solid rgba(24, 32, 45, 0.08)',
          boxShadow: '0 22px 50px rgba(24, 32, 45, 0.12)',
          padding: '32px 24px',
          display: 'grid',
          gap: '16px',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#8c5b2a',
            textTransform: 'uppercase',
          }}
        >
          Mobile Invitation
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: '28px',
            lineHeight: 1.2,
            color: '#18202d',
          }}
        >
          앱 연동 링크를 확인하고 있습니다
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: '15px',
            lineHeight: 1.7,
            color: '#4c5562',
          }}
        >
          {appLink
            ? '앱이 설치되어 있으면 잠시 후 자동으로 열립니다. 열리지 않으면 아래 버튼을 눌러 다시 시도해 주세요.'
            : '연동 링크 정보가 없어서 앱을 열 수 없습니다. 새 링크를 다시 받아 주세요.'}
        </p>

        {appLink ? (
          <a
            href={appLink}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '52px',
              borderRadius: '16px',
              background: '#18202d',
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            앱에서 열기
          </a>
        ) : null}

        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '52px',
            borderRadius: '16px',
            background: '#f3efe7',
            color: '#18202d',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          메인으로 이동
        </Link>
      </section>
    </main>
  );
}
