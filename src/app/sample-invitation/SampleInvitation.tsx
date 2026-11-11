'use client';

import Link from 'next/link';
import AppQueryProvider from '../AppQueryProvider';
import WeddingBase from '../_components/public-invitations/wedding/WeddingBase';
import BackgroundMusic from '@/components/media/BackgroundMusic';
import { WeddingClosing } from '../_components/WeddingClosing';
import type { WeddingPageReadyState } from '../_components/weddingPageState';
import { sampleWeddingPage, sampleWeddingComments, SAMPLE_WEDDING_IMAGES, SAMPLE_WEDDING_COVER } from '@/config/homeWeddingSample';
import { getHomeLinkRenderProps } from '../_components/homeInteractionPolicy';
import styles from './page.module.css';

const sampleState: WeddingPageReadyState = {
  status: 'ready', blockMessage: null, pageConfig: sampleWeddingPage,
  isLoading: false, setIsLoading: () => {}, isRefreshingPage: false, refreshPage: async () => {}, imagesLoading: false,
  heroImageUrl: SAMPLE_WEDDING_COVER, mainImageUrl: SAMPLE_WEDDING_COVER,
  galleryImageUrls: SAMPLE_WEDDING_IMAGES, galleryPreviewImageUrls: SAMPLE_WEDDING_IMAGES, preloadImages: [], adminNotice: null,
  weddingDate: new Date('2027-04-17T14:00:00+09:00'), hasGiftAccounts: false, giftInfo: undefined,
};

const qaState: WeddingPageReadyState = {
  ...sampleState,
  pageConfig: {
    ...sampleWeddingPage,
    couple: {
      groom: { ...sampleWeddingPage.couple.groom, phone: '000-0000-0000' },
      bride: { ...sampleWeddingPage.couple.bride, phone: '000-0000-0000' },
    },
  },
  hasGiftAccounts: true,
  giftInfo: {
    groomAccounts: [{ bank: '가상은행', accountNumber: '000-000-000000', accountHolder: '샘플 신랑' }],
    brideAccounts: [{ bank: '가상은행', accountNumber: '000-000-000000', accountHolder: '샘플 신부' }],
    message: '화면 검수용 가상 계좌입니다. 실제 송금할 수 없습니다.',
  },
};

type QAUI07Case = 'full' | 'groom' | 'bride' | 'empty' | 'long';

function withoutPhone(person: typeof sampleWeddingPage.couple.groom) {
  return {
    ...person,
    phone: '',
    father: person.father ? { ...person.father, phone: '' } : undefined,
    mother: person.mother ? { ...person.mother, phone: '' } : undefined,
  };
}

function makeQAUI07State(variant: QAUI07Case): WeddingPageReadyState {
  if (variant === 'full') return qaState;

  if (variant === 'groom' || variant === 'bride') {
    const groomOnly = variant === 'groom';
    return {
      ...qaState,
      pageConfig: {
        ...qaState.pageConfig,
        couple: {
          groom: groomOnly ? qaState.pageConfig.couple.groom : withoutPhone(qaState.pageConfig.couple.groom),
          bride: groomOnly ? withoutPhone(qaState.pageConfig.couple.bride) : qaState.pageConfig.couple.bride,
        },
      },
      giftInfo: {
        ...qaState.giftInfo,
        groomAccounts: groomOnly ? qaState.giftInfo?.groomAccounts : [],
        brideAccounts: groomOnly ? [] : qaState.giftInfo?.brideAccounts,
      },
    };
  }

  if (variant === 'empty') {
    return {
      ...qaState,
      pageConfig: {
        ...qaState.pageConfig,
        couple: {
          groom: withoutPhone(qaState.pageConfig.couple.groom),
          bride: withoutPhone(qaState.pageConfig.couple.bride),
        },
        features: {
          ...qaState.pageConfig.features,
          showCountdown: false,
          showGuestbook: false,
        },
        pageData: {
          ...qaState.pageConfig.pageData,
          venueGuide: [],
          wreathGuide: [],
          reception: undefined,
        },
      },
      galleryImageUrls: [],
      galleryPreviewImageUrls: [],
      hasGiftAccounts: false,
      giftInfo: undefined,
    };
  }

  const longText = '가상 검증 데이터로 작성한 긴 예식 안내 문구입니다. 작은 화면에서도 내용이 겹치지 않고 줄바꿈이 자연스럽게 이어지는지 확인합니다. '.repeat(4);
  return {
    ...qaState,
    pageConfig: {
      ...qaState.pageConfig,
      venue: '가상의 긴 예식장 이름과 복합문화공간 안내 구역 — 2층 메인홀 · 3층 별도 안내실',
      pageData: {
        ...qaState.pageConfig.pageData,
        greetingMessage: longText + '\n\n' + longText,
        venueGuide: [{ title: '가상의 장문 주차·대중교통 안내', content: longText }],
      },
    },
    giftInfo: { ...qaState.giftInfo, message: longText },
  };
}

type QAUI07Map = 'off' | 'coordinates' | 'geocode';

export default function SampleInvitation({ embedded = false, theme = 'simple', qaMusic = false, qaUI07 = false, qaUI07Case = 'full', qaUI07Map = 'off' }: { embedded?: boolean; theme?: 'simple' | 'romantic' | 'gyeol' | 'classic-r' | 'emotional'; qaMusic?: boolean; qaUI07?: boolean; qaUI07Case?: QAUI07Case; qaUI07Map?: QAUI07Map }) {
  const weddingState = qaUI07 ? makeQAUI07State(qaUI07Case) : sampleState;
  const mapState: WeddingPageReadyState = qaUI07 && qaUI07Map === 'coordinates'
    ? {
        ...weddingState,
        pageConfig: {
          ...weddingState.pageConfig,
          pageData: {
            ...weddingState.pageConfig.pageData,
            kakaoMap: {
              latitude: 37.50001,
              longitude: 127.00001,
              level: 3,
              markerTitle: '가상 검증 예식장',
            },
          },
        },
      }
    : weddingState;
  return <AppQueryProvider><div className={styles.sample}>
    <p className={styles.notice}>기본형 샘플 · AI 생성 사진과 예시 메시지</p>
    <WeddingBase state={mapState} options={{ slug: sampleWeddingPage.slug, theme }} theme={theme} demoComments={sampleWeddingComments} showMap={qaUI07 && qaUI07Map !== 'off'} />
    <WeddingClosing groomName={sampleWeddingPage.groomName} brideName={sampleWeddingPage.brideName} theme={theme} />
    {qaMusic ? <BackgroundMusic alignToInvitation autoPlay={false} musicUrl="data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==" /> : null}
    {!embedded ? (
      <footer className={styles.serviceLinks} aria-label="청첩장 서비스 안내">
        <p>이런 청첩장을 만들고 싶으신가요?</p>
        <nav aria-label="샘플 다음 단계">
          <Link href="/">홈으로 돌아가기</Link>
          <a href="https://kmong.com/gig/686626" {...getHomeLinkRenderProps(true)}>제작 문의 <span>새 창</span></a>
        </nav>
      </footer>
    ) : null}
  </div></AppQueryProvider>;
}
