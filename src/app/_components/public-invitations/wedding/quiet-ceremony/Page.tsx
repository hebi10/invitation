'use client';

import GalleryGridShared from '@/components/sections/Gallery/GalleryGridShared';
import GiftInfoThemed from '@/components/sections/GiftInfo/GiftInfoThemed';
import GuestbookThemed from '@/components/sections/Guestbook/GuestbookThemed';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';

import type { WeddingThemeRendererProps } from '../../../weddingPageRenderers';
import {
  getCeremonyAddress,
  getCeremonySchedule,
  getThemePageData,
  shouldShowGiftInfo,
} from '../../../weddingPageRenderers';
import { InvitationPoster } from '../../shared/InvitationPoster';
import { PublicInvitationDateFeature } from '../../shared/PublicInvitationDateFeature';
import { WeddingStoredContent } from '../../shared/WeddingStoredContent';
import { buildWeddingStoredContent } from '../../shared/weddingStoredContentModel';
import { useImmediateWeddingPageReveal } from '../useImmediateWeddingPageReveal';
import letterpressStyles from '../letterpress/styles.module.css';
import styles from './styles.module.css';

const componentStyles = { ...letterpressStyles, ...styles };

export default function QuietCeremonyPage({ state }: WeddingThemeRendererProps) {
  useImmediateWeddingPageReveal(state);

  const page = state.pageConfig;
  const pageData = getThemePageData(page, 'simple');
  const ceremony = getCeremonySchedule(page, pageData);
  const ceremonyAddress = getCeremonyAddress(page, pageData).trim();
  const storedContent = buildWeddingStoredContent(page, pageData);
  const heroImageUrl = state.mainImageUrl.trim();
  const features = resolveInvitationFeatures(page.productTier, page.features);

  return (
    <main
      className={styles.page}
      aria-label={`${page.groomName}과 ${page.brideName}의 결혼식 초대장`}
    >
      <div data-quiet-ceremony-section="opening">
        {heroImageUrl ? (
          <section
            className={styles.photoHero}
            aria-labelledby="quiet-ceremony-title"
          >
            <div className={styles.photoCopy}>
              <h1 id="quiet-ceremony-title">
                {page.groomName}
                <span aria-hidden="true"> / </span>
                {page.brideName}
              </h1>
              <p>{page.date}</p>
            </div>
            <figure>
              <img
                src={heroImageUrl}
                alt={`${page.displayName} 대표 사진`}
                loading="eager"
                decoding="async"
              />
            </figure>
          </section>
        ) : (
          <section className={styles.informationHero} aria-label="예식 개요">
            <div className={styles.posterWrap}>
              <InvitationPoster
                title={page.displayName}
                dateLabel={page.date}
                locationLabel={page.venue}
                tone="minimal"
              />
            </div>
            <p className={styles.informationNames}>
              {page.groomName}
              <span aria-hidden="true"> / </span>
              {page.brideName}
            </p>
          </section>
        )}
      </div>

      {storedContent.greetingMessage ? (
        <section
          className={styles.scheduleSection}
          aria-labelledby="quiet-ceremony-greeting"
        >
          <h2 id="quiet-ceremony-greeting" className={styles.sectionHeading}>
            초대의 글
          </h2>
          <p className={styles.greetingMessage}>
            {storedContent.greetingMessage}
          </p>
          {storedContent.greetingAuthor ? (
            <p className={styles.greetingAuthor}>
              {storedContent.greetingAuthor}
            </p>
          ) : null}
        </section>
      ) : null}

      <PublicInvitationDateFeature
        className={styles.scheduleSection}
        eventDate={state.weddingDate}
        mode="calendar-countdown"
        page={page}
        title="결혼식까지"
        titleClassName={styles.sectionHeading}
      />

      <section
        id="wedding-info"
        className={styles.scheduleSection}
        data-quiet-ceremony-section="schedule"
        aria-labelledby="quiet-ceremony-schedule"
      >
        <h2 id="quiet-ceremony-schedule" className={styles.sectionHeading}>
          일정
        </h2>
        <dl className={styles.facts}>
          <div>
            <dt>날짜</dt>
            <dd>{page.date}</dd>
          </div>
          {ceremony?.time ? (
            <div>
              <dt>시간</dt>
              <dd>{ceremony.time}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section
        className={styles.locationSection}
        data-quiet-ceremony-section="location"
        aria-labelledby="quiet-ceremony-location"
      >
        <h2 id="quiet-ceremony-location" className={styles.sectionHeading}>
          장소
        </h2>
        <dl className={styles.facts}>
          <div>
            <dt>예식장</dt>
            <dd>{page.venue}</dd>
          </div>
          {ceremonyAddress ? (
            <div>
              <dt>주소</dt>
              <dd>{ceremonyAddress}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <WeddingStoredContent
        className={styles.locationSection}
        model={storedContent}
        titleClassName={styles.sectionHeading}
      />

      {shouldShowGiftInfo(state) ? (
        <div data-quiet-ceremony-section="gift">
          <GiftInfoThemed
            groomAccounts={state.giftInfo?.groomAccounts ?? []}
            brideAccounts={state.giftInfo?.brideAccounts ?? []}
            message={state.giftInfo?.message}
            styles={componentStyles}
            title="계좌 안내"
            groomSectionTitle="신랑측 계좌"
            brideSectionTitle="신부측 계좌"
            copyLabel="복사"
          />
        </div>
      ) : null}

      {state.galleryImageUrls.length > 0 ? (
        <div data-quiet-ceremony-section="gallery">
          <GalleryGridShared
            images={state.galleryImageUrls}
            previewImages={state.galleryPreviewImageUrls}
            imageAltPrefix={`${page.groomName}과 ${page.brideName}의 웨딩 갤러리`}
            title="사진"
            styles={componentStyles}
          />
        </div>
      ) : null}

      {features.showGuestbook ? (
        <div data-quiet-ceremony-section="guestbook">
          <GuestbookThemed
            pageSlug={page.slug}
            styles={componentStyles}
            title="방명록"
            subtitle="축하 메시지를 남겨 주세요."
            statusColors={{ success: '#40554a', error: '#903b35' }}
          />
        </div>
      ) : null}
    </main>
  );
}
