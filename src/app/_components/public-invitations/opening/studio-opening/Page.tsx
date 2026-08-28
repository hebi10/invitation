'use client';

import GalleryGridShared from '@/components/sections/Gallery/GalleryGridShared';
import GuestbookThemed from '@/components/sections/Guestbook/GuestbookThemed';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';

import type { EventPageReadyState } from '../../../eventPageState';
import { buildOpeningInvitationViewModel } from '../../../opening/openingAdapter';
import { InvitationActionLink } from '../../shared/InvitationActionLink';
import { InvitationPoster } from '../../shared/InvitationPoster';
import styles from './styles.module.css';

type StudioOpeningPageProps = {
  state: EventPageReadyState;
};

function hasGuideContent(items?: Array<{ title: string; content: string }>) {
  return (items ?? []).some((item) => item.title.trim() || item.content.trim());
}

export default function StudioOpeningPage({ state }: StudioOpeningPageProps) {
  const invitationModel = buildOpeningInvitationViewModel(state);
  const pageData = state.pageConfig.pageData;
  const model = {
    ...invitationModel,
    brandItems: hasGuideContent(pageData?.venueGuide)
      ? invitationModel.brandItems
      : [],
    benefitItems: hasGuideContent(pageData?.wreathGuide)
      ? invitationModel.benefitItems
      : [],
  };
  const features = resolveInvitationFeatures(
    state.pageConfig.productTier,
    state.pageConfig.features
  );
  const coverImageUrl = model.coverImageUrl.trim();
  const hasVenue = Boolean(
    pageData?.venueName?.trim() || state.pageConfig.venue.trim()
  );
  const tagline = state.pageConfig.description.trim();
  const greeting = pageData?.greetingMessage?.trim() ?? '';
  const mapDescription = pageData?.mapDescription?.trim() ?? '';

  return (
    <main
      className={styles.page}
      aria-label={`${model.businessName} 개업 초대장`}
    >
      <section
        className={styles.identity}
        data-studio-opening-section="identity"
        aria-labelledby={coverImageUrl ? 'studio-opening-title' : undefined}
      >
        {coverImageUrl ? (
          <>
            <div className={styles.identityCopy}>
              <h1 id="studio-opening-title" className={styles.businessName}>
                {model.businessName}
              </h1>
              {tagline ? <p className={styles.tagline}>{tagline}</p> : null}
              {greeting ? <p className={styles.greeting}>{greeting}</p> : null}
            </div>
            <figure className={styles.heroFigure}>
              <img
                className={styles.heroImage}
                src={coverImageUrl}
                alt={`${model.businessName} 공간 대표 사진`}
                loading="eager"
                decoding="async"
              />
            </figure>
          </>
        ) : (
          <div className={styles.posterWrap}>
            <InvitationPoster
              title={model.businessName}
              dateLabel={model.openingDateLabel}
              locationLabel={hasVenue ? model.venueName : undefined}
              tone="studio-opening"
            />
            <div className={styles.posterCopy}>
              {tagline ? <p className={styles.tagline}>{tagline}</p> : null}
              {greeting ? <p className={styles.greeting}>{greeting}</p> : null}
            </div>
          </div>
        )}
      </section>

      {model.brandItems.length > 0 ? (
        <section
          className={styles.section}
          data-studio-opening-section="services"
          aria-labelledby="studio-opening-services-title"
        >
          <h2 id="studio-opening-services-title" className={styles.sectionTitle}>
            공간과 서비스
          </h2>
          <div className={styles.statementList}>
            {model.brandItems.map((item, index) => (
              <article className={styles.statement} key={`${item.title}-${index}`}>
                {item.title ? <h3>{item.title}</h3> : null}
                {item.content ? <p>{item.content}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {model.galleryImageUrls.length > 0 ? (
        <div data-studio-opening-section="gallery">
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

      {model.benefitItems.length > 0 ? (
        <section
          className={`${styles.section} ${styles.benefits}`}
          data-studio-opening-section="benefits"
          aria-labelledby="studio-opening-benefits-title"
        >
          <h2 id="studio-opening-benefits-title" className={styles.sectionTitle}>
            오픈 혜택
          </h2>
          <div className={styles.statementList}>
            {model.benefitItems.map((item, index) => (
              <article className={styles.statement} key={`${item.title}-${index}`}>
                {item.title ? <h3>{item.title}</h3> : null}
                {item.content ? <p>{item.content}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section
        className={styles.visit}
        data-studio-opening-section="visit"
        aria-labelledby="studio-opening-visit-title"
      >
        <h2 id="studio-opening-visit-title" className={styles.sectionTitle}>
          방문 정보
        </h2>
        <dl className={styles.visitDetails}>
          <div className={styles.detailRow}>
            <dt>오픈일</dt>
            <dd>{model.openingDateLabel}</dd>
          </div>
          <div className={styles.detailRow}>
            <dt>운영 시작</dt>
            <dd>{model.openingTimeLabel}</dd>
          </div>
          {hasVenue ? (
            <div className={styles.detailRow}>
              <dt>장소</dt>
              <dd>{model.venueName}</dd>
            </div>
          ) : null}
          {model.address ? (
            <div className={styles.detailRow}>
              <dt>주소</dt>
              <dd>{model.address}</dd>
            </div>
          ) : null}
          {mapDescription ? (
            <div className={styles.detailRow}>
              <dt>안내</dt>
              <dd>{mapDescription}</dd>
            </div>
          ) : null}
          {model.contact ? (
            <div className={styles.detailRow}>
              <dt>문의</dt>
              <dd className={styles.contactActions}>
                <a href={`tel:${model.contact}`} aria-label={`${model.businessName}에 전화하기`}>
                  전화
                </a>
                <a href={`sms:${model.contact}`} aria-label={`${model.businessName}에 문자 보내기`}>
                  문자
                </a>
              </dd>
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

      {features.showGuestbook ? (
        <div data-studio-opening-section="guestbook">
          <GuestbookThemed
            pageSlug={state.pageConfig.slug}
            styles={styles}
            title="축하 메시지"
            subtitle="새로운 시작을 위한 마음을 남겨 주세요."
            statusColors={{ success: '#2e5a46', error: '#9a3f37' }}
          />
        </div>
      ) : null}

      <footer className={styles.footer}>
        <strong>{model.businessName}</strong>
        {model.footerInfo ? <p>{model.footerInfo}</p> : null}
      </footer>
    </main>
  );
}
