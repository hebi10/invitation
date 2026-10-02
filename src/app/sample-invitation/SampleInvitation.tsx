'use client';

import Link from 'next/link';
import AppQueryProvider from '../AppQueryProvider';
import WeddingBase from '../_components/public-invitations/wedding/WeddingBase';
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

export default function SampleInvitation({ embedded = false }: { embedded?: boolean }) {
  return <AppQueryProvider><div className={styles.sample}>
    <p className={styles.notice}>기본형 샘플 · AI 생성 사진과 예시 메시지</p>
    <WeddingBase state={sampleState} options={{ slug: sampleWeddingPage.slug, theme: 'simple' }} theme="simple" demoComments={sampleWeddingComments} showMap={false} />
    <WeddingClosing groomName={sampleWeddingPage.groomName} brideName={sampleWeddingPage.brideName} theme="simple" />
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
