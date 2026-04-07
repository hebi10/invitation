'use client';

import {
  Cover,
  Gallery,
  GiftInfo,
  Greeting,
  Guestbook,
  LocationMap,
  Schedule,
  WeddingCalendar,
  WeddingLoader,
} from '@/components/sections';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';

import {
  createWeddingCalendarEvent,
  getCeremonySchedule,
  createWeddingThemeRenderer,
  getCeremonyAddress,
  getCeremonyContact,
  getMapDescription,
  getReceptionSchedule,
  getThemePageData,
  shouldShowGiftInfo,
} from '../weddingPageRenderers';

export default createWeddingThemeRenderer({
  renderLoader: ({ state }) => (
    <WeddingLoader
      groomName={state.pageConfig.groomName}
      brideName={state.pageConfig.brideName}
      onLoadComplete={() => state.setIsLoading(false)}
      mainImage={state.mainImageUrl}
      preloadImages={state.preloadImages}
      duration={2500}
    />
  ),
  sections: [
    ({ state }) => (
      (() => {
        const pageData = getThemePageData(state.pageConfig, 'emotional');

        return (
          <Cover
            title={state.pageConfig.displayName}
            subtitle={pageData?.subtitle ?? 'A day when two hearts become one'}
            weddingDate={`${state.pageConfig.date} ${pageData?.ceremonyTime ?? ''}`}
            ceremonyTime={pageData?.ceremonyTime}
            venueName={state.pageConfig.venue}
            primaryActionTargetId="wedding-info"
            imageUrl={state.mainImageUrl}
            brideName={state.pageConfig.brideName}
            groomName={state.pageConfig.groomName}
            preloadComplete={true}
          />
        );
      })()
    ),
    ({ state }) => (
      (() => {
        const pageData = getThemePageData(state.pageConfig, 'emotional');

        return (
          <Greeting
            message={pageData?.greetingMessage ?? ''}
            author={pageData?.greetingAuthor ?? ''}
            groom={state.pageConfig.couple.groom}
            bride={state.pageConfig.couple.bride}
          />
        );
      })()
    ),
    ({ state }) => {
      const pageData = getThemePageData(state.pageConfig, 'emotional');
      const features = resolveInvitationFeatures(
        state.pageConfig.productTier,
        state.pageConfig.features
      );

      return (
        <WeddingCalendar
          title="Wedding Calendar"
          weddingDate={state.weddingDate}
          currentMonth={state.weddingDate}
          events={[
            createWeddingCalendarEvent(state.pageConfig, state.weddingDate, '♡', pageData),
          ]}
          showCountdown={features.showCountdown}
          countdownTitle="Until the wedding"
        />
      );
    },
    ({ state }) => (
      <Gallery
        images={state.galleryImageUrls}
        imagesLoading={state.imagesLoading}
      />
    ),
    ({ state }) => (
      (() => {
        const pageData = getThemePageData(state.pageConfig, 'emotional');

        return (
          <div id="wedding-info">
            <Schedule
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
      })()
    ),
    ({ state }) => (
      (() => {
        const pageData = getThemePageData(state.pageConfig, 'emotional');

        return (
          <LocationMap
            venueName={state.pageConfig.venue}
            address={getCeremonyAddress(state.pageConfig, pageData)}
            description={getMapDescription(state.pageConfig, pageData)}
            contact={getCeremonyContact(state.pageConfig, pageData)}
            kakaoMapConfig={pageData?.kakaoMap}
          />
        );
      })()
    ),
    ({ state }) => {
      const features = resolveInvitationFeatures(
        state.pageConfig.productTier,
        state.pageConfig.features
      );

      return features.showGuestbook ? <Guestbook pageSlug={state.pageConfig.slug} /> : null;
    },
    ({ state }) =>
      shouldShowGiftInfo(state) ? (
        <GiftInfo
          groomAccounts={state.giftInfo?.groomAccounts ?? []}
          brideAccounts={state.giftInfo?.brideAccounts ?? []}
          message={state.giftInfo?.message}
        />
      ) : null,
  ],
});
