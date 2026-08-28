'use client';

import GalleryGridShared from '@/components/sections/Gallery/GalleryGridShared';
import GuestbookThemed from '@/components/sections/Guestbook/GuestbookThemed';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';

import type { EventPageReadyState } from '../../../eventPageState';
import { buildBirthdayInvitationViewModel } from '../../../birthday/birthdayAdapter';
import { InvitationActionLink } from '../../shared/InvitationActionLink';
import styles from './styles.module.css';

type PartyNotesPageProps = {
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

export default function PartyNotesPage({ state }: PartyNotesPageProps) {
  const model = buildBirthdayInvitationViewModel(state);
  const features = resolveInvitationFeatures(
    state.pageConfig.productTier,
    state.pageConfig.features
  );
  const pageData = state.pageConfig.pageData;
  const visibleName = getVisibleName(
    pageData?.greetingAuthor,
    state.pageConfig.displayName,
    state.pageConfig.metadata.title,
    model.name
  );
  const noteMessage =
    pageData?.greetingMessage?.trim() || state.pageConfig.description.trim();
  const hasVenue = Boolean(pageData?.venueName?.trim() || state.pageConfig.venue.trim());
  const hasContact = Boolean(model.contact.trim());
  const hasLocation = Boolean(
    model.address.trim() || model.mapUrl.trim() || model.venueGuide.length > 0
  );
  const contactHref = model.contact.replace(/[^0-9+]/g, '');
  const pageTitle = visibleName ? `${visibleName}의 파티 메모` : '생일 파티 메모';
  const imageAltPrefix = visibleName || '생일 파티';

  return (
    <main className={styles.page} aria-label={pageTitle}>
      <header className={styles.memoHero} data-party-notes-section="memo">
        <div className={styles.memoHeading}>
          <h1>{pageTitle}</h1>
          <p className={styles.memoDate}>{model.dateLabel}</p>
        </div>
        {noteMessage ? <p className={styles.memoMessage}>{noteMessage}</p> : null}
      </header>

      <section
        className={styles.schedule}
        data-party-notes-section="schedule"
        aria-labelledby="party-notes-schedule-title"
      >
        <h2 id="party-notes-schedule-title" className={styles.sectionTitle}>
          파티 시간표
        </h2>
        <dl className={styles.notesList}>
          <div className={styles.noteRow}>
            <dt>날짜</dt>
            <dd>{model.dateLabel}</dd>
          </div>
          <div className={styles.noteRow}>
            <dt>시작 시간</dt>
            <dd>{model.timeLabel}</dd>
          </div>
          {hasVenue ? (
            <div className={styles.noteRow}>
              <dt>모이는 곳</dt>
              <dd>{model.venueName}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {hasContact ? (
        <section
          className={styles.contactSection}
          data-party-notes-section="contact"
          aria-labelledby="party-notes-contact-title"
        >
          <div>
            <h2 id="party-notes-contact-title" className={styles.contactTitle}>
              연락 메모
            </h2>
            <p className={styles.contactNumber}>{model.contact}</p>
          </div>
          <div className={styles.inlineActions}>
            <InvitationActionLink href={`tel:${contactHref}`}>전화</InvitationActionLink>
            <InvitationActionLink href={`sms:${contactHref}`}>문자</InvitationActionLink>
          </div>
        </section>
      ) : null}

      {hasLocation ? (
        <section
          className={styles.section}
          data-party-notes-section="location"
          aria-labelledby="party-notes-location-title"
        >
          <h2 id="party-notes-location-title" className={styles.sectionTitle}>
            장소 메모
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
                지도에서 확인
              </InvitationActionLink>
            </div>
          ) : null}
        </section>
      ) : null}

      {model.galleryImageUrls.length > 0 ? (
        <div className={styles.gallery} data-party-notes-section="gallery">
          <GalleryGridShared
            images={model.galleryImageUrls}
            previewImages={state.galleryPreviewImageUrls}
            imagesLoading={state.imagesLoading}
            imageAltPrefix={`${imageAltPrefix} 파티 사진`}
            title="파티 사진 메모"
            styles={styles}
          />
        </div>
      ) : null}

      {features.showGuestbook ? (
        <div className={styles.guestbook} data-party-notes-section="guestbook">
          <GuestbookThemed
            pageSlug={state.pageConfig.slug}
            styles={styles}
            title="한 줄 축하 메모"
            subtitle="함께할 마음을 짧게 남겨 주세요."
            statusColors={{ success: '#415c49', error: '#9a3f32' }}
          />
        </div>
      ) : null}
    </main>
  );
}
