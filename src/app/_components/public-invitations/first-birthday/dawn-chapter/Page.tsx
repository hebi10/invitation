'use client';

import GalleryGridShared from '@/components/sections/Gallery/GalleryGridShared';
import GuestbookThemed from '@/components/sections/Guestbook/GuestbookThemed';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';

import type { EventPageReadyState } from '../../../eventPageState';
import { buildFirstBirthdayInvitationViewModel } from '../../../firstBirthday/firstBirthdayAdapter';
import { InvitationActionLink } from '../../shared/InvitationActionLink';
import { InvitationPoster } from '../../shared/InvitationPoster';
import styles from './styles.module.css';

type DawnChapterPageProps = {
  state: EventPageReadyState;
};

const FALLBACK_IDENTITY_LABELS = new Set(['아기 이름', '아빠', '엄마']);

function normalizeIdentityCandidate(candidate?: string) {
  const value = candidate?.trim() ?? '';
  const possessiveName = value.match(/^(.+?)의\s/)?.[1]?.trim();
  return possessiveName || value;
}

function getVisibleIdentityText(...candidates: Array<string | undefined>) {
  return (
    candidates
      .map(normalizeIdentityCandidate)
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

export default function DawnChapterPage({ state }: DawnChapterPageProps) {
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
  const pageLabel = visibleBabyName
    ? `${visibleBabyName} 돌잔치 초대장`
    : '돌잔치 초대장';
  const posterTitle = visibleBabyName || '우리의 첫 번째 생일';
  const heroTitle = visibleBabyName
    ? `${visibleBabyName}의 첫 아침`
    : '우리의 첫 아침';
  const imageAltPrefix = visibleBabyName || '아이';
  const contactHref = model.contact.replace(/[^0-9+]/g, '');

  return (
    <main className={styles.page} aria-label={pageLabel}>
      <div className={styles.identity} data-dawn-chapter-section="identity">
        {coverImageUrl ? (
          <section
            className={styles.hero}
            aria-labelledby="dawn-chapter-title"
          >
            <div className={styles.heroHeading}>
              <p className={styles.heroDate}>{model.dateLabel}</p>
              <h1 id="dawn-chapter-title" className={styles.heroTitle}>
                {heroTitle}
              </h1>
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
            <p className={styles.heroGreeting}>{model.greeting}</p>
          </section>
        ) : (
          <div className={styles.posterWrap}>
            <InvitationPoster
              title={posterTitle}
              dateLabel={model.dateLabel}
              locationLabel={hasVenue ? model.venueName : undefined}
              tone="dawn-chapter"
            />
            <p className={styles.posterGreeting}>{model.greeting}</p>
          </div>
        )}
      </div>

      <section
        className={styles.dateRecord}
        data-dawn-chapter-section="date-record"
        aria-labelledby="dawn-chapter-date-title"
      >
        <h2 id="dawn-chapter-date-title" className={styles.dateTitle}>
          첫 번째 생일 기록
        </h2>
        <div className={styles.dateLedger}>
          <p>{model.dateLabel}</p>
          <p>{model.timeLabel}</p>
        </div>
        {visibleGreetingAuthor ? (
          <p className={styles.author}>{visibleGreetingAuthor}</p>
        ) : null}
      </section>

      {model.galleryImageUrls.length > 0 ? (
        <div className={styles.growth} data-dawn-chapter-section="growth">
          <GalleryGridShared
            images={model.galleryImageUrls}
            previewImages={state.galleryPreviewImageUrls}
            imagesLoading={state.imagesLoading}
            imageAltPrefix={`${imageAltPrefix} 성장 장면`}
            title="성장 장면"
            styles={styles}
          />
        </div>
      ) : null}

      <section
        className={styles.section}
        data-dawn-chapter-section="schedule"
        aria-labelledby="dawn-chapter-schedule-title"
      >
        <h2 id="dawn-chapter-schedule-title" className={styles.sectionTitle}>
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
          <div className={styles.inlineActions}>
            <InvitationActionLink href={`tel:${contactHref}`}>전화하기</InvitationActionLink>
            <InvitationActionLink href={`sms:${contactHref}`}>문자 보내기</InvitationActionLink>
          </div>
        ) : null}
      </section>

      {hasLocation ? (
        <section
          className={styles.section}
          data-dawn-chapter-section="location"
          aria-labelledby="dawn-chapter-location-title"
        >
          <h2 id="dawn-chapter-location-title" className={styles.sectionTitle}>
            오시는 길
          </h2>
          {model.address ? <p className={styles.address}>{model.address}</p> : null}
          {model.venueGuide.length > 0 ? (
            <ul className={styles.venueGuide}>
              {model.venueGuide.map((guide, index) => (
                <li className={styles.guideRow} key={`${guide.title}-${index}`}>
                  {guide.title ? <span className={styles.guideTitle}>{guide.title}</span> : null}
                  {guide.content ? (
                    <span className={styles.guideContent}>{guide.content}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {model.mapUrl ? (
            <div className={styles.singleAction}>
              <InvitationActionLink href={model.mapUrl} external>
                지도 열기
              </InvitationActionLink>
            </div>
          ) : null}
        </section>
      ) : null}

      {features.showGuestbook ? (
        <div className={styles.guestbook} data-dawn-chapter-section="guestbook">
          <GuestbookThemed
            pageSlug={state.pageConfig.slug}
            styles={styles}
            title="축하 메시지"
            subtitle={
              visibleBabyName
                ? `${visibleBabyName}의 첫 번째 생일을 함께 축하해 주세요.`
                : '첫 번째 생일을 함께 축하해 주세요.'
            }
            statusColors={{ success: '#47624f', error: '#8a433e' }}
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
