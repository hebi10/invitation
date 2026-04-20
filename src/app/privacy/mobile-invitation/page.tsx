import type { Metadata } from 'next';
import Link from 'next/link';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description:
    '모바일 청첩장 앱의 개인정보 처리 기준, 보관 기간, 삭제 요청 방법, 문의 채널을 안내합니다.',
  alternates: {
    canonical: 'https://msgnote.kr/privacy/mobile-invitation/',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const effectiveDate = '2026년 4월 20일';
const inquiryUrl = 'https://kmong.com/gig/686626';

const collectionItems = [
  '청첩장 생성 및 운영 관리 과정에서 사용자가 직접 입력한 정보: 예식 일정, 장소, 인사말, 연락처, 계좌 안내, 공개 설정, 디자인 설정 등',
  '사용자가 업로드한 대표 이미지, 갤러리 이미지 및 그 썸네일 파일',
  '페이지 편집 인증에 필요한 청첩장 주소(slug), 비밀번호 입력값, 세션 토큰, 만료 시각 등 인증 정보',
  '앱 내 편의 기능 제공을 위한 기기 저장 정보: 로그인 세션, 연결된 청첩장 카드, 글꼴 크기 및 테마 설정',
  '서비스 운영 및 보안 유지 과정에서 생성될 수 있는 최소한의 접속 기록, 오류 기록, 요청 처리 기록',
];

const purposeItems = [
  '청첩장 생성, 수정, 공개 및 운영 관리 기능 제공',
  '대표 이미지 및 갤러리 이미지 업로드, 썸네일 생성, 공개 페이지 노출 처리',
  '고객 편집 권한 확인, 세션 유지, 비정상 접근 차단 등 인증 및 보안 처리',
  '문의 대응, 오류 분석, 서비스 품질 개선, 운영 이력 확인',
];

const retentionItems = [
  '청첩장 설정 정보와 업로드 이미지는 사용자가 삭제를 요청하거나 서비스 운영상 더 이상 보관이 필요하지 않은 시점까지 보관할 수 있습니다.',
  '앱 로그인 세션 및 연결된 청첩장 정보는 기기 내 안전한 저장소(SecureStore 또는 이에 준하는 저장소)에 보관되며, 로그아웃하거나 세션이 만료되면 삭제됩니다.',
  '글꼴 크기, 테마 등 비민감 설정 정보는 사용자가 앱을 삭제하거나 설정을 초기화할 때까지 기기 내 저장될 수 있습니다.',
  '관계 법령에 따라 보관이 필요한 정보는 해당 법령이 정한 기간 동안 별도로 보관한 뒤 삭제 또는 비식별화합니다.',
];

const sharingItems = [
  '서비스는 이용자의 개인정보를 판매하거나, 이용자의 동의 없이 제3자에게 임의로 제공하지 않습니다.',
  '다만 서비스 운영을 위해 Google Firebase(Hosting, Firestore, Storage 등) 인프라를 사용할 수 있으며, 이 과정에서 데이터가 해당 인프라에 저장 또는 처리될 수 있습니다.',
  '외부 링크, 공유 기능, 지도 또는 제3자 웹페이지로 이동하는 경우에는 해당 서비스 제공자의 개인정보처리방침이 별도로 적용될 수 있습니다.',
];

const rightsItems = [
  '이용자는 본인의 청첩장 정보, 이미지, 공개 설정에 대한 열람, 수정, 삭제를 요청할 수 있습니다.',
  '개인정보 처리에 대한 문의 또는 삭제 요청은 아래 문의 채널을 통해 접수할 수 있습니다.',
  '서비스가 계정 삭제 또는 데이터 삭제를 별도 기능으로 제공하는 경우, 앱 또는 운영 채널 안내에 따라 요청할 수 있습니다.',
];

const securityItems = [
  '세션 토큰과 같은 민감한 앱 데이터는 가능한 범위에서 기기 내 안전한 저장소를 우선 사용해 보관합니다.',
  '페이지 편집 비밀번호는 서버에 평문으로 저장하지 않고, 인증 및 보안을 위해 해시 등 보호 조치를 적용할 수 있습니다.',
  '접근 권한은 필요한 범위로 제한하고, 이미지 업로드 및 편집 API는 인증된 요청만 처리하도록 구성합니다.',
];

export default function MobileInvitationPrivacyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.backdrop} />
      <div className={styles.shell}>
        <header className={styles.hero}>
          <span className={styles.eyebrow}>Privacy Policy</span>
          <h1 className={styles.title}>모바일 청첩장 개인정보처리방침</h1>
          <p className={styles.lead}>
            모바일 청첩장 앱은 청첩장 생성, 운영 관리, 이미지 업로드 기능을 제공하는 과정에서
            이용자의 정보를 처리할 수 있습니다. 본 문서는 서비스가 어떤 정보를 어떤 목적으로
            사용하고, 어떻게 보관 및 삭제하는지 안내하기 위한 정책 초안입니다.
          </p>

          <div className={styles.summaryGrid}>
            <section className={styles.summaryCard}>
              <p className={styles.summaryLabel}>적용 대상</p>
              <p className={styles.summaryValue}>모바일 청첩장 앱 및 연동 웹 서비스</p>
            </section>
            <section className={styles.summaryCard}>
              <p className={styles.summaryLabel}>시행일</p>
              <p className={styles.summaryValue}>{effectiveDate}</p>
            </section>
            <section className={styles.summaryCard}>
              <p className={styles.summaryLabel}>Play Console URL</p>
              <p className={styles.summaryValue}>/privacy/mobile-invitation/</p>
            </section>
          </div>
        </header>

        <article className={styles.policyCard}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>1. 수집하거나 처리할 수 있는 정보</h2>
            <ul className={styles.list}>
              {collectionItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>2. 개인정보 처리 목적</h2>
            <ul className={styles.list}>
              {purposeItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>3. 보관 기간 및 삭제 기준</h2>
            <ul className={styles.list}>
              {retentionItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>4. 제3자 제공 및 외부 서비스 이용</h2>
            <ul className={styles.list}>
              {sharingItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>5. 이용자의 권리와 행사 방법</h2>
            <ul className={styles.list}>
              {rightsItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>6. 앱 권한 사용 안내</h2>
            <p className={styles.paragraph}>
              앱은 대표 이미지와 갤러리 이미지 업로드를 위해 사진 보관함 접근 권한을 요청할 수
              있습니다. 해당 권한은 사용자가 이미지를 선택하는 기능을 제공하기 위한 목적에 한해
              사용하며, 사용자가 선택하지 않은 사진을 임의로 수집하지 않습니다.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>7. 안전성 확보 조치</h2>
            <ul className={styles.list}>
              {securityItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>8. 문의 및 요청 접수 채널</h2>
            <p className={styles.paragraph}>
              개인정보 처리, 수정, 삭제, 공개 중단과 관련한 문의는 아래 공개 문의 채널을 통해
              접수할 수 있습니다.
            </p>
            <div className={styles.contactCard}>
              <p className={styles.contactLabel}>서비스명</p>
              <p className={styles.contactValue}>모바일 청첩장</p>
              <p className={styles.contactLabel}>문의 채널</p>
              <a
                className={styles.contactLink}
                href={inquiryUrl}
                target="_blank"
                rel="noreferrer"
              >
                {inquiryUrl}
              </a>
              <p className={styles.contactHint}>
                운영자 전용 이메일이나 별도 문의 폼이 준비되면 이 섹션을 해당 채널로 교체해 두는
                편이 가장 안전합니다.
              </p>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>9. 정책 변경 안내</h2>
            <p className={styles.paragraph}>
              관련 법령, 서비스 기능, 보관 정책이 변경될 경우 본 페이지를 통해 개인정보처리방침을
              갱신할 수 있습니다. 중요한 변경이 있는 경우 앱 또는 운영 채널에서 별도로 안내할 수
              있습니다.
            </p>
          </section>
        </article>

        <footer className={styles.footer}>
          <Link className={styles.homeLink} href="/">
            홈으로 돌아가기
          </Link>
          <p className={styles.footerCopy}>
            Play Console 등록용 권장 URL: https://msgnote.kr/privacy/mobile-invitation/
          </p>
        </footer>
      </div>
    </main>
  );
}
