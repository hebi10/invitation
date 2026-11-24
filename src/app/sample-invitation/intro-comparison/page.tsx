import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SAMPLE_INVITATION_PATH, SAMPLE_WEDDING_COVER, sampleWeddingPage } from '@/config/homeWeddingSample';
import '../../_components/public-invitations/wedding/WeddingFonts.css';
import AutomaticIntro from './AutomaticIntro';
import styles from './IntroComparison.module.css';

export const metadata: Metadata = {
  title: '청첩장 인트로 비교',
  description: '같은 샘플 청첩장으로 부케 리본, 봉인된 초대장, 웨딩 사진 인화의 자동 연출을 비교합니다.',
  robots: { index: false, follow: false },
};

const sample = {
  names: `${sampleWeddingPage.groomName} · ${sampleWeddingPage.brideName}`,
  date: sampleWeddingPage.date,
  photoSrc: SAMPLE_WEDDING_COVER,
};

const previews = [
  { variant: 'bouquet', title: '부케 리본', method: 'GIF' },
  { variant: 'seal', title: '봉인된 초대장', method: 'GSAP' },
  { variant: 'portrait', title: '웨딩 사진 인화', method: 'CSS' },
] as const;

export default function IntroComparisonPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.navigation} aria-label="샘플 보기">
          <Link className={styles.textLink} href={SAMPLE_INVITATION_PATH} prefetch={false}>샘플 청첩장으로</Link>
          <a className={styles.textLink} href={`${SAMPLE_INVITATION_PATH}intro-comparison/`}>처음부터 다시 보기</a>
        </nav>
        <header className={styles.header}>
          <h1>청첩장 인트로 비교</h1>
          <p>각 연출은 화면에 들어오면 시작되고, 잠시 후 같은 청첩장 표지로 이어집니다.</p>
        </header>

        <div className={styles.previews}>
          {previews.map(({ variant, title, method }) => (
            <section key={variant} className={styles.preview} data-intro-preview={variant} aria-labelledby={`${variant}-title`}>
              <div className={styles.previewTitle}>
                <h2 id={`${variant}-title`}>{title}</h2>
                <span>{method}</span>
              </div>
              <AutomaticIntro variant={variant} {...sample}>
                <div className={styles.cover}>
                  <Image
                    src={sample.photoSrc}
                    alt={`${sample.names} 웨딩 사진`}
                    fill
                    loading="eager"
                    sizes="(min-width: 960px) 32vw, (min-width: 500px) 440px, 92vw"
                    data-intro-cover
                  />
                </div>
              </AutomaticIntro>
              <div className={styles.details}>
                <p className={styles.names}>{sample.names}</p>
                <p className={styles.date}>{sample.date}</p>
                <Link
                  className={styles.textLink}
                  href={`${SAMPLE_INVITATION_PATH}?intro=${variant}`}
                  prefetch={false}
                  aria-label={`${title}로 샘플 청첩장 전체 보기`}
                >
                  샘플 청첩장 전체 보기
                </Link>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
