export default function NotFoundPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        background:
          'linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(238,242,247,1) 100%)',
      }}
    >
      <section
        style={{
          width: 'min(100%, 560px)',
          padding: '32px 28px',
          borderRadius: '28px',
          background: 'rgba(255,255,255,0.95)',
          border: '1px solid rgba(148,163,184,0.18)',
          boxShadow: '0 18px 44px rgba(15,23,42,0.08)',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '0.8rem',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#2563eb',
          }}
        >
          Not Found
        </p>
        <h1
          style={{
            margin: '12px 0 10px',
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            lineHeight: 1.05,
            color: '#0f172a',
          }}
        >
          This page could not be found.
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: '1rem',
            lineHeight: 1.7,
            color: '#64748b',
          }}
        >
          Check the URL again or go back to the main page.
        </p>
        <div
          style={{
            marginTop: '24px',
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '46px',
              padding: '0 18px',
              borderRadius: '999px',
              background: '#0f172a',
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            Go to Home
          </a>
          <a
            href="/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '46px',
              padding: '0 18px',
              borderRadius: '999px',
              background: 'rgba(148,163,184,0.12)',
              color: '#334155',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            Go to Admin
          </a>
        </div>
      </section>
    </main>
  );
}
