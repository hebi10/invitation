export default function PageEditorPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background:
          'radial-gradient(circle at top left, rgba(191, 219, 254, 0.35), transparent 32%), linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)',
      }}
    >
      <div
        style={{
          width: 'min(560px, 100%)',
          padding: '32px',
          borderRadius: '24px',
          border: '1px solid rgba(148, 163, 184, 0.22)',
          background: 'rgba(255, 255, 255, 0.92)',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: '#2563eb',
          }}
        >
          청첩장 설정 편집기
        </p>
        <h1
          style={{
            margin: '12px 0 0',
            fontSize: '2rem',
            lineHeight: 1.1,
            color: '#0f172a',
          }}
        >
          편집할 청첩장 주소로 접속해 주세요.
        </h1>
        <p
          style={{
            margin: '16px 0 0',
            fontSize: '0.98rem',
            lineHeight: 1.7,
            color: '#475569',
          }}
        >
          고객용 편집기는 <code>/page-editor/페이지-slug</code> 주소에서만 열립니다.
          관리자 페이지의 편집 버튼을 사용하거나, 전달받은 정확한 주소로 접속해 주세요.
        </p>
        <p
          style={{
            margin: '12px 0 0',
            fontSize: '0.92rem',
            lineHeight: 1.7,
            color: '#64748b',
          }}
        >
          편집 화면에서는 문구를 입력하면서 오른쪽 미리보기로 실제 노출 모습을 바로
          확인할 수 있습니다.
        </p>
        <a
          href="/admin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '44px',
            marginTop: '24px',
            padding: '0 18px',
            borderRadius: '999px',
            background: '#0f172a',
            color: '#fff',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          관리자 페이지로 이동
        </a>
      </div>
    </main>
  );
}
