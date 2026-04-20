import type { Metadata } from 'next';
import Link from 'next/link';

import {
  MOBILE_INVITATION_DELETE_REQUEST_URL,
  MOBILE_INVITATION_EFFECTIVE_DATE,
  MOBILE_INVITATION_PRIVACY_POLICY_PATH,
  MOBILE_INVITATION_SERVICE_NAME,
  MOBILE_INVITATION_SUPPORT_EMAIL,
  MOBILE_INVITATION_SUPPORT_FORM_URL,
} from '../content';
import styles from '../page.module.css';

export const metadata: Metadata = {
  title: '계정 및 데이터 삭제 요청',
  description:
    '모바일 청첩장 앱에서 계정 및 관련 데이터 삭제를 요청하는 방법과 보관 정책을 안내합니다.',
  alternates: {
    canonical: MOBILE_INVITATION_DELETE_REQUEST_URL,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const requestItems = [
  '삭제를 원하는 청첩장 주소(slug) 또는 공개 URL',
  '요청자 확인을 위한 연락 가능한 이메일 주소',
  '삭제 요청 범위: 전체 삭제 또는 일부 데이터 삭제',
  '필요한 경우 본인 확인을 위한 추가 설명',
];

const deletionTargets = [
  '청첩장 운영 정보와 공개 설정',
  '대표 이미지와 갤러리 이미지',
  '기기와 서버에 남아 있는 연동 세션 정보',
];

const retainedTargets = [
  '법령상 보관 의무가 있는 기록',
  '보안, 부정 사용 방지, 분쟁 대응을 위해 필요한 최소한의 운영 기록',
  '결제 검증 및 중복 지급 방지를 위해 필요한 최소한의 거래 확인 기록',
];

export default function MobileInvitationDeleteRequestPage() {
  return (
    <main className={styles.page}>
      <div className={styles.backdrop} />
      <div className={styles.shell}>
        <header className={styles.hero}>
          <span className={styles.eyebrow}>Data Deletion</span>
          <h1 className={styles.title}>{MOBILE_INVITATION_SERVICE_NAME} 계정 및 데이터 삭제 요청</h1>
          <p className={styles.lead}>
            이 페이지는 Google Play Console의 계정 삭제 요청 URL로 사용할 수 있는 전용 안내
            페이지입니다. 앱을 다시 설치하지 않아도 웹에서 바로 삭제 요청 방법을 확인하고 요청을
            보낼 수 있습니다.
          </p>

          <div className={styles.summaryGrid}>
            <section className={styles.summaryCard}>
              <p className={styles.summaryLabel}>요청 방법</p>
              <p className={styles.summaryValue}>이메일 또는 문의 폼으로 접수</p>
            </section>
            <section className={styles.summaryCard}>
              <p className={styles.summaryLabel}>안내 기준일</p>
              <p className={styles.summaryValue}>{MOBILE_INVITATION_EFFECTIVE_DATE}</p>
            </section>
            <section className={styles.summaryCard}>
              <p className={styles.summaryLabel}>Play Console URL</p>
              <p className={styles.summaryValue}>{MOBILE_INVITATION_DELETE_REQUEST_URL}</p>
            </section>
          </div>
        </header>

        <article className={styles.policyCard}>
          <section className={styles.noticeCard}>
            <h2 className={styles.sectionTitle}>바로 요청하기</h2>
            <p className={styles.paragraph}>
              아래 두 채널 중 하나로 삭제 요청을 보내면 됩니다. 이메일 또는 문의 내용에는 이
              페이지 하단의 요청 항목을 함께 적어 주세요.
            </p>
            <div className={styles.ctaRow}>
              <a
                className={styles.primaryCta}
                href={`mailto:${MOBILE_INVITATION_SUPPORT_EMAIL}?subject=${encodeURIComponent(
                  `${MOBILE_INVITATION_SERVICE_NAME} 삭제 요청`
                )}`}
              >
                이메일로 삭제 요청
              </a>
              <a
                className={styles.secondaryCta}
                href={MOBILE_INVITATION_SUPPORT_FORM_URL}
                target="_blank"
                rel="noreferrer"
              >
                문의 폼으로 요청
              </a>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>1. 삭제 요청 절차</h2>
            <ol className={styles.numberedList}>
              <li>이메일 또는 문의 폼으로 삭제 요청을 보냅니다.</li>
              <li>운영자가 요청 내용을 검토하고, 필요한 경우 본인 확인을 위해 추가 정보를 요청할 수 있습니다.</li>
              <li>삭제 범위가 확인되면 합리적인 기간 내에 처리 결과를 회신합니다.</li>
            </ol>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>2. 요청 시 함께 보내야 할 정보</h2>
            <ul className={styles.list}>
              {requestItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>3. 삭제 대상 데이터</h2>
            <ul className={styles.list}>
              {deletionTargets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>4. 보관될 수 있는 데이터</h2>
            <ul className={styles.list}>
              {retainedTargets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className={styles.contactHint}>
              일부 데이터는 법적 의무, 보안, 부정 사용 방지 목적상 일정 기간 보관될 수 있으며,
              이 경우 보관 사유와 범위를 안내합니다.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>5. 문의 채널</h2>
            <div className={styles.contactCard}>
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
              <p className={styles.contactHint}>
                제목 예시: &quot;{MOBILE_INVITATION_SERVICE_NAME} 계정 및 데이터 삭제 요청&quot;
              </p>
            </div>
          </section>
        </article>

        <footer className={styles.footer}>
          <Link className={styles.homeLink} href={MOBILE_INVITATION_PRIVACY_POLICY_PATH}>
            개인정보처리방침 보기
          </Link>
          <p className={styles.footerCopy}>
            이 삭제 요청 페이지는 Play Console 계정 삭제 URL 입력란에 사용할 수 있도록 구성했습니다.
          </p>
        </footer>
      </div>
    </main>
  );
}
