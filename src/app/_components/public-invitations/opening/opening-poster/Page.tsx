'use client';

import GalleryGridShared from '@/components/sections/Gallery/GalleryGridShared';
import GuestbookThemed from '@/components/sections/Guestbook/GuestbookThemed';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';

import type { EventPageReadyState } from '../../../eventPageState';
import { buildOpeningInvitationViewModel } from '../../../opening/openingAdapter';
import { InvitationActionLink } from '../../shared/InvitationActionLink';
import { InvitationPoster } from '../../shared/InvitationPoster';
import { PublicInvitationDateFeature } from '../../shared/PublicInvitationDateFeature';
import styles from './styles.module.css';

type OpeningPosterPageProps = {
  state: EventPageReadyState;
};

function hasGuideContent(item: { title: string; content: string }) {
  return Boolean(item.title.trim() || item.content.trim());
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

export default function OpeningPosterPage({ state }: OpeningPosterPageProps) {
  const model = buildOpeningInvitationViewModel(state);
  const pageData = state.pageConfig.pageData;
  const sourceBrandItems = pageData?.venueGuide?.filter(hasGuideContent) ?? [];
  const sourceBenefitItems = pageData?.wreathGuide?.filter(hasGuideContent) ?? [];
  const sourceVenueName =
    pageData?.venueName?.trim() || state.pageConfig.venue.trim();
  const sourceTagline = state.pageConfig.description.trim();
  const sourceGreeting = pageData?.greetingMessage?.trim() ?? '';
  const sourceAddress = pageData?.ceremonyAddress?.trim() ?? '';
  const sourceMapDescription = pageData?.mapDescription?.trim() ?? '';
  const phoneHref = buildPhoneHref(pageData?.ceremonyContact?.trim() ?? '');
  const hasContact = Boolean(phoneHref);
  const hasVisitInformation = Boolean(
    sourceVenueName || sourceAddress || model.mapUrl
  );
  const features = resolveInvitationFeatures(
    state.pageConfig.productTier,
    state.pageConfig.features
  );

  return (
    <main className={styles.page} aria-label={`${model.businessName} 개업 초대장`}>
      <section
        className={styles.hero}
        data-opening-poster-section="poster"
        aria-label={`${model.businessName} 오픈 포스터`}
      >
        <div className={styles.posterFrame}>
          <InvitationPoster
            title={model.businessName}
            dateLabel={model.openingDateLabel}
            locationLabel={sourceVenueName || undefined}
            tone="opening-poster"
          />
        </div>

        {sourceTagline || sourceGreeting ? (
          <div className={styles.introduction}>
            {sourceTagline ? <p className={styles.tagline}>{sourceTagline}</p> : null}
            {sourceGreeting ? <p className={styles.greeting}>{sourceGreeting}</p> : null}
          </div>
        ) : null}

        {model.mapUrl || hasContact ? (
          <div className={styles.heroActions} aria-label="방문 행동">
            {model.mapUrl ? (
              <InvitationActionLink href={model.mapUrl} external>
                길찾기
              </InvitationActionLink>
            ) : null}
            {hasContact ? (
              <InvitationActionLink href={phoneHref}>전화 문의</InvitationActionLink>
            ) : null}
          </div>
        ) : null}
      </section>

      {sourceBrandItems.length > 0 ? (
        <section
          className={styles.services}
          data-opening-poster-section="services"
          aria-labelledby="opening-poster-services-title"
        >
          <h2 id="opening-poster-services-title" className={styles.sectionTitle}>
            공간과 서비스
          </h2>
          <div className={styles.serviceList}>
            {sourceBrandItems.map((item, index) => (
              <article className={styles.serviceItem} key={`${item.title}-${index}`}>
                {item.title ? <h3>{item.title}</h3> : null}
                {item.content ? <p>{item.content}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {sourceBenefitItems.length > 0 ? (
        <section
          className={styles.benefits}
          data-opening-poster-section="benefits"
          aria-labelledby="opening-poster-benefits-title"
        >
          <h2 id="opening-poster-benefits-title" className={styles.sectionTitle}>
            오픈 혜택
          </h2>
          <ul className={styles.benefitList}>
            {sourceBenefitItems.map((item, index) => (
              <li key={`${item.title}-${index}`}>
                {item.title ? <strong>{item.title}</strong> : null}
                {item.content ? <span>{item.content}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <PublicInvitationDateFeature
        className={styles.visit}
        eventDate={model.openingDate}
        page={state.pageConfig}
        title="오픈까지"
        titleClassName={styles.sectionTitle}
      />

      {hasVisitInformation ? (
        <section
          className={styles.visit}
          data-opening-poster-section="visit"
          aria-labelledby="opening-poster-visit-title"
        >
          <h2 id="opening-poster-visit-title" className={styles.sectionTitle}>
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
            {sourceMapDescription ? (
              <div className={styles.detailRow}>
                <dt>안내</dt>
                <dd>{sourceMapDescription}</dd>
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

      {hasContact ? (
        <section
          className={styles.contact}
          data-opening-poster-section="contact"
          aria-labelledby="opening-poster-contact-title"
        >
          <h2 id="opening-poster-contact-title" className={styles.sectionTitle}>
            문의
          </h2>
          <InvitationActionLink href={phoneHref}>매장에 전화하기</InvitationActionLink>
        </section>
      ) : null}

      {model.galleryImageUrls.length > 0 ? (
        <div className={styles.gallery} data-opening-poster-section="gallery">
          <GalleryGridShared
            images={model.galleryImageUrls}
            previewImages={state.galleryPreviewImageUrls}
            imagesLoading={state.imagesLoading}
            imageAltPrefix={`${model.businessName} 공간`}
            title="공간의 장면"
            styles={styles}
          />
        </div>
      ) : null}

      {features.showGuestbook ? (
        <div className={styles.guestbook} data-opening-poster-section="guestbook">
          <GuestbookThemed
            pageSlug={state.pageConfig.slug}
            styles={styles}
            title="축하 메시지"
            subtitle="새로운 시작을 위한 마음을 남겨 주세요."
            statusColors={{ success: '#315f41', error: '#9b322b' }}
          />
        </div>
      ) : null}

      <footer className={styles.footer}>
        <strong>{model.businessName}</strong>
        <span>{model.openingDateLabel}</span>
      </footer>
    </main>
  );
}
