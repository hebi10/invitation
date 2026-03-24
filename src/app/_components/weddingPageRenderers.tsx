import * as Components from '@/components';

import {
  type WeddingInvitationRouteOptions,
  type WeddingThemeKey,
} from './weddingThemes';
import { type WeddingPageState } from './weddingPageState';

function renderGiftInfoSection(
  theme: WeddingThemeKey,
  state: WeddingPageState,
  delay?: number
) {
  const giftInfo = state.giftInfo;

  if (!giftInfo) {
    return null;
  }

  const content = (() => {
    switch (theme) {
      case 'simple':
        return (
          <Components.GiftInfo_1
            groomAccounts={giftInfo.groomAccounts ?? []}
            brideAccounts={giftInfo.brideAccounts ?? []}
            message={giftInfo.message}
          />
        );
      case 'minimal':
        if (!state.hasGiftAccounts) {
          return null;
        }

        return (
          <Components.GiftInfo_2
            groomAccounts={giftInfo.groomAccounts ?? []}
            brideAccounts={giftInfo.brideAccounts ?? []}
            message={giftInfo.message}
          />
        );
      case 'space':
        return (
          <Components.GiftInfo_3
            groomAccounts={giftInfo.groomAccounts ?? []}
            brideAccounts={giftInfo.brideAccounts ?? []}
          />
        );
      case 'blue':
        if (!state.hasGiftAccounts) {
          return null;
        }

        return (
          <Components.GiftInfo_4
            groomAccounts={giftInfo.groomAccounts ?? []}
            brideAccounts={giftInfo.brideAccounts ?? []}
            message={giftInfo.message}
          />
        );
      case 'classic':
        if (!state.hasGiftAccounts) {
          return null;
        }

        return (
          <Components.GiftInfo_5
            groomAccounts={giftInfo.groomAccounts ?? []}
            brideAccounts={giftInfo.brideAccounts ?? []}
            message={giftInfo.message}
          />
        );
      case 'emotional':
      default:
        if (!state.hasGiftAccounts) {
          return null;
        }

        return (
          <Components.GiftInfo
            groomAccounts={giftInfo.groomAccounts ?? []}
            brideAccounts={giftInfo.brideAccounts ?? []}
            message={giftInfo.message}
          />
        );
    }
  })();

  if (!content) {
    return null;
  }

  if (theme !== 'minimal' || delay === undefined) {
    return content;
  }

  return <Components.ScrollAnimatedSection delay={delay}>{content}</Components.ScrollAnimatedSection>;
}

function renderGuestbookSection(state: WeddingPageState, theme: WeddingThemeKey) {
  switch (theme) {
    case 'simple':
      return <Components.Guestbook_1 pageSlug={state.pageConfig.slug} />;
    case 'minimal':
      return <Components.Guestbook_2 pageSlug={state.pageConfig.slug} />;
    case 'space':
      return <Components.Guestbook_3 pageSlug={state.pageConfig.slug} />;
    case 'blue':
      return <Components.Guestbook_4 pageSlug={state.pageConfig.slug} />;
    case 'classic':
      return <Components.Guestbook_5 pageSlug={state.pageConfig.slug} />;
    case 'emotional':
    default:
      return <Components.Guestbook pageSlug={state.pageConfig.slug} />;
  }
}

export function renderLoader(theme: WeddingThemeKey, state: WeddingPageState) {
  switch (theme) {
    case 'simple':
      return (
        <Components.WeddingLoader_1
          groomName={state.pageConfig.groomName}
          brideName={state.pageConfig.brideName}
          onLoadComplete={() => state.setIsLoading(false)}
          mainImage={state.mainImageUrl}
          preloadImages={state.preloadImages}
          duration={2500}
        />
      );
    case 'minimal':
      return <Components.WeddingLoader_2 message="청첩장을 준비하고 있습니다..." />;
    case 'space':
      return (
        <Components.WeddingLoader_3
          groomName={state.pageConfig.groomName}
          brideName={state.pageConfig.brideName}
        />
      );
    case 'blue':
      return (
        <Components.WeddingLoader_4
          groomName={state.pageConfig.groomName}
          brideName={state.pageConfig.brideName}
          onLoadComplete={() => state.setIsLoading(false)}
          mainImage={state.mainImageUrl}
          preloadImages={state.preloadImages}
          duration={1500}
        />
      );
    case 'classic':
      return (
        <Components.WeddingLoader_5
          groomName={state.pageConfig.groomName}
          brideName={state.pageConfig.brideName}
          onLoadComplete={() => state.setIsLoading(false)}
          mainImage={state.mainImageUrl}
          preloadImages={state.preloadImages}
          duration={1500}
        />
      );
    case 'emotional':
    default:
      return (
        <Components.WeddingLoader
          groomName={state.pageConfig.groomName}
          brideName={state.pageConfig.brideName}
          onLoadComplete={() => state.setIsLoading(false)}
          mainImage={state.mainImageUrl}
          preloadImages={state.preloadImages}
          duration={2500}
        />
      );
  }
}

