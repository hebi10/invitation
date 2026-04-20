import type { Metadata } from 'next';
import Link from 'next/link';

import {
  MOBILE_INVITATION_DELETE_REQUEST_PATH,
  MOBILE_INVITATION_DELETE_REQUEST_URL,
  MOBILE_INVITATION_EFFECTIVE_DATE,
  MOBILE_INVITATION_PRIVACY_POLICY_URL,
  MOBILE_INVITATION_SERVICE_NAME,
  MOBILE_INVITATION_SUPPORT_EMAIL,
  MOBILE_INVITATION_SUPPORT_FORM_URL,
} from './content';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description:
    '모바일 청첩장 앱의 개인정보 처리 기준, 보관 기간, 삭제 요청 방법, 문의 채널을 안내합니다.',
  alternates: {
    canonical: MOBILE_INVITATION_PRIVACY_POLICY_URL,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const collectionItems = [
  '청첩장 생성과 운영 관리 과정에서 사용자가 직접 입력한 정보: 제목, 소개 문구, 예식 일정, 장소, 연락처, 축의금 계좌 안내, 공개 설정, 디자인 선택 정보',
  '사용자가 업로드한 대표 이미지와 갤러리 이미지',
  '청첩장 편집 인증을 위한 페이지 주소, 비밀번호 검증 정보, 세션 토큰, 세션 만료 시각',
  '기기 내 저장 정보: 연결된 청첩장 카드, 로그인 세션, 글자 크기와 테마 같은 앱 설정',
  '서비스 운영과 보안 대응 과정에서 생성되는 최소한의 요청 처리 기록과 오류 기록',
];

const purposeItems = [
  '청첩장 생성, 수정, 저장, 공개와 운영 관리 기능 제공',
  '대표 이미지와 갤러리 이미지 업로드, 미리보기 생성, 공개 페이지 노출 처리',
  '편집 권한 확인, 세션 유지, 비정상 접근 차단을 위한 인증 및 보안 처리',
  '문의 대응, 오류 분석, 서비스 품질 개선과 운영 이력 확인',
];

const retentionItems = [
  '청첩장 설정 정보와 업로드 이미지는 사용자가 삭제를 요청하거나 서비스 운영상 더 이상 보관이 필요하지 않은 시점까지 보관될 수 있습니다.',
  '로그인 세션과 연결된 청첩장 정보는 기기 내 안전한 저장소에 보관되며, 로그아웃하거나 세션이 만료되면 삭제됩니다.',
  '글자 크기, 테마 등 비민감 설정 정보는 사용자가 앱을 삭제하거나 설정을 초기화할 때까지 기기 내에 남을 수 있습니다.',
  '법령상 보관 의무가 있는 정보는 해당 기간 동안 별도 보관한 뒤 삭제 또는 비식별화할 수 있습니다.',
];

const sharingItems = [
  '서비스는 이용자의 개인정보를 판매하거나, 이용자의 동의 없이 제3자에게 임의로 제공하지 않습니다.',
  '다만 서비스 운영을 위해 Google Firebase(Hosting, Firestore, Storage 등)와 RevenueCat 같은 서비스 제공업체를 사용할 수 있으며, 이들은 개발사를 대신해 데이터를 처리하는 수탁자 성격으로 이용됩니다.',
  '사용자가 외부 링크, 지도, 문의 폼 등 다른 서비스로 이동하는 경우 해당 서비스의 개인정보처리방침이 별도로 적용됩니다.',
];

const rightsItems = [
  '이용자는 본인의 청첩장 정보, 업로드 이미지, 공개 상태에 대한 열람, 수정, 삭제를 요청할 수 있습니다.',
  '계정 및 데이터 삭제 요청은 전용 삭제 요청 페이지 또는 아래 문의 채널을 통해 접수할 수 있습니다.',
  '서비스가 법적 보관 의무나 보안상 사유로 일부 정보를 유지해야 하는 경우, 그 사유와 범위를 안내합니다.',
];

const securityItems = [
  '앱과 서버 간 통신은 HTTPS를 기본으로 사용합니다.',
  '세션 토큰 등 민감한 기기 저장 데이터는 가능한 범위에서 안전한 저장소를 우선 사용합니다.',
  '사진 접근 권한은 사용자가 이미지를 선택해 업로드하는 기능 제공 범위에서만 사용합니다.',
  '이미지 업로드와 편집 API는 인증된 요청만 처리하도록 구성합니다.',
];

export default function MobileInvitationPrivacyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.backdrop} />
      <div className={styles.shell}>
        <header className={styles.hero}>
          <span className={styles.eyebrow}>Privacy Policy</span>
          <h1 className={styles.title}>{MOBILE_INVITATION_SERVICE_NAME} 개인정보처리방침</h1>
          <p className={styles.lead}>
            이 문서는 {MOBILE_INVITATION_SERVICE_NAME} 앱이 청첩장 생성, 운영 관리, 이미지
            업로드, 결제 확인 기능을 제공하는 과정에서 어떤 정보를 어떻게 처리하는지 안내하기
            위한 정책입니다.
          </p>

          <div className={styles.summaryGrid}>
            <section className={styles.summaryCard}>
              <p className={styles.summaryLabel}>적용 대상</p>
              <p className={styles.summaryValue}>{MOBILE_INVITATION_SERVICE_NAME} 앱과 관련 운영 서비스</p>
            </section>
            <section className={styles.summaryCard}>
              <p className={styles.summaryLabel}>시행일</p>
              <p className={styles.summaryValue}>{MOBILE_INVITATION_EFFECTIVE_DATE}</p>
            </section>
            <section className={styles.summaryCard}>
              <p className={styles.summaryLabel}>삭제 요청 URL</p>
              <p className={styles.summaryValue}>{MOBILE_INVITATION_DELETE_REQUEST_URL}</p>
            </section>
          </div>
        </header>

        <article className={styles.policyCard}>
          <section className={styles.noticeCard}>
            <h2 className={styles.sectionTitle}>삭제 요청 안내</h2>
            <p className={styles.paragraph}>
              Play Console과 앱 내 안내에 사용할 전용 삭제 요청 페이지를 별도로 운영합니다.
              계정 또는 데이터 삭제가 필요하면 아래 링크에서 요청 방법과 필요한 정보를 확인할 수
              있습니다.
            </p>
            <div className={styles.ctaRow}>
              <Link className={styles.primaryCta} href={MOBILE_INVITATION_DELETE_REQUEST_PATH}>
                삭제 요청 페이지 열기
              </Link>
              <a className={styles.secondaryCta} href={MOBILE_INVITATION_DELETE_REQUEST_URL}>
                전체 URL 확인
              </a>
            </div>
          </section>

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
            <h2 className={styles.sectionTitle}>4. 제3자 제공 및 처리 위탁</h2>
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
            <p className={styles.contactHint}>
              삭제 요청 전용 안내:
              {' '}
              <Link className={styles.inlineLink} href={MOBILE_INVITATION_DELETE_REQUEST_PATH}>
                {MOBILE_INVITATION_DELETE_REQUEST_URL}
              </Link>
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>6. 앱 권한 사용 안내</h2>
            <p className={styles.paragraph}>
              앱은 대표 이미지와 갤러리 이미지 업로드를 위해 사진 보관함 접근 권한을 요청할 수
              있습니다. 카메라와 마이크 권한은 현재 앱 설정에서 차단되어 있으며, 사진 라이브러리
              권한도 사용자가 직접 이미지를 선택하는 범위에서만 사용합니다.
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
            <h2 className={styles.sectionTitle}>8. 문의 및 삭제 요청 접수 채널</h2>
            <p className={styles.paragraph}>
              개인정보 처리, 수정, 삭제, 공개 중단과 관련한 문의는 아래 채널로 접수할 수
              있습니다. 삭제 요청은 앱 재설치 없이 웹에서 진행할 수 있어야 하므로, 전용 삭제 요청
              페이지와 동일한 연락 수단을 함께 제공합니다.
            </p>
            <div className={styles.contactCard}>
              <p className={styles.contactLabel}>서비스명</p>
              <p className={styles.contactValue}>{MOBILE_INVITATION_SERVICE_NAME}</p>
              <p className={styles.contactLabel}>삭제 요청 페이지</p>
              <a className={styles.contactLink} href={MOBILE_INVITATION_DELETE_REQUEST_URL}>
                {MOBILE_INVITATION_DELETE_REQUEST_URL}
              </a>
              <p className={styles.contactLabel}>문의 이메일</p>
              <a className={styles.contactLink} href={`mailto:${MOBILE_INVITATION_SUPPORT_EMAIL}`}>
                {MOBILE_INVITATION_SUPPORT_EMAIL}
              </a>
              <p className={styles.contactLabel}>문의 폼</p>
              <a
                className={styles.contactLink}
                href={MOBILE_INVITATION_SUPPORT_FORM_URL}
                target="_blank"
                rel="noreferrer"
              >
                {MOBILE_INVITATION_SUPPORT_FORM_URL}
              </a>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>9. 정책 변경 안내</h2>
            <p className={styles.paragraph}>
              관련 법령, 서비스 기능, 보관 정책이 변경될 경우 이 페이지를 통해 개인정보처리방침을
              갱신합니다. 중요한 변경이 있는 경우 앱 또는 운영 채널을 통해 별도 안내할 수
              있습니다.
            </p>
          </section>
        </article>

        <footer className={styles.footer}>
          <Link className={styles.homeLink} href="/">
            홈으로 돌아가기
          </Link>
          <p className={styles.footerCopy}>
            Play Console 개인정보처리방침 URL:
            {' '}
            <a className={styles.inlineLink} href={MOBILE_INVITATION_PRIVACY_POLICY_URL}>
              {MOBILE_INVITATION_PRIVACY_POLICY_URL}
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
