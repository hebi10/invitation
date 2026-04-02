'use client';

import {
  CoverSimple,
  GallerySimple,
  GiftInfoSimple,
  GreetingSimple,
  GuestbookSimple,
  LocationMapSimple,
  ScheduleSimple,
  WeddingCalendarSimple,
  WeddingLoaderSimple,
} from '@/components/sections';

import {
  createWeddingCalendarEvent,
  createWeddingThemeRenderer,
  getCeremonyAddress,
  getCeremonyContact,
  getMapDescription,
} from '../weddingPageRenderers';

export default createWeddingThemeRenderer({
  ariaLabelSuffix: ' (심플 버전)',
  renderLoader: ({ state }) => (
    <WeddingLoaderSimple
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
      <CoverSimple
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
      <GreetingSimple
        message={state.pageConfig.pageData?.greetingMessage ?? ''}
        author={state.pageConfig.pageData?.greetingAuthor ?? ''}
        groom={state.pageConfig.couple.groom}
        bride={state.pageConfig.couple.bride}
      />
    ),
    ({ state }) => (
      <GallerySimple images={state.galleryImageUrls} />
    ),
    ({ state }) => (
      <WeddingCalendarSimple
        title="행복한 순간을 함께하세요"
        weddingDate={state.weddingDate}
        currentMonth={state.weddingDate}
        events={[createWeddingCalendarEvent(state.pageConfig, state.weddingDate, '♥')]}
        showCountdown={true}
        countdownTitle="결혼식까지"
      />
    ),
    ({ state }) => (
      <div id="wedding-info">
        <ScheduleSimple
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
      <LocationMapSimple
        venueName={state.pageConfig.venue}
        address={getCeremonyAddress(state.pageConfig)}
        description={getMapDescription(state.pageConfig)}
        contact={getCeremonyContact(state.pageConfig)}
        kakaoMapConfig={state.pageConfig.pageData?.kakaoMap}
      />
    ),
    ({ state }) => <GuestbookSimple pageSlug={state.pageConfig.slug} />,
    ({ state }) =>
      state.giftInfo ? (
        <GiftInfoSimple
          groomAccounts={state.giftInfo.groomAccounts ?? []}
          brideAccounts={state.giftInfo.brideAccounts ?? []}
          message={state.giftInfo.message}
        />
      ) : null,
  ],
});
