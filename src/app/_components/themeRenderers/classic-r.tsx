'use client';

import WeddingLoaderMessage, {
  type WeddingLoaderMessageBaseProps,
} from '@/components/sections/WeddingLoader/WeddingLoaderMessage';
import {
  GallerySimple,
  GiftInfoSimple,
  GreetingSimple,
  GuestbookSimple,
  LocationMapSimple,
  ScheduleSimple,
  WeddingCalendarSimple,
} from '@/components/sections';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';

import {
  createWeddingCalendarEvent,
  createWeddingThemeRenderer,
  getCeremonyAddress,
  getCeremonyContact,
  getCeremonySchedule,
  getMapDescription,
  getReceptionSchedule,
  getThemePageData,
  shouldShowGiftInfo,
} from '../weddingPageRenderers';
import styles from './classic-r.module.css';

const LOADING_MESSAGES = [
  '초대장을 정돈하고 있습니다.',
  '첫 화면의 사진을 준비하고 있습니다.',
  '잠시 후 초대장을 보여드릴게요.',
];

function formatDate(date: Date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function ClassicLoader({
  brideName,
  groomName,
  mainImage,
  onLoadComplete,
  preloadImages,
}: WeddingLoaderMessageBaseProps) {
  return (
    <WeddingLoaderMessage
      brideName={brideName}
      groomName={groomName}
      mainImage={mainImage}
      onLoadComplete={onLoadComplete}
      preloadImages={preloadImages}
      duration={2400}
      minLoadTime={1200}
      styles={styles}
      loadingMessages={LOADING_MESSAGES}
      messageClassName={styles.loadingText}
      renderHero={(themeStyles) => (
        <div className={themeStyles.loaderInner}>
          <div className={themeStyles.loaderDate}>Wedding Invitation</div>
          <div className={themeStyles.loaderNames}>
            <span>{groomName}</span>
            <span className={themeStyles.loaderAmpersand}>&amp;</span>
            <span>{brideName}</span>
          </div>
          <div className={themeStyles.loaderDivider} />
        </div>
      )}
      renderHeading={({ styles: themeStyles }) => (
        <h1 className={themeStyles.loaderHeading}>Classic Renewal</h1>
      )}
      renderSubtitle={(themeStyles) => (
        <p className={themeStyles.loaderSubtitle}>차분한 첫 장면을 준비 중입니다.</p>
      )}
    />
  );
}

export default createWeddingThemeRenderer({
  ariaLabelSuffix: ' (Classic Renewal)',
  rootClassName: styles.classicTheme,
  renderLoader: ({ state }) => (
    <ClassicLoader
      groomName={state.pageConfig.groomName}
      brideName={state.pageConfig.brideName}
      mainImage={state.heroImageUrl || state.mainImageUrl}
      preloadImages={state.preloadImages}
      onLoadComplete={() => state.setIsLoading(false)}
    />
  ),
  sections: [
    ({ state }) => {
      const pageData = getThemePageData(state.pageConfig, 'classic-r');
      const heroImageUrl = state.heroImageUrl || state.mainImageUrl;
      const ceremonyTime = pageData?.ceremonyTime?.trim();

      return (
        <section className={styles.hero}>
          <div className={styles.heroTop}>
            <span>Wedding</span>
            <span>{formatDate(state.weddingDate)}</span>
          </div>
          <div className={styles.heroImageFrame}>
            {heroImageUrl ? (
              <img
                src={heroImageUrl}
                alt={`${state.pageConfig.groomName} ${state.pageConfig.brideName} 메인 이미지`}
                className={styles.heroImage}
                loading="eager"
                decoding="async"
              />
            ) : (
              <div className={styles.heroFallback} aria-hidden="true" />
            )}
          </div>
          <div className={styles.heroCopy}>
            <h1 className={styles.heroNames}>
              <span className={styles.heroNameLine}>{state.pageConfig.groomName}</span>
              <span className={styles.heroAnd}>&amp;</span>
              <span className={styles.heroNameLine}>{state.pageConfig.brideName}</span>
            </h1>
            <p className={styles.heroMeta}>
              {state.pageConfig.date}
              {ceremonyTime ? ` · ${ceremonyTime}` : ''}
              <br />
              {state.pageConfig.venue}
            </p>
            <div className={styles.heroScroll}>Scroll</div>
          </div>
        </section>
      );
    },
    ({ state }) => {
      const pageData = getThemePageData(state.pageConfig, 'classic-r');

      return (
        <GreetingSimple
          message={pageData?.greetingMessage ?? ''}
          author={pageData?.greetingAuthor ?? ''}
          groom={state.pageConfig.couple.groom}
          bride={state.pageConfig.couple.bride}
        />
      );
    },
    ({ state }) => (
      <GallerySimple
        images={state.galleryImageUrls}
        previewImages={state.galleryPreviewImageUrls}
        imagesLoading={state.imagesLoading}
      />
    ),
    ({ state }) => {
      const pageData = getThemePageData(state.pageConfig, 'classic-r');
      const features = resolveInvitationFeatures(
        state.pageConfig.productTier,
        state.pageConfig.features
      );

      return (
        <WeddingCalendarSimple
          title="Wedding Calendar"
          weddingDate={state.weddingDate}
          currentMonth={state.weddingDate}
          events={[
            createWeddingCalendarEvent(state.pageConfig, state.weddingDate, '&', pageData),
          ]}
          showCountdown={features.showCountdown}
          countdownTitle="Until the wedding"
        />
      );
    },
    ({ state }) => {
      const pageData = getThemePageData(state.pageConfig, 'classic-r');

      return (
        <div id="wedding-info">
          <ScheduleSimple
            date={state.pageConfig.date}
            time={pageData?.ceremonyTime ?? ''}
            venue={state.pageConfig.venue}
            address={getCeremonyAddress(state.pageConfig, pageData)}
            ceremony={getCeremonySchedule(state.pageConfig, pageData)}
            reception={getReceptionSchedule(state.pageConfig, pageData)}
            venueGuide={pageData?.venueGuide}
            wreathGuide={pageData?.wreathGuide}
          />
        </div>
      );
    },
    ({ state }) => {
      const pageData = getThemePageData(state.pageConfig, 'classic-r');

      return (
        <LocationMapSimple
          venueName={state.pageConfig.venue}
          address={getCeremonyAddress(state.pageConfig, pageData)}
          description={getMapDescription(state.pageConfig, pageData)}
          contact={getCeremonyContact(state.pageConfig, pageData)}
          kakaoMapConfig={pageData?.kakaoMap}
        />
      );
    },
    ({ state }) => {
      const features = resolveInvitationFeatures(
        state.pageConfig.productTier,
        state.pageConfig.features
      );

      return features.showGuestbook ? (
        <GuestbookSimple pageSlug={state.pageConfig.slug} />
      ) : null;
    },
    ({ state }) =>
      shouldShowGiftInfo(state) ? (
        <GiftInfoSimple
          groomAccounts={state.giftInfo?.groomAccounts ?? []}
          brideAccounts={state.giftInfo?.brideAccounts ?? []}
          message={state.giftInfo?.message}
        />
      ) : null,
  ],
});
