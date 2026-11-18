import type { Metadata } from 'next';
import Link from 'next/link';
import { SAMPLE_INVITATION_PATH, SAMPLE_WEDDING_COVER, sampleWeddingPage } from '@/config/homeWeddingSample';
import '../../_components/public-invitations/wedding/WeddingFonts.css';
import BouquetRibbonPreview from './BouquetRibbonPreview';
import SealedInvitationPreview from './SealedInvitationPreview';
import TracingPaperPreview from './TracingPaperPreview';
import styles from './IntroComparison.module.css';

export const metadata: Metadata = {
  title: '청첩장 인트로 비교',
  description: '같은 샘플 청첩장으로 부케 리본, 봉인된 초대장, 트레이싱지 표지 연출을 비교합니다.',
  robots: { index: false, follow: false },
};

const sample = {
  names: `${sampleWeddingPage.groomName} · ${sampleWeddingPage.brideName}`,
  date: sampleWeddingPage.date,
  photoSrc: SAMPLE_WEDDING_COVER,
};

export default function IntroComparisonPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.backLink} href={SAMPLE_INVITATION_PATH} prefetch={false}>샘플 청첩장으로</Link>
        <header className={styles.header}>
          <h1>청첩장 인트로 비교</h1>
          <p>같은 샘플 청첩장으로 세 가지 연출을 비교합니다.</p>
        </header>

        <div className={styles.previews}>
          <section className={styles.preview} data-intro-preview="bouquet" aria-labelledby="bouquet-title">
            <div className={styles.previewTitle}>
              <h2 id="bouquet-title">부케 리본</h2>
              <span>GIF</span>
            </div>
            <BouquetRibbonPreview names={sample.names} date={sample.date} />
          </section>

          <section className={styles.preview} data-intro-preview="seal" aria-labelledby="seal-title">
            <div className={styles.previewTitle}>
              <h2 id="seal-title">봉인된 초대장</h2>
              <span>GSAP</span>
            </div>
            <SealedInvitationPreview {...sample} />
          </section>

          <section className={styles.preview} data-intro-preview="tracing" aria-labelledby="tracing-title">
            <div className={styles.previewTitle}>
              <h2 id="tracing-title">트레이싱지 표지</h2>
              <span>스크롤</span>
            </div>
            <TracingPaperPreview {...sample} />
          </section>
        </div>
      </div>
    </main>
  );
}
