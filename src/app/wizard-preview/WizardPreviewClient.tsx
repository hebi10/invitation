'use client';

import { useEffect, useMemo, useState } from 'react';
import AppQueryProvider from '../AppQueryProvider';
import WeddingBase from '../_components/public-invitations/wedding/WeddingBase';
import { WeddingClosing } from '../_components/WeddingClosing';
import type { WeddingPageReadyState } from '../_components/weddingPageState';
import type { InvitationPage, InvitationPageSeed, InvitationThemeKey } from '@/types/invitationPage';
import { sampleWeddingPage, sampleWeddingComments, SAMPLE_WEDDING_COVER, SAMPLE_WEDDING_IMAGES } from '@/config/homeWeddingSample';
import { resolveInvitationPageDataByTheme } from '@/lib/invitationThemePageData';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import { applyDerivedWizardDefaults, buildWeddingDateObject } from '../page-wizard/pageWizardData';
import styles from '../page-wizard/WeddingWizardPreview.module.css';

const themes: InvitationThemeKey[] = ['simple', 'emotional', 'romantic', 'gyeol', 'classic-r'];
const idle = () => {};
const refresh = async () => {};

function buildPreview(seed: InvitationPageSeed, theme: InvitationThemeKey): WeddingPageReadyState {
  const derived = applyDerivedWizardDefaults(seed);
  const groom = seed.couple.groom.name.trim() || sampleWeddingPage.groomName;
  const bride = seed.couple.bride.name.trim() || sampleWeddingPage.brideName;
  const weddingDate = buildWeddingDateObject(seed) ?? new Date(2027, 3, 17, 14, 0);
  const page: InvitationPage = {
    ...derived,
    eventType: 'wedding',
    slug: 'wizard-local-preview',
    groomName: groom,
    brideName: bride,
    couple: { groom: { ...seed.couple.groom, name: groom }, bride: { ...seed.couple.bride, name: bride } },
    displayName: seed.displayName.trim() || `${groom} · ${bride}`,
    venue: seed.venue.trim() || sampleWeddingPage.venue,
    date: buildWeddingDateObject(seed) ? derived.date : sampleWeddingPage.date,
    weddingDateTime: buildWeddingDateObject(seed) ? seed.weddingDateTime : sampleWeddingPage.weddingDateTime,
    published: false,
    displayPeriodEnabled: false,
    displayPeriodStart: null,
    displayPeriodEnd: null,
  };
  const data = resolveInvitationPageDataByTheme(page, theme);
  const cover = seed.metadata.images.wedding.trim() || SAMPLE_WEDDING_COVER;
  const images = Array.from(new Set(data?.galleryImages?.map((url) => url.trim()).filter((url) => url && url !== cover) ?? []));
  const features = resolveInvitationFeatures(page.productTier, page.features);
  const gallery = (images.length ? images : SAMPLE_WEDDING_IMAGES.filter((url) => url !== cover)).slice(0, features.maxGalleryImages);
  page.pageData = {
    ...data,
    themeOverrides: undefined,
    groom: page.couple.groom,
    bride: page.couple.bride,
    greetingMessage: data?.greetingMessage?.trim() || sampleWeddingPage.pageData?.greetingMessage,
    greetingAuthor: seed.pageData?.themeOverrides?.[theme]?.greetingAuthor?.trim() || seed.pageData?.greetingAuthor?.trim() || `${groom} · ${bride}`,
    venueName: data?.venueName?.trim() || page.venue,
    ceremonyTime: data?.ceremonyTime?.trim() || sampleWeddingPage.pageData?.ceremonyTime,
    galleryImages: gallery,
  };
  return {
    status: 'ready', blockMessage: null, pageConfig: page,
    isLoading: false, setIsLoading: idle, isRefreshingPage: false, refreshPage: refresh, imagesLoading: false,
    heroImageUrl: cover, mainImageUrl: cover, galleryImageUrls: gallery, galleryPreviewImageUrls: gallery,
    preloadImages: [], adminNotice: null, weddingDate,
    giftInfo: data?.giftInfo,
    hasGiftAccounts: Boolean(data?.giftInfo?.groomAccounts?.length || data?.giftInfo?.brideAccounts?.length),
  };
}

export default function WizardPreviewClient() {
  const [draft, setDraft] = useState<{ seed: InvitationPageSeed; theme: InvitationThemeKey } | null>(null);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (window.parent === window || event.origin !== window.location.origin || event.source !== window.parent) return;
      const message = event.data;
      if (message?.type === 'wedding-wizard-preview:top') {
        window.scrollTo({ top: 0, behavior: 'instant' });
        return;
      }
      if (message?.type !== 'wedding-wizard-preview:update' || !themes.includes(message.theme)) return;
      const seed = message.formState;
      if (!seed || typeof seed.slug !== 'string' || !seed.couple?.groom || !seed.couple?.bride || !seed.metadata?.images || !seed.weddingDateTime) return;
      // Ignore malformed messages without replacing the last usable preview.
      try {
        buildPreview(seed, message.theme);
        setDraft({ seed, theme: message.theme });
      } catch { return; }
    };
    window.addEventListener('message', receive);
    if (window.parent !== window) window.parent.postMessage({ type: 'wedding-wizard-preview:ready' }, window.location.origin);
    return () => window.removeEventListener('message', receive);
  }, []);
  const state = useMemo(() => draft ? buildPreview(draft.seed, draft.theme) : null, [draft]);
  if (!draft || !state) return <p className={styles.notice} role="status">편집 화면의 입력 내용을 기다리고 있습니다.</p>;
  return (
    <AppQueryProvider>
      <div className={styles.canvas}>
      <WeddingBase state={state} options={{ slug: state.pageConfig.slug, theme: draft.theme }} theme={draft.theme} demoComments={sampleWeddingComments} showMap={false} />
      <WeddingClosing groomName={state.pageConfig.groomName} brideName={state.pageConfig.brideName} theme={draft.theme} />
      </div>
    </AppQueryProvider>
  );
}
