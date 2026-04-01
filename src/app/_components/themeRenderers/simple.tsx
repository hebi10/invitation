'use client';

import Cover_1 from '@/components/Cover_1';
import Gallery_1 from '@/components/Gallery_1';
import GiftInfo_1 from '@/components/GiftInfo_1';
import Greeting_1 from '@/components/Greeting_1';
import Guestbook_1 from '@/components/Guestbook_1';
import LocationMap_1 from '@/components/LocationMap_1';
import Schedule_1 from '@/components/Schedule_1';
import WeddingCalendar_1 from '@/components/WeddingCalendar_1';
import WeddingLoader_1 from '@/components/WeddingLoader_1';

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
    <WeddingLoader_1
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
      <Cover_1
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
      <Greeting_1
        message={state.pageConfig.pageData?.greetingMessage ?? ''}
        author={state.pageConfig.pageData?.greetingAuthor ?? ''}
        groom={state.pageConfig.couple.groom}
        bride={state.pageConfig.couple.bride}
      />
    ),
    ({ state }) => (
      <Gallery_1 images={state.galleryImageUrls} />
    ),
    ({ state }) => (
      <WeddingCalendar_1
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
        <Schedule_1
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
      <LocationMap_1
        venueName={state.pageConfig.venue}
        address={getCeremonyAddress(state.pageConfig)}
        description={getMapDescription(state.pageConfig)}
        contact={getCeremonyContact(state.pageConfig)}
        kakaoMapConfig={state.pageConfig.pageData?.kakaoMap}
      />
    ),
    ({ state }) => <Guestbook_1 pageSlug={state.pageConfig.slug} />,
    ({ state }) =>
      state.giftInfo ? (
        <GiftInfo_1
          groomAccounts={state.giftInfo.groomAccounts ?? []}
          brideAccounts={state.giftInfo.brideAccounts ?? []}
          message={state.giftInfo.message}
        />
      ) : null,
  ],
});
