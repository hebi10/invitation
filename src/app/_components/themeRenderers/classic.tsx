'use client';

import Cover_5 from '@/components/Cover_5';
import Gallery_5 from '@/components/Gallery_5';
import GiftInfo_5 from '@/components/GiftInfo_5';
import Greeting_5 from '@/components/Greeting_5';
import Guestbook_5 from '@/components/Guestbook_5';
import LocationMap_5 from '@/components/LocationMap_5';
import Schedule_5 from '@/components/Schedule_5';
import WeddingCalendar_5 from '@/components/WeddingCalendar_5';
import WeddingLoader_5 from '@/components/WeddingLoader_5';

import {
  createWeddingThemeRenderer,
  getCeremonyAddress,
  getCeremonyContact,
  getMapDescription,
  shouldShowGiftInfo,
} from '../weddingPageRenderers';

export default createWeddingThemeRenderer({
  ariaLabelSuffix: ' (한지 클래식 버전)',
  renderLoader: ({ state }) => (
    <WeddingLoader_5
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
      <Cover_5
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
      <Greeting_5
        message={state.pageConfig.pageData?.greetingMessage ?? ''}
        author={state.pageConfig.pageData?.greetingAuthor ?? ''}
        groom={state.pageConfig.couple.groom}
        bride={state.pageConfig.couple.bride}
      />
    ),
    ({ state }) => <Gallery_5 images={state.galleryImageUrls} />,
    ({ state }) => (
      <WeddingCalendar_5
        weddingDate={state.weddingDate}
        showCountdown={true}
        countdownTitle="결혼식까지"
      />
    ),
    ({ state }) => (
      <div id="wedding-info">
        <Schedule_5
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
      <LocationMap_5
        venueName={state.pageConfig.venue}
        address={getCeremonyAddress(state.pageConfig)}
        description={getMapDescription(state.pageConfig)}
        contact={getCeremonyContact(state.pageConfig)}
        kakaoMapConfig={state.pageConfig.pageData?.kakaoMap}
      />
    ),
    ({ state }) =>
      shouldShowGiftInfo(state) ? (
        <GiftInfo_5
          groomAccounts={state.giftInfo?.groomAccounts ?? []}
          brideAccounts={state.giftInfo?.brideAccounts ?? []}
          message={state.giftInfo?.message}
        />
      ) : null,
    ({ state }) => <Guestbook_5 pageSlug={state.pageConfig.slug} />,
  ],
});
