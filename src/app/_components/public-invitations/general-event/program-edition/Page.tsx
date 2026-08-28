'use client';

import GalleryGridShared from '@/components/sections/Gallery/GalleryGridShared';
import GuestbookThemed from '@/components/sections/Guestbook/GuestbookThemed';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';

import type { EventPageReadyState } from '../../../eventPageState';
import { buildGeneralEventViewModel } from '../../../generalEvent/generalEventAdapter';
import { InvitationActionLink } from '../../shared/InvitationActionLink';
import { PublicInvitationDateFeature } from '../../shared/PublicInvitationDateFeature';
import styles from './styles.module.css';

type ProgramEditionPageProps = {
  state: EventPageReadyState;
};

function buildEmailHref(value: string) {
  const email = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? `mailto:${email}` : '';
}

function buildPhoneHref(value: string) {
  const phone = value.trim();
  if (!/^\+?[\d\s().-]{7,}$/.test(phone)) {
    return '';
  }

  const normalizedPhone = phone.replace(/[^\d+]/g, '');
  return normalizedPhone.replace(/^\+/, '').length >= 7
    ? `tel:${normalizedPhone}`
    : '';
}

export default function ProgramEditionPage({ state }: ProgramEditionPageProps) {
  const invitationModel = buildGeneralEventViewModel(state);
  const sourceProgramItems =
    state.pageConfig.pageData?.programItems?.filter(
      (item) => item.time.trim() && item.title.trim()
    ) ?? [];
  const model = {
    ...invitationModel,
    programItems: sourceProgramItems,
  };
  const features = resolveInvitationFeatures(
    state.pageConfig.productTier,
    state.pageConfig.features
  );
  const hasContact = Boolean(model.contactEmail || model.contactPhone);
  const emailHref = buildEmailHref(model.contactEmail);
  const phoneHref = buildPhoneHref(model.contactPhone);
  const hasParticipationMethod = hasContact && Boolean(emailHref || phoneHref);
  const hasVisitInformation = Boolean(
    model.address || model.mapDescription || model.mapUrl
  );

  return (
    <main className={styles.page} aria-label={`${model.title} 행사 초대장`}>
      <section
        className={styles.poster}
        data-program-edition-section="poster"
        aria-labelledby="program-edition-title"
      >
        <div className={styles.posterDate}>
          <span>{model.dateLabel}</span>
          <strong>{model.timeLabel}</strong>
        </div>
        <div className={styles.posterMain}>
          <h1 id="program-edition-title" className={styles.eventTitle}>
            {model.title}
          </h1>
          <p className={styles.eventSubtitle}>{model.subtitle}</p>
        </div>
        <div className={styles.posterVenue}>
          <span>장소</span>
          <strong>{model.venueName}</strong>
        </div>
        {model.greeting ? <p className={styles.greeting}>{model.greeting}</p> : null}
      </section>

      {model.programItems.length > 0 ? (
        <section
          className={styles.section}
          data-program-edition-section="program"
          aria-labelledby="program-edition-program-title"
        >
          <h2 id="program-edition-program-title" className={styles.sectionTitle}>
            프로그램
          </h2>
          <ol className={styles.programList}>
            {model.programItems.map((item, index) => (
              <li className={styles.programItem} key={`${item.time}-${item.title}-${index}`}>
                <time className={styles.programTime}>{item.time}</time>
                <div className={styles.programCopy}>
                  <h3>{item.title}</h3>
                  {item.description ? <p>{item.description}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <PublicInvitationDateFeature
        className={styles.section}
        eventDate={state.weddingDate}
        page={state.pageConfig}
        title="행사까지"
        titleClassName={styles.sectionTitle}
      />

      {hasParticipationMethod ? (
        <section
          className={`${styles.section} ${styles.participation}`}
          data-program-edition-section="participation"
          aria-labelledby="program-edition-participation-title"
        >
          <div>
            <h2
              id="program-edition-participation-title"
              className={styles.sectionTitle}
            >
              참여 문의
            </h2>
            {model.contactName ? (
              <p className={styles.contactName}>{model.contactName}</p>
            ) : null}
          </div>
          <div className={styles.actionList}>
            {emailHref ? (
              <InvitationActionLink href={emailHref}>이메일 보내기</InvitationActionLink>
            ) : null}
            {phoneHref ? (
              <InvitationActionLink href={phoneHref}>전화하기</InvitationActionLink>
            ) : null}
          </div>
        </section>
      ) : null}

      {hasVisitInformation ? (
        <section
          className={styles.section}
          data-program-edition-section="visit"
          aria-labelledby="program-edition-visit-title"
        >
          <h2 id="program-edition-visit-title" className={styles.sectionTitle}>
            방문 정보
          </h2>
          <dl className={styles.visitDetails}>
            <div className={styles.detailRow}>
              <dt>장소</dt>
              <dd>{model.venueName}</dd>
            </div>
            {model.address ? (
              <div className={styles.detailRow}>
                <dt>주소</dt>
                <dd>{model.address}</dd>
              </div>
            ) : null}
            {model.mapDescription ? (
              <div className={styles.detailRow}>
                <dt>안내</dt>
                <dd>{model.mapDescription}</dd>
              </div>
            ) : null}
          </dl>
          {model.mapUrl ? (
            <div className={styles.mapAction}>
              <InvitationActionLink href={model.mapUrl} external>
                지도에서 길찾기
              </InvitationActionLink>
            </div>
          ) : null}
        </section>
      ) : null}

      {state.galleryImageUrls.length > 0 ? (
        <div className={styles.gallery} data-program-edition-section="gallery">
          <GalleryGridShared
            images={state.galleryImageUrls}
            previewImages={state.galleryPreviewImageUrls}
            imagesLoading={state.imagesLoading}
            imageAltPrefix={`${model.title} 행사`}
            title="행사의 장면"
            styles={styles}
          />
        </div>
      ) : null}

      {features.showGuestbook ? (
        <div className={styles.guestbook} data-program-edition-section="guestbook">
          <GuestbookThemed
            pageSlug={state.pageConfig.slug}
            styles={styles}
            title="메시지"
            subtitle="행사를 위한 마음을 남겨 주세요."
            statusColors={{ success: '#2e624d', error: '#9a352a' }}
          />
        </div>
      ) : null}

      <footer className={styles.footer}>
        <strong>{model.title}</strong>
        <span>{model.dateLabel}</span>
      </footer>
    </main>
  );
}
