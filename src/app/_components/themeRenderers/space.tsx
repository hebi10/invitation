'use client';

import Cover_3 from '@/components/Cover_3';
import Gallery_3 from '@/components/Gallery_3';
import GiftInfo_3 from '@/components/GiftInfo_3';
import Greeting_3 from '@/components/Greeting_3';
import Guestbook_3 from '@/components/Guestbook_3';
import LocationMap_3 from '@/components/LocationMap_3';
import Schedule_3 from '@/components/Schedule_3';
import WeddingCalendar_3 from '@/components/WeddingCalendar_3';
import WeddingLoader_3 from '@/components/WeddingLoader_3';

import { createWeddingThemeRenderer } from '../weddingPageRenderers';

export default createWeddingThemeRenderer({
  ariaLabelSuffix: ' (우주 버전)',
  renderLoader: ({ state }) => (
    <WeddingLoader_3
      groomName={state.pageConfig.groomName}
      brideName={state.pageConfig.brideName}
    />
  ),
  sections: [
    ({ state }) => (
      <Cover_3
        title={state.pageConfig.displayName}
        subtitle={state.pageConfig.pageData?.subtitle ?? ''}
        weddingDate={state.pageConfig.date}
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
      <Greeting_3
        message={state.pageConfig.pageData?.greetingMessage ?? ''}
        parents={{
          groom: {
            father: state.pageConfig.couple.groom.father?.name ?? '',
            mother: state.pageConfig.couple.groom.mother?.name ?? '',
          },
          bride: {
            father: state.pageConfig.couple.bride.father?.name ?? '',
            mother: state.pageConfig.couple.bride.mother?.name ?? '',
          },
        }}
        groomName={state.pageConfig.groomName}
        brideName={state.pageConfig.brideName}
      />
    ),
    ({ state }) => (
      <WeddingCalendar_3
        weddingDate={state.weddingDate}
        showCountdown={true}
        countdownTitle="결혼식까지"
      />
    ),
    ({ state }) => <Gallery_3 images={state.galleryImageUrls} />,
    ({ state }) => (
      <div id="wedding-info">
        <Schedule_3
          weddingDate={state.pageConfig.date}
          weddingTime={state.pageConfig.pageData?.ceremonyTime ?? ''}
          location={state.pageConfig.venue}
          address={state.pageConfig.pageData?.ceremonyAddress ?? ''}
          contact={{
            groom: {
              name: state.pageConfig.groomName,
              phone: state.pageConfig.couple.groom.phone ?? '',
            },
            bride: {
              name: state.pageConfig.brideName,
              phone: state.pageConfig.couple.bride.phone ?? '',
            },
          }}
        />
      </div>
    ),
    ({ state }) => (
      <LocationMap_3
        location={state.pageConfig.venue}
        address={state.pageConfig.pageData?.ceremonyAddress ?? ''}
        coordinates={{
          lat: state.pageConfig.pageData?.kakaoMap?.latitude ?? 37.5048,
          lng: state.pageConfig.pageData?.kakaoMap?.longitude ?? 127.028,
        }}
      />
    ),
    ({ state }) => <Guestbook_3 pageSlug={state.pageConfig.slug} />,
    ({ state }) =>
      state.giftInfo ? (
        <GiftInfo_3
          groomAccounts={state.giftInfo.groomAccounts ?? []}
          brideAccounts={state.giftInfo.brideAccounts ?? []}
        />
      ) : null,
  ],
});
