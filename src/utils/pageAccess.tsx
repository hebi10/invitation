export const AccessDeniedPage = ({
  message = '이 페이지에 접근할 수 없습니다.',
  showAdminLink = true,
}: {
  message?: string;
  showAdminLink?: boolean;
}) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        textAlign: 'center',
        background: 'rgb(81 81 81 / 80%)',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '500px',
          width: '100%',
        }}
      >
        <div
          style={{
            fontSize: '64px',
            marginBottom: '20px',
          }}
        >
          🔒
        </div>

        <h1
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            marginBottom: '15px',
            margin: 0,
          }}
        >
          접근 제한
        </h1>

        <p
          style={{
            fontSize: '18px',
            lineHeight: '1.6',
            marginBottom: '30px',
            opacity: 0.9,
          }}
        >
          {message}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <button
            onClick={() => window.history.back()}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            ← 이전 페이지로
          </button>

          <a
            href="/"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              color: '#333',
              padding: '12px 24px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            홈으로 가기
          </a>

          {showAdminLink ? (
            <a
              href="/admin"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                textDecoration: 'none',
                opacity: 0.7,
                transition: 'all 0.2s ease',
              }}
            >
              관리자 로그인
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
};
