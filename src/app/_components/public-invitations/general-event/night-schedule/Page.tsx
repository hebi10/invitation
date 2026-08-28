'use client';

import GalleryGridShared from '@/components/sections/Gallery/GalleryGridShared';
import GuestbookThemed from '@/components/sections/Guestbook/GuestbookThemed';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';

import type { EventPageReadyState } from '../../../eventPageState';
import { buildGeneralEventViewModel } from '../../../generalEvent/generalEventAdapter';
import { InvitationActionLink } from '../../shared/InvitationActionLink';
import { InvitationPoster } from '../../shared/InvitationPoster';
import { PublicInvitationDateFeature } from '../../shared/PublicInvitationDateFeature';
import styles from './styles.module.css';

type NightSchedulePageProps = {
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

export default function NightSchedulePage({ state }: NightSchedulePageProps) {
  const model = buildGeneralEventViewModel(state);
  const pageData = state.pageConfig.pageData;
  const sourceProgramItems =
    pageData?.programItems?.filter(
      (item) => item.time.trim() && item.title.trim()
    ) ?? [];
  const sourceSubtitle =
    state.pageConfig.description.trim() || pageData?.subtitle?.trim() || '';
  const sourceGreeting = pageData?.greetingMessage?.trim() ?? '';
  const sourceVenueName =
    pageData?.venueName?.trim() || state.pageConfig.venue.trim();
  const sourceAddress = pageData?.ceremonyAddress?.trim() ?? '';
  const emailHref = buildEmailHref(model.contactEmail);
  const phoneHref = buildPhoneHref(model.contactPhone);
  const hasParticipationMethod = Boolean(emailHref || phoneHref);
  const hasVisitInformation = Boolean(sourceAddress || model.mapUrl);
  const features = resolveInvitationFeatures(
    state.pageConfig.productTier,
    state.pageConfig.features
  );

  return (
    <main className={styles.page} aria-label={`${model.title} 행사 초대장`}>
      <section
        className={styles.hero}
        data-night-schedule-section="poster"
        aria-label={`${model.title} 행사 포스터`}
      >
        <InvitationPoster
          title={model.title}
          dateLabel={model.dateLabel}
          locationLabel={sourceVenueName || undefined}
          tone="night-schedule"
        />
        <div className={styles.heroMeta}>
          <strong>{model.timeLabel}</strong>
          {sourceSubtitle ? <p>{sourceSubtitle}</p> : null}
        </div>
        {sourceGreeting ? <p className={styles.greeting}>{sourceGreeting}</p> : null}
      </section>

      {sourceProgramItems.length > 0 ? (
        <section
          className={styles.schedule}
          data-night-schedule-section="program"
          aria-labelledby="night-schedule-program-title"
        >
          <h2 id="night-schedule-program-title" className={styles.sectionTitle}>
            오늘의 순서
          </h2>
          <ol className={styles.scheduleList}>
            {sourceProgramItems.map((item, index) => (
              <li className={styles.scheduleItem} key={`${item.time}-${item.title}-${index}`}>
                <time>{item.time}</time>
                <div>
                  <h3>{item.title}</h3>
                  {item.description ? <p>{item.description}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <PublicInvitationDateFeature
        className={styles.schedule}
        eventDate={state.weddingDate}
        page={state.pageConfig}
        title="행사까지"
        titleClassName={styles.sectionTitle}
      />

      {hasVisitInformation ? (
        <section
          className={styles.visit}
          data-night-schedule-section="visit"
          aria-labelledby="night-schedule-visit-title"
        >
          <h2 id="night-schedule-visit-title" className={styles.sectionTitle}>
            방문 정보
          </h2>
          <dl className={styles.visitDetails}>
            {sourceVenueName ? (
              <div className={styles.detailRow}>
                <dt>장소</dt>
                <dd>{sourceVenueName}</dd>
              </div>
            ) : null}
            {sourceAddress ? (
              <div className={styles.detailRow}>
                <dt>주소</dt>
                <dd>{sourceAddress}</dd>
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

      {hasParticipationMethod ? (
        <section
          className={styles.participation}
          data-night-schedule-section="participation"
          aria-labelledby="night-schedule-participation-title"
        >
          <div>
            <h2 id="night-schedule-participation-title" className={styles.sectionTitle}>
              참여 문의
            </h2>
            {model.contactName ? <p className={styles.contactName}>{model.contactName}</p> : null}
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

      {state.galleryImageUrls.length > 0 ? (
        <div className={styles.gallery} data-night-schedule-section="gallery">
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
        <div className={styles.guestbook} data-night-schedule-section="guestbook">
          <GuestbookThemed
            pageSlug={state.pageConfig.slug}
            styles={styles}
            title="메시지"
            subtitle="행사를 위한 마음을 남겨 주세요."
            statusColors={{ success: '#b9e27c', error: '#ff9b91' }}
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