export function renderEmotionalPage(state: WeddingPageState) {
  return (
    <main role="main" aria-label={`${state.pageConfig.groomName}와 ${state.pageConfig.brideName}의 결혼식 청첩장`}>
      <Components.Cover
        title={state.pageConfig.displayName}
        subtitle={state.pageConfig.pageData?.subtitle ?? '두 사람이 사랑으로 하나가 되는 날'}
        weddingDate={`${state.pageConfig.date} ${state.pageConfig.pageData?.ceremonyTime ?? ''}`}
        imageUrl={state.mainImageUrl}
        brideName={state.pageConfig.brideName}
        groomName={state.pageConfig.groomName}
        preloadComplete={true}
      />
      <Components.Greeting
        message={state.pageConfig.pageData?.greetingMessage ?? ''}
        author={state.pageConfig.pageData?.greetingAuthor ?? ''}
        groom={state.pageConfig.couple.groom}
        bride={state.pageConfig.couple.bride}
      />
      <Components.WeddingCalendar
        title="행복한 순간을 함께하세요"
        weddingDate={state.weddingDate}
        currentMonth={state.weddingDate}
        events={[
          {
            date: state.weddingDate.getDate(),
            type: 'wedding',
            title: `${state.pageConfig.groomName} ♥ ${state.pageConfig.brideName} 결혼식`,
            description: `${state.pageConfig.pageData?.ceremonyTime ?? ''} ${state.pageConfig.venue}`,
          },
        ]}
        showCountdown={true}
        countdownTitle="결혼식까지"
        onDateClick={(date) => {
          console.log('선택된 날짜:', date);
        }}
      />
      <Components.Gallery images={state.galleryImageUrls} />
      <Components.Schedule
        date={state.pageConfig.date}
        time={state.pageConfig.pageData?.ceremonyTime ?? ''}
        venue={state.pageConfig.venue}
        address={state.pageConfig.pageData?.ceremonyAddress ?? ''}
        venueGuide={state.pageConfig.pageData?.venueGuide}
        wreathGuide={state.pageConfig.pageData?.wreathGuide}
      />
      <Components.LocationMap
        venueName={state.pageConfig.venue}
        address={state.pageConfig.pageData?.ceremonyAddress ?? ''}
        description={state.pageConfig.pageData?.mapDescription ?? '지하철 이용 시 편리하게 오실 수 있습니다'}
        contact={state.pageConfig.pageData?.ceremonyContact}
        kakaoMapConfig={state.pageConfig.pageData?.kakaoMap}
      />
      {renderGuestbookSection(state, 'emotional')}
      {renderGiftInfoSection('emotional', state)}
    </main>
  );
}

export function renderSimplePage(state: WeddingPageState) {
  return (
    <main role="main" aria-label={`${state.pageConfig.groomName}와 ${state.pageConfig.brideName}의 결혼식 청첩장 (심플 버전)`}>
      <Components.Cover_1
        title={state.pageConfig.displayName}
        subtitle={state.pageConfig.pageData?.subtitle ?? '두 사람이 사랑으로 하나가 되는 날'}
        weddingDate={`${state.pageConfig.date} ${state.pageConfig.pageData?.ceremonyTime ?? ''}`}
        imageUrl={state.mainImageUrl}
        brideName={state.pageConfig.brideName}
        groomName={state.pageConfig.groomName}
        preloadComplete={true}
      />
      <Components.Greeting_1
        message={state.pageConfig.pageData?.greetingMessage ?? ''}
        author={state.pageConfig.pageData?.greetingAuthor ?? ''}
        groom={state.pageConfig.couple.groom}
        bride={state.pageConfig.couple.bride}
      />
      <Components.Gallery_1 images={state.galleryImageUrls} />
      <Components.WeddingCalendar_1
        title="행복한 순간을 함께하세요"
        weddingDate={state.weddingDate}
        currentMonth={state.weddingDate}
        events={[
          {
            date: state.weddingDate.getDate(),
            type: 'wedding',
            title: `${state.pageConfig.groomName} ♥ ${state.pageConfig.brideName} 결혼식`,
            description: `${state.pageConfig.pageData?.ceremonyTime ?? ''} ${state.pageConfig.venue}`,
          },
        ]}
        showCountdown={true}
        countdownTitle="결혼식까지"
        onDateClick={(date) => {
          console.log('선택된 날짜:', date);
        }}
      />
      <Components.Schedule_1
        date={state.pageConfig.date}
        time={state.pageConfig.pageData?.ceremonyTime ?? ''}
        venue={state.pageConfig.venue}
        address={state.pageConfig.pageData?.ceremonyAddress ?? ''}
        venueGuide={state.pageConfig.pageData?.venueGuide}
        wreathGuide={state.pageConfig.pageData?.wreathGuide}
      />
      <Components.LocationMap_1
        venueName={state.pageConfig.venue}
        address={state.pageConfig.pageData?.ceremonyAddress ?? ''}
        description={state.pageConfig.pageData?.mapDescription ?? '지하철 이용 시 편리하게 오실 수 있습니다'}
        kakaoMapConfig={state.pageConfig.pageData?.kakaoMap}
      />
      {renderGuestbookSection(state, 'simple')}
      {renderGiftInfoSection('simple', state)}
    </main>
  );
}

