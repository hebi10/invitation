'use client';

import Cover_2 from '@/components/Cover_2';
import Gallery_2 from '@/components/Gallery_2';
import GiftInfo_2 from '@/components/GiftInfo_2';
import Greeting_2 from '@/components/Greeting_2';
import Guestbook_2 from '@/components/Guestbook_2';
import LocationMap_2 from '@/components/LocationMap_2';
import Schedule_2 from '@/components/Schedule_2';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import WeddingCalendar_2 from '@/components/WeddingCalendar_2';
import WeddingLoader_2 from '@/components/WeddingLoader_2';

import { createWeddingThemeRenderer } from '../weddingPageRenderers';

export default createWeddingThemeRenderer({
  ariaLabelSuffix: ' (미니멀 버전)',
  renderLoader: () => <WeddingLoader_2 message="청첩장을 준비하고 있습니다..." />,
  sections: [
    ({ state }) => (
      <Cover_2
        title={state.pageConfig.displayName}
        subtitle={state.pageConfig.pageData?.subtitle ?? ''}
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
      <ScrollAnimatedSection delay={100}>
        <Greeting_2
          message={state.pageConfig.pageData?.greetingMessage ?? ''}
          author={state.pageConfig.pageData?.greetingAuthor ?? ''}
          groom={state.pageConfig.couple.groom}
          bride={state.pageConfig.couple.bride}
        />
      </ScrollAnimatedSection>
    ),
    ({ state }) => (
      <ScrollAnimatedSection delay={200}>
        <WeddingCalendar_2
          weddingDate={state.weddingDate}
          showCountdown={true}
          countdownTitle="결혼식까지"
        />
      </ScrollAnimatedSection>
    ),
    ({ state }) => (
      <ScrollAnimatedSection delay={300}>
        <Gallery_2 images={state.galleryImageUrls} />
      </ScrollAnimatedSection>
    ),
    ({ state }) => (
      <ScrollAnimatedSection delay={400}>
        <div id="wedding-info">
          <Schedule_2
            date={state.pageConfig.date}
            time={state.pageConfig.pageData?.ceremonyTime ?? ''}
            venue={state.pageConfig.venue}
            address={state.pageConfig.pageData?.ceremonyAddress ?? ''}
            venueGuide={state.pageConfig.pageData?.venueGuide}
            wreathGuide={state.pageConfig.pageData?.wreathGuide}
          />
        </div>
      </ScrollAnimatedSection>
    ),
    ({ state }) => (
      <ScrollAnimatedSection delay={500}>
        <LocationMap_2
          latitude={state.pageConfig.pageData?.kakaoMap?.latitude ?? 37.5048}
          longitude={state.pageConfig.pageData?.kakaoMap?.longitude ?? 127.028}
          placeName={state.pageConfig.venue}
          address={state.pageConfig.pageData?.ceremonyAddress ?? ''}
        />
      </ScrollAnimatedSection>
    ),
    ({ state, options }) =>
      options.showGuestbook !== false ? (
        <ScrollAnimatedSection delay={600}>
          <Guestbook_2 pageSlug={state.pageConfig.slug} />
        </ScrollAnimatedSection>
      ) : null,
    ({ state, options }) =>
      state.hasGiftAccounts ? (
        <ScrollAnimatedSection delay={options.showGuestbook === false ? 600 : 700}>
          <GiftInfo_2
            groomAccounts={state.giftInfo?.groomAccounts ?? []}
            brideAccounts={state.giftInfo?.brideAccounts ?? []}
            message={state.giftInfo?.message}
          />
        </ScrollAnimatedSection>
      ) : null,
  ],
});
