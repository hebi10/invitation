'use client';

import Cover_4 from '@/components/Cover_4';
import Gallery_4 from '@/components/Gallery_4';
import GiftInfo_4 from '@/components/GiftInfo_4';
import Greeting_4 from '@/components/Greeting_4';
import Guestbook_4 from '@/components/Guestbook_4';
import LocationMap_4 from '@/components/LocationMap_4';
import Schedule_4 from '@/components/Schedule_4';
import WeddingCalendar_4 from '@/components/WeddingCalendar_4';
import WeddingLoader_4 from '@/components/WeddingLoader_4';

import {
  createWeddingThemeRenderer,
  getCeremonyAddress,
  getCeremonyContact,
  getMapDescription,
  shouldShowGiftInfo,
} from '../weddingPageRenderers';

export default createWeddingThemeRenderer({
  ariaLabelSuffix: ' (지중해 블루 버전)',
  renderLoader: ({ state }) => (
    <WeddingLoader_4
      groomName={state.pageConfig.groomName}
      brideName={state.pageConfig.brideName}
      onLoadComplete={() => state.setIsLoading(false)}
      mainImage={state.mainImageUrl}
      preloadImages={state.preloadImages}
      duration={1500}
    />
  ),
  sections: [
    ({ state }) => (
      <Cover_4
        title={state.pageConfig.displayName}
        subtitle={state.pageConfig.pageData?.subtitle ?? '영원한 사랑을 약속합니다'}
        weddingDate={`${state.pageConfig.date} ${state.pageConfig.pageData?.ceremonyTime ?? ''}`}
        ceremonyTime={state.pageConfig.pageData?.ceremonyTime}
        venueName={state.pageConfig.venue}
        primaryActionTargetId="wedding-info"
        imageUrl={state.mainImageUrl}
        groomName={state.pageConfig.groomName}
        brideName={state.pageConfig.brideName}
        preloadComplete={true}
      />
    ),
    ({ state }) => (
      <Greeting_4
        message={state.pageConfig.pageData?.greetingMessage ?? ''}
        author={state.pageConfig.pageData?.greetingAuthor ?? ''}
        groom={state.pageConfig.couple.groom}
        bride={state.pageConfig.couple.bride}
      />
    ),
    ({ state }) => <Gallery_4 images={state.galleryImageUrls} />,
    ({ state }) => (
      <WeddingCalendar_4
        weddingDate={state.weddingDate}
        showCountdown={true}
        countdownTitle="결혼식까지"
      />
    ),
    ({ state }) => (
      <div id="wedding-info">
        <Schedule_4
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
      <LocationMap_4
        venueName={state.pageConfig.venue}
        address={getCeremonyAddress(state.pageConfig)}
        description={getMapDescription(state.pageConfig)}
        contact={getCeremonyContact(state.pageConfig)}
        kakaoMapConfig={state.pageConfig.pageData?.kakaoMap}
      />
    ),
    ({ state }) =>
      shouldShowGiftInfo(state) ? (
        <GiftInfo_4
          groomAccounts={state.giftInfo?.groomAccounts ?? []}
          brideAccounts={state.giftInfo?.brideAccounts ?? []}
          message={state.giftInfo?.message}
        />
      ) : null,
    ({ state }) => <Guestbook_4 pageSlug={state.pageConfig.slug} />,
  ],
});