export function renderMinimalPage(state: WeddingPageState, options: WeddingInvitationRouteOptions) {
  return (
    <main role="main" aria-label={`${state.pageConfig.groomName}와 ${state.pageConfig.brideName}의 결혼식 청첩장 (미니멀 버전)`}>
      <Components.Cover_2
        title={state.pageConfig.displayName}
        subtitle={state.pageConfig.pageData?.subtitle ?? ''}
        weddingDate={`${state.pageConfig.date} ${state.pageConfig.pageData?.ceremonyTime ?? ''}`}
        imageUrl={state.mainImageUrl}
        brideName={state.pageConfig.brideName}
        groomName={state.pageConfig.groomName}
        preloadComplete={true}
      />
      <Components.ScrollAnimatedSection delay={100}>
        <Components.Greeting_2
          message={state.pageConfig.pageData?.greetingMessage ?? ''}
          author={state.pageConfig.pageData?.greetingAuthor ?? ''}
          groom={state.pageConfig.couple.groom}
          bride={state.pageConfig.couple.bride}
        />
      </Components.ScrollAnimatedSection>
      <Components.ScrollAnimatedSection delay={200}>
        <Components.WeddingCalendar_2 weddingDate={state.weddingDate} showCountdown={true} countdownTitle="결혼식까지" />
      </Components.ScrollAnimatedSection>
      <Components.ScrollAnimatedSection delay={300}>
        <Components.Gallery_2 images={state.galleryImageUrls} />
      </Components.ScrollAnimatedSection>
      <Components.ScrollAnimatedSection delay={400}>
        <Components.Schedule_2
          date={state.pageConfig.date}
          time={state.pageConfig.pageData?.ceremonyTime ?? ''}
          venue={state.pageConfig.venue}
          address={state.pageConfig.pageData?.ceremonyAddress ?? ''}
          venueGuide={state.pageConfig.pageData?.venueGuide}
          wreathGuide={state.pageConfig.pageData?.wreathGuide}
        />
      </Components.ScrollAnimatedSection>
      <Components.ScrollAnimatedSection delay={500}>
        <Components.LocationMap_2
          latitude={state.pageConfig.pageData?.kakaoMap?.latitude ?? 37.5048}
          longitude={state.pageConfig.pageData?.kakaoMap?.longitude ?? 127.028}
          placeName={state.pageConfig.venue}
          address={state.pageConfig.pageData?.ceremonyAddress ?? ''}
        />
      </Components.ScrollAnimatedSection>
      {options.showGuestbook !== false && (
        <Components.ScrollAnimatedSection delay={600}>
          {renderGuestbookSection(state, 'minimal')}
        </Components.ScrollAnimatedSection>
      )}
      {renderGiftInfoSection('minimal', state, options.showGuestbook === false ? 600 : 700)}
    </main>
  );
}

export function renderSpacePage(state: WeddingPageState) {
  return (
    <main role="main" aria-label={`${state.pageConfig.groomName}와 ${state.pageConfig.brideName}의 결혼식 청첩장 (우주 버전)`}>
      <Components.Cover_3
        title={state.pageConfig.displayName}
        subtitle={state.pageConfig.pageData?.subtitle ?? ''}
        weddingDate={state.pageConfig.date}
        imageUrl={state.mainImageUrl}
        groomName={state.pageConfig.groomName}
        brideName={state.pageConfig.brideName}
        preloadComplete={true}
      />
      <Components.Greeting_3
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
      <Components.WeddingCalendar_3 weddingDate={state.weddingDate} showCountdown={true} countdownTitle="결혼식까지" />
      <Components.Gallery_3 images={state.galleryImageUrls} />
      <Components.Schedule_3
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
      <Components.LocationMap_3
        location={state.pageConfig.venue}
        address={state.pageConfig.pageData?.ceremonyAddress ?? ''}
        coordinates={{
          lat: state.pageConfig.pageData?.kakaoMap?.latitude ?? 37.5048,
          lng: state.pageConfig.pageData?.kakaoMap?.longitude ?? 127.028,
        }}
      />
      {renderGuestbookSection(state, 'space')}
      {renderGiftInfoSection('space', state)}
    </main>
  );
}

