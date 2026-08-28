'use client';

import GalleryGridShared from '@/components/sections/Gallery/GalleryGridShared';
import GuestbookThemed from '@/components/sections/Guestbook/GuestbookThemed';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';

import type { EventPageReadyState } from '../../../eventPageState';
import { buildBirthdayInvitationViewModel } from '../../../birthday/birthdayAdapter';
import { InvitationActionLink } from '../../shared/InvitationActionLink';
import { InvitationPoster } from '../../shared/InvitationPoster';
import { PublicInvitationDateFeature } from '../../shared/PublicInvitationDateFeature';
import styles from './styles.module.css';

type BirthdayStoryPageProps = {
  state: EventPageReadyState;
};

const FALLBACK_NAME = '생일 주인공';

function normalizeNameCandidate(candidate?: string) {
  const value = candidate?.trim() ?? '';
  const possessiveName = value.match(/^(.+?)의\s/)?.[1]?.trim();
  return possessiveName || value;
}

function getVisibleName(...candidates: Array<string | undefined>) {
  return (
    candidates
      .map(normalizeNameCandidate)
      .find((candidate) => candidate && candidate !== FALLBACK_NAME) ?? ''
  );
}

export default function BirthdayStoryPage({ state }: BirthdayStoryPageProps) {
  const model = buildBirthdayInvitationViewModel(state);
  const features = resolveInvitationFeatures(
    state.pageConfig.productTier,
    state.pageConfig.features
  );
  const pageData = state.pageConfig.pageData;
  const coverImageUrl = model.coverImageUrl.trim();
  const visibleName = getVisibleName(
    pageData?.greetingAuthor,
    state.pageConfig.displayName,
    state.pageConfig.metadata.title,
    model.name
  );
  const hasVenue = Boolean(pageData?.venueName?.trim() || state.pageConfig.venue.trim());
  const hasContact = Boolean(model.contact.trim());
  const hasLocation = Boolean(
    model.address.trim() || model.mapUrl.trim() || model.venueGuide.length > 0
  );
  const contactHref = model.contact.replace(/[^0-9+]/g, '');
  const storyTitle = visibleName ? `${visibleName}의 생일 이야기` : '오늘의 생일 이야기';
  const imageAltPrefix = visibleName || '생일 주인공';
  const visibleAuthor = model.greetingAuthor.trim() === FALLBACK_NAME
    ? ''
    : model.greetingAuthor.trim();

  return (
    <main className={styles.page} aria-label={storyTitle}>
      <div className={styles.portrait} data-birthday-story-section="portrait">
        {coverImageUrl ? (
          <section className={styles.hero} aria-labelledby="birthday-story-title">
            <figure className={styles.heroFigure}>
              <img
                className={styles.heroImage}
                src={coverImageUrl}
                alt={`${imageAltPrefix} 대표 사진`}
                loading="eager"
                decoding="async"
              />
            </figure>
            <div className={styles.heroCopy}>
              <p className={styles.heroDate}>{model.dateLabel}</p>
              <h1 id="birthday-story-title">{storyTitle}</h1>
            </div>
          </section>
        ) : (
          <InvitationPoster
            title={storyTitle}
            dateLabel={model.dateLabel}
            locationLabel={hasVenue ? model.venueName : undefined}
            tone="birthday-story"
          />
        )}
      </div>

      <section
        className={styles.letter}
        data-birthday-story-section="letter"
        aria-labelledby="birthday-story-letter-title"
      >
        <h2 id="birthday-story-letter-title" className={styles.sectionTitle}>
          축하의 문장
        </h2>
        <p className={styles.letterText}>{model.greeting}</p>
        {visibleAuthor ? <p className={styles.letterAuthor}>{visibleAuthor}</p> : null}
      </section>

      {model.galleryImageUrls.length > 0 ? (
        <div className={styles.gallery} data-birthday-story-section="gallery">
          <GalleryGridShared
            images={model.galleryImageUrls}
            previewImages={state.galleryPreviewImageUrls}
            imagesLoading={state.imagesLoading}
            imageAltPrefix={`${imageAltPrefix} 사진 기록`}
            title="사진으로 남긴 이야기"
            styles={styles}
          />
        </div>
      ) : null}

      <section
        className={styles.schedule}
        data-birthday-story-section="schedule"
        aria-labelledby="birthday-story-schedule-title"
      >
        <h2 id="birthday-story-schedule-title" className={styles.sectionTitle}>
          함께하는 시간
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
      </section>

      <PublicInvitationDateFeature
        className={styles.schedule}
        eventDate={model.countdownDate}
        page={state.pageConfig}
        title="생일까지"
        titleClassName={styles.sectionTitle}
      />

      {hasLocation ? (
        <section
          className={styles.location}
          data-birthday-story-section="location"
          aria-labelledby="birthday-story-location-title"
        >
          <h2 id="birthday-story-location-title" className={styles.sectionTitle}>
            찾아오는 길
          </h2>
          {model.address ? <p className={styles.address}>{model.address}</p> : null}
          {model.venueGuide.length > 0 ? (
            <ul className={styles.venueGuide}>
              {model.venueGuide.map((guide, index) => (
                <li className={styles.guideRow} key={`${guide.title}-${index}`}>
                  {guide.title ? <strong>{guide.title}</strong> : null}
                  {guide.content ? <span>{guide.content}</span> : null}
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

      {hasContact ? (
        <section
          className={styles.contact}
          data-birthday-story-section="contact"
          aria-labelledby="birthday-story-contact-title"
        >
          <div>
            <h2 id="birthday-story-contact-title" className={styles.contactTitle}>
              파티 문의
            </h2>
            <p>{model.contact}</p>
          </div>
          <div className={styles.inlineActions}>
            <InvitationActionLink href={`tel:${contactHref}`}>전화</InvitationActionLink>
            <InvitationActionLink href={`sms:${contactHref}`}>문자</InvitationActionLink>
          </div>
        </section>
      ) : null}

      {features.showGuestbook ? (
        <div className={styles.guestbook} data-birthday-story-section="guestbook">
          <GuestbookThemed
            pageSlug={state.pageConfig.slug}
            styles={styles}
            title="이어 쓰는 축하 이야기"
            subtitle="오늘을 기억할 따뜻한 문장을 남겨 주세요."
            statusColors={{ success: '#515f4c', error: '#8a3c55' }}
          />
        </div>
      ) : null}
    </main>
  );
}
