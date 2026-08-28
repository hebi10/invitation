'use client';

import GalleryGridShared from '@/components/sections/Gallery/GalleryGridShared';
import GuestbookThemed from '@/components/sections/Guestbook/GuestbookThemed';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';

import type { EventPageReadyState } from '../../../eventPageState';
import { buildFirstBirthdayInvitationViewModel } from '../../../firstBirthday/firstBirthdayAdapter';
import { InvitationPoster } from '../../shared/InvitationPoster';
import styles from './styles.module.css';

type FirstChapterPageProps = {
  state: EventPageReadyState;
};

const FALLBACK_IDENTITY_LABELS = new Set(['아기 이름', '아빠', '엄마']);

function getVisibleIdentityText(...candidates: Array<string | undefined>) {
  return (
    candidates
      .map((candidate) => candidate?.trim() ?? '')
      .find((candidate) => candidate && !FALLBACK_IDENTITY_LABELS.has(candidate)) ?? ''
  );
}

function removeFallbackIdentityParts(value: string) {
  return value
    .split('·')
    .map((part) => part.trim())
    .filter((part) => part && !FALLBACK_IDENTITY_LABELS.has(part))
    .join(' · ');
}

export default function FirstChapterPage({ state }: FirstChapterPageProps) {
  const model = buildFirstBirthdayInvitationViewModel(state);
  const features = resolveInvitationFeatures(
    state.pageConfig.productTier,
    state.pageConfig.features
  );
  const coverImageUrl = model.coverImageUrl.trim();
  const hasVenue = Boolean(
    state.pageConfig.pageData?.venueName?.trim() || state.pageConfig.venue.trim()
  );
  const hasContact = Boolean(model.contact.trim());
  const hasLocation = Boolean(
    model.address.trim() || model.mapUrl.trim() || model.venueGuide.length > 0
  );
  const visibleBabyName = getVisibleIdentityText(
    model.babyName,
    state.pageConfig.displayName,
    state.pageConfig.metadata.title,
    state.pageConfig.groomName
  );
  const visibleGreetingAuthor = removeFallbackIdentityParts(model.greetingAuthor);
  const visibleParentNames = [model.dadName, model.momName]
    .map(removeFallbackIdentityParts)
    .filter(Boolean);
  const invitationLabel = visibleBabyName
    ? `${visibleBabyName} 돌잔치 초대장`
    : '돌잔치 초대장';
  const posterTitle = visibleBabyName || model.dateLabel;
  const imageAltPrefix = visibleBabyName || '아이';

  return (
    <main className={styles.page} aria-label={invitationLabel}>
      <div
        className={styles.identity}
        data-first-chapter-section="identity"
      >
        {coverImageUrl ? (
          <section
            className={styles.hero}
            aria-labelledby={visibleBabyName ? 'first-chapter-title' : undefined}
            aria-label={visibleBabyName ? undefined : '첫 번째 생일'}
          >
            <div className={styles.heroCopy}>
              {visibleBabyName ? (
                <h1 id="first-chapter-title" className={styles.heroTitle}>
                  {visibleBabyName}
                </h1>
              ) : null}
              <p className={styles.heroAge}>한 살</p>
              <p className={styles.heroDate}>{model.dateLabel}</p>
            </div>
            <figure className={styles.heroFigure}>
              <img
                className={styles.heroImage}
                src={coverImageUrl}
                alt={`${imageAltPrefix} 대표 사진`}
                loading="eager"
                decoding="async"
              />
            </figure>
            <div className={styles.heroMessage}>
              <p>{model.greeting}</p>
              {visibleGreetingAuthor ? <span>{visibleGreetingAuthor}</span> : null}
            </div>
          </section>
        ) : (
          <div className={styles.posterWrap}>
            <InvitationPoster
              title={`${posterTitle} · 한 살`}
              dateLabel={model.dateLabel}
              locationLabel={hasVenue ? model.venueName : undefined}
              tone="first-chapter"
            />
            <p className={styles.posterMessage}>{model.greeting}</p>
          </div>
        )}
      </div>

      {model.galleryImageUrls.length > 0 ? (
        <div
          className={styles.growth}
          data-first-chapter-section="growth"
        >
          <GalleryGridShared
            images={model.galleryImageUrls}
            previewImages={state.galleryPreviewImageUrls}
            imagesLoading={state.imagesLoading}
            imageAltPrefix={`${imageAltPrefix} 성장 기록`}
            title="성장 한 장면"
            styles={styles}
          />
        </div>
      ) : null}

      <section
        className={styles.section}
        data-first-chapter-section="schedule"
        aria-labelledby="first-chapter-schedule-title"
      >
        <h2 id="first-chapter-schedule-title" className={styles.sectionTitle}>
          파티 일정
        </h2>
        <dl className={styles.details}>
          <div className={styles.detailRow}>
            <dt>날짜</dt>
            <dd>{model.dateLabel}</dd>
          </div>
          <div className={styles.detailRow}>
            <dt>시간</dt>
            <dd>{model.timeLabel}</dd>
          </div>
          {hasVenue ? (
            <div className={styles.detailRow}>
              <dt>장소</dt>
              <dd>{model.venueName}</dd>
            </div>
          ) : null}
        </dl>

        {hasContact ? (
          <div className={styles.contact}>
            <p>문의 연락처</p>
            <div className={styles.contactActions}>
              <a href={`tel:${model.contact}`} aria-label="돌잔치 담당자에게 전화하기">
                전화
              </a>
              <a href={`sms:${model.contact}`} aria-label="돌잔치 담당자에게 문자 보내기">
                문자
              </a>
            </div>
          </div>
        ) : null}
      </section>

      {hasLocation ? (
        <section
          className={styles.section}
          data-first-chapter-section="location"
          aria-labelledby="first-chapter-location-title"
        >
          <h2 id="first-chapter-location-title" className={styles.sectionTitle}>
            오시는 길
          </h2>
          {model.address ? <p className={styles.address}>{model.address}</p> : null}
          {model.venueGuide.length > 0 ? (
            <ul className={styles.venueGuide}>
              {model.venueGuide.map((guide, index) => (
                <li className={styles.guideRow} key={`${guide.title}-${index}`}>
                  {guide.title ? (
                    <span className={styles.guideTitle}>{guide.title}</span>
                  ) : null}
                  {guide.content ? (
                    <span className={styles.guideContent}>{guide.content}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {model.mapUrl ? (
            <a
              className={styles.mapLink}
              href={model.mapUrl}
              target="_blank"
              rel="noreferrer"
            >
              지도 열기
            </a>
          ) : null}
        </section>
      ) : null}

      {features.showGuestbook ? (
        <div
          className={styles.guestbook}
          data-first-chapter-section="guestbook"
        >
          <GuestbookThemed
            pageSlug={state.pageConfig.slug}
            styles={styles}
            title="축하 메시지"
            subtitle={
              visibleBabyName
                ? `${visibleBabyName}에게 따뜻한 마음을 남겨 주세요.`
                : '따뜻한 축하의 마음을 남겨 주세요.'
            }
            statusColors={{
              success: '#35312d',
              error: '#8c4b43',
            }}
          />
        </div>
      ) : null}

      {visibleBabyName || visibleParentNames.length > 0 ? (
        <footer className={styles.footer}>
          {visibleBabyName ? <strong>{visibleBabyName}의 첫 번째 생일</strong> : null}
          {visibleParentNames.length > 0 ? (
            <span>{visibleParentNames.join(' · ')}</span>
          ) : null}
        </footer>
      ) : null}
    </main>
  );
}
