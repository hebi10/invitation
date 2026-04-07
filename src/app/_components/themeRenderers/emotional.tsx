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
  createWeddingThemeRenderer,
  getCeremonyAddress,
  getCeremonyContact,
  getMapDescription,
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
      <Cover
        title={state.pageConfig.displayName}
        subtitle={state.pageConfig.pageData?.subtitle ?? 'A day when two hearts become one'}
        weddingDate={`${state.pageConfig.date} ${state.pageConfig.pageData?.ceremonyTime ?? ''}`}
        ceremonyTime={state.pageConfig.pageData?.ceremonyTime}
        venueName={state.pageConfig.venue}
        primaryActionTargetId="wedding-info"
        imageUrl={state.mainImageUrl}
        brideName={state.pageConfig.brideName}
        groomName={state.pageConfig.groomName}
        preloadComplete={true}
      />
    ),
    ({ state }) => (
      <Greeting
        message={state.pageConfig.pageData?.greetingMessage ?? ''}
        author={state.pageConfig.pageData?.greetingAuthor ?? ''}
        groom={state.pageConfig.couple.groom}
        bride={state.pageConfig.couple.bride}
      />
    ),
    ({ state }) => {
      const features = resolveInvitationFeatures(
        state.pageConfig.productTier,
        state.pageConfig.features
      );

      return (
        <WeddingCalendar
          title="Wedding Calendar"
          weddingDate={state.weddingDate}
          currentMonth={state.weddingDate}
          events={[createWeddingCalendarEvent(state.pageConfig, state.weddingDate)]}
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
      <div id="wedding-info">
        <Schedule
          date={state.pageConfig.date}
          time={state.pageConfig.pageData?.ceremonyTime ?? ''}
          venue={state.pageConfig.venue}
          address={getCeremonyAddress(state.pageConfig)}
          venueGuide={state.pageConfig.pageData?.venueGuide}
          wreathGuide={state.pageConfig.pageData?.wreathGuide}
        />
      </div>
    ),
    ({ state }) => (
      <LocationMap
        venueName={state.pageConfig.venue}
        address={getCeremonyAddress(state.pageConfig)}
        description={getMapDescription(state.pageConfig)}
        contact={getCeremonyContact(state.pageConfig)}
        kakaoMapConfig={state.pageConfig.pageData?.kakaoMap}
      />
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
