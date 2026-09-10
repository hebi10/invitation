'use client';

import AppQueryProvider from '../AppQueryProvider';
import WeddingBase from '../_components/public-invitations/wedding/WeddingBase';
import { WeddingClosing } from '../_components/WeddingClosing';
import type { WeddingPageReadyState } from '../_components/weddingPageState';
import { sampleWeddingPage, sampleWeddingComments, SAMPLE_WEDDING_IMAGES, SAMPLE_WEDDING_COVER } from '@/config/homeWeddingSample';
import styles from './page.module.css';

const sampleState: WeddingPageReadyState = {
  status: 'ready', blockMessage: null, pageConfig: sampleWeddingPage,
  isLoading: false, setIsLoading: () => {}, isRefreshingPage: false, refreshPage: async () => {}, imagesLoading: false,
  heroImageUrl: SAMPLE_WEDDING_COVER, mainImageUrl: SAMPLE_WEDDING_COVER,
  galleryImageUrls: SAMPLE_WEDDING_IMAGES, galleryPreviewImageUrls: SAMPLE_WEDDING_IMAGES, preloadImages: [], adminNotice: null,
  weddingDate: new Date('2027-04-17T14:00:00+09:00'), hasGiftAccounts: false, giftInfo: undefined,
};

export default function SampleInvitation() {
  return <AppQueryProvider><div className={styles.sample}>
    <p className={styles.notice}>기본형 샘플 · AI 생성 사진과 예시 메시지</p>
    <WeddingBase state={sampleState} options={{ slug: sampleWeddingPage.slug, theme: 'simple' }} theme="simple" demoComments={sampleWeddingComments} showMap={false} />
    <WeddingClosing groomName={sampleWeddingPage.groomName} brideName={sampleWeddingPage.brideName} theme="simple" />
  </div></AppQueryProvider>;
}
