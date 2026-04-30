'use client';

import { resolveInvitationFeatures } from '@/lib/invitationProducts';

import type { EventPageReadyState } from '../../eventPageState';
import { buildBirthdayInvitationViewModel } from '../birthdayAdapter';
import type { BirthdayThemeKey } from '../birthdayThemes';
import BirthdayGuestbook from '../BirthdayGuestbook';
import styles from '../BirthdayInvitationPage.module.css';

type BirthdayThemeRendererProps = {
  state: EventPageReadyState;
  theme: BirthdayThemeKey;
};

function getCountdownParts(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());

  return [
    ['DAYS', Math.floor(diff / 86400000)],
    ['HOURS', Math.floor((diff % 86400000) / 3600000)],
    ['MIN', Math.floor((diff % 3600000) / 60000)],
  ] as const;
}

export function BirthdayThemeRenderer({ state, theme }: BirthdayThemeRendererProps) {
  const model = buildBirthdayInvitationViewModel(state);
  const features = resolveInvitationFeatures(
    state.pageConfig.productTier,
    state.pageConfig.features
  );
  const rootClassName = `${styles.page} ${
    theme === 'birthday-floral' ? styles.floral : styles.minimal
  }`;
  const countdownParts = getCountdownParts(model.countdownDate);

  return (
    <main className={rootClassName} aria-label={`${model.name} 생일 초대장`}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>Birthday Party</span>
          <h1 className={styles.title}>{model.name}</h1>
          <p className={styles.subtitle}>{model.subtitle}</p>
          <div className={styles.heroImage}>
            {model.coverImageUrl ? (
              <img src={model.coverImageUrl} alt={`${model.name} 대표 이미지`} />
            ) : (
              <div className={styles.heroImageFallback}>Happy Birthday</div>
            )}
          </div>
          <div className={styles.quickInfo}>
            <div className={styles.quickInfoItem}>
              <span className={styles.quickInfoLabel}>DATE</span>
              <strong className={styles.quickInfoValue}>{model.dateLabel}</strong>
            </div>
            <div className={styles.quickInfoItem}>
              <span className={styles.quickInfoLabel}>TIME</span>
              <strong className={styles.quickInfoValue}>{model.timeLabel}</strong>
            </div>
            <div className={styles.quickInfoItem}>
              <span className={styles.quickInfoLabel}>PLACE</span>
              <strong className={styles.quickInfoValue}>{model.venueName}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Invitation</span>
            <h2 className={styles.sectionTitle}>초대 문구</h2>
          </div>
          <div className={styles.messageCard}>
            <p className={styles.messageText}>{model.greeting}</p>
            <span className={styles.author}>{model.greetingAuthor}</span>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Party Info</span>
            <h2 className={styles.sectionTitle}>일정과 장소</h2>
          </div>
          <div className={styles.detailCard}>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>날짜</span>
                <strong className={styles.detailValue}>{model.dateLabel}</strong>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>시간</span>
                <strong className={styles.detailValue}>{model.timeLabel}</strong>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>장소</span>
                <strong className={styles.detailValue}>{model.venueName}</strong>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>주소</span>
                <strong className={styles.detailValue}>
                  {model.address || '주소를 입력해 주세요'}
                </strong>
              </div>
            </div>
            {model.mapDescription ? (
              <p className={styles.emptyText}>{model.mapDescription}</p>
            ) : null}
            {model.mapUrl ? (
              <a className={styles.mapButton} href={model.mapUrl} target="_blank" rel="noreferrer">
                지도 열기
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {features.showCountdown ? (
        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionKicker}>Countdown</span>
              <h2 className={styles.sectionTitle}>파티까지 남은 시간</h2>
            </div>
            <div className={styles.detailGrid}>
              {countdownParts.map(([label, value]) => (
                <div className={styles.detailItem} key={label}>
                  <span className={styles.detailLabel}>{label}</span>
                  <strong className={styles.detailValue}>{String(value).padStart(2, '0')}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Gallery</span>
            <h2 className={styles.sectionTitle}>사진</h2>
          </div>
          {model.galleryImageUrls.length > 0 ? (
            <div className={styles.galleryGrid}>
              {model.galleryImageUrls.map((imageUrl, index) => (
                <div className={styles.galleryItem} key={`${imageUrl}-${index}`}>
                  <img src={imageUrl} alt={`${model.name} 갤러리 ${index + 1}`} />
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyText}>갤러리 사진을 등록하면 이 영역에 표시됩니다.</p>
          )}
        </div>
      </section>

      {model.venueGuide.length > 0 ? (
        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionKicker}>Notice</span>
              <h2 className={styles.sectionTitle}>추가 안내</h2>
            </div>
            <div className={styles.detailGrid}>
              {model.venueGuide.map((item, index) => (
                <div className={styles.detailItem} key={`${item.title}-${index}`}>
                  <span className={styles.detailLabel}>{item.title || '안내'}</span>
                  <strong className={styles.detailValue}>{item.content}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {features.showGuestbook ? (
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.sectionInner}>
            <BirthdayGuestbook pageSlug={state.pageConfig.slug} />
          </div>
        </section>
      ) : null}
    </main>
  );
}