export function renderBluePage(state: WeddingPageState) {
  return (
    <main role="main" aria-label={`${state.pageConfig.groomName}와 ${state.pageConfig.brideName}의 결혼식 청첩장 (지중해 블루 버전)`}>
      <Components.Cover_4
        title={state.pageConfig.displayName}
        subtitle={state.pageConfig.pageData?.subtitle ?? '영원한 사랑을 약속합니다'}
        weddingDate={`${state.pageConfig.date} ${state.pageConfig.pageData?.ceremonyTime ?? ''}`}
        imageUrl={state.mainImageUrl}
        groomName={state.pageConfig.groomName}
        brideName={state.pageConfig.brideName}
        preloadComplete={true}
      />
      <Components.Greeting_4
        message={state.pageConfig.pageData?.greetingMessage ?? ''}
        author={state.pageConfig.pageData?.greetingAuthor ?? ''}
        groom={state.pageConfig.couple.groom}
        bride={state.pageConfig.couple.bride}
      />
      <Components.Gallery_4 images={state.galleryImageUrls} />
      <Components.WeddingCalendar_4 weddingDate={state.weddingDate} showCountdown={true} countdownTitle="결혼식까지" />
      <Components.Schedule_4
        date={state.pageConfig.date}
        time={state.pageConfig.pageData?.ceremonyTime ?? ''}
        venue={state.pageConfig.venue}
        address={state.pageConfig.pageData?.ceremonyAddress ?? ''}
        venueGuide={state.pageConfig.pageData?.venueGuide}
        wreathGuide={state.pageConfig.pageData?.wreathGuide}
      />
      <Components.LocationMap_4
        venueName={state.pageConfig.venue}
        address={state.pageConfig.pageData?.ceremonyAddress ?? ''}
        description={state.pageConfig.pageData?.mapDescription ?? '지하철 이용 시 편리하게 오실 수 있습니다'}
        kakaoMapConfig={state.pageConfig.pageData?.kakaoMap}
      />
      {renderGiftInfoSection('blue', state)}
      {renderGuestbookSection(state, 'blue')}
    </main>
  );
}

export function renderClassicPage(state: WeddingPageState) {
  return (
    <main role="main" aria-label={`${state.pageConfig.groomName}와 ${state.pageConfig.brideName}의 결혼식 청첩장 (한지 클래식 버전)`}>
      <Components.Cover_5
        title={state.pageConfig.displayName}
        subtitle={state.pageConfig.pageData?.subtitle ?? '영원한 사랑을 약속합니다'}
        weddingDate={`${state.pageConfig.date} ${state.pageConfig.pageData?.ceremonyTime ?? ''}`}
        imageUrl={state.mainImageUrl}
        groomName={state.pageConfig.groomName}
        brideName={state.pageConfig.brideName}
        preloadComplete={true}
      />
      <Components.Greeting_5
        message={state.pageConfig.pageData?.greetingMessage ?? ''}
        author={state.pageConfig.pageData?.greetingAuthor ?? ''}
        groom={state.pageConfig.couple.groom}
        bride={state.pageConfig.couple.bride}
      />
      <Components.Gallery_5 images={state.galleryImageUrls} />
      <Components.WeddingCalendar_5 weddingDate={state.weddingDate} showCountdown={true} countdownTitle="결혼식까지" />
      <Components.Schedule_5
        date={state.pageConfig.date}
        time={state.pageConfig.pageData?.ceremonyTime ?? ''}
        venue={state.pageConfig.venue}
        address={state.pageConfig.pageData?.ceremonyAddress ?? ''}
        venueGuide={state.pageConfig.pageData?.venueGuide}
        wreathGuide={state.pageConfig.pageData?.wreathGuide}
      />
      <Components.LocationMap_5
        venueName={state.pageConfig.venue}
        address={state.pageConfig.pageData?.ceremonyAddress ?? ''}
        description={state.pageConfig.pageData?.mapDescription ?? '지하철 이용 시 편리하게 오실 수 있습니다'}
        kakaoMapConfig={state.pageConfig.pageData?.kakaoMap}
      />
      {renderGiftInfoSection('classic', state)}
      {renderGuestbookSection(state, 'classic')}
    </main>
  );
}
