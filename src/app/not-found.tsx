import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background:
          'radial-gradient(circle at top, rgba(255,255,255,1) 0%, rgba(241,245,249,1) 45%, rgba(226,232,240,1) 100%)',
      }}
    >
      <section
        style={{
          width: 'min(100%, 560px)',
          padding: '40px 28px',
          borderRadius: '32px',
          background: 'rgba(255,255,255,0.96)',
          border: '1px solid rgba(148,163,184,0.18)',
          boxShadow: '0 24px 60px rgba(15,23,42,0.08)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            margin: '0 auto 20px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background:
              'linear-gradient(180deg, rgba(37,99,235,0.12) 0%, rgba(59,130,246,0.18) 100%)',
            border: '1px solid rgba(59,130,246,0.14)',
            fontSize: '28px',
          }}
        >
          404
        </div>

        <p
          style={{
            margin: 0,
            fontSize: '0.82rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: '#2563eb',
          }}
        >
          페이지를 찾을 수 없습니다
        </p>

        <h1
          style={{
            margin: '14px 0 12px',
            fontSize: 'clamp(2rem, 5vw, 2.8rem)',
            lineHeight: 1.2,
            color: '#0f172a',
            fontWeight: 800,
            wordBreak: 'keep-all',
          }}
        >
          요청하신 페이지가
          <br />
          존재하지 않습니다.
        </h1>

        <p
          style={{
            margin: '0 auto',
            maxWidth: '420px',
            fontSize: '1rem',
            lineHeight: 1.7,
            color: '#64748b',
            wordBreak: 'keep-all',
          }}
        >
          주소가 잘못 입력되었거나, 페이지가 이동 또는 삭제되었을 수 있습니다.
          아래 버튼을 눌러 메인 페이지 또는 관리자 페이지로 이동해 주세요.
        </p>

        <div
          style={{
            marginTop: '28px',
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '48px',
              padding: '0 20px',
              borderRadius: '999px',
              background: '#0f172a',
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.96rem',
              boxShadow: '0 10px 24px rgba(15,23,42,0.12)',
            }}
          >
            메인으로 이동
          </Link>

          <Link
            href="/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '48px',
              padding: '0 20px',
              borderRadius: '999px',
              background: '#f8fafc',
              color: '#334155',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.96rem',
              border: '1px solid rgba(148,163,184,0.24)',
            }}
          >
            관리자 페이지
          </Link>
        </div>

        <div
          style={{
            marginTop: '24px',
            fontSize: '0.88rem',
            color: '#94a3b8',
          }}
        >
          Error 404
        </div>
      </section>
    </main>
  );
}