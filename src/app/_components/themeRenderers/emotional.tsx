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
        subtitle={state.pageConfig.pageData?.subtitle ?? '두 사람이 사랑으로 하나가 되는 날'}
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
    ({ state }) => (
      <WeddingCalendar
        title="행복한 순간을 함께하세요"
        weddingDate={state.weddingDate}
        currentMonth={state.weddingDate}
        events={[createWeddingCalendarEvent(state.pageConfig, state.weddingDate)]}
        showCountdown={true}
        countdownTitle="결혼식까지"
      />
    ),
    ({ state }) => <Gallery images={state.galleryImageUrls} />,
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
    ({ state }) => <Guestbook pageSlug={state.pageConfig.slug} />,
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
