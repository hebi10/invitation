'use client';

import { useEffect, useMemo, useState } from 'react';
import AppQueryProvider from '../AppQueryProvider';
import WeddingBase from '../_components/public-invitations/wedding/WeddingBase';
import { withWeddingClosing } from '../_components/weddingPageRenderers';
import closingStyles from '../_components/WeddingClosing.module.css';
import type { WeddingPageReadyState } from '../_components/weddingPageState';
import type { InvitationPage, InvitationPageSeed, InvitationThemeKey } from '@/types/invitationPage';
import { sampleWeddingPage, sampleWeddingComments, SAMPLE_WEDDING_COVER, SAMPLE_WEDDING_IMAGES } from '@/config/homeWeddingSample';
import { resolveInvitationPageDataByTheme } from '@/lib/invitationThemePageData';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import { applyDerivedWizardDefaults, buildWeddingDateObject } from '../page-wizard/pageWizardData';
import styles from '../page-wizard/WeddingWizardPreview.module.css';
import WeddingIntro from '@/components/sections/WeddingIntro/WeddingIntro';
import { normalizeWeddingIntroStyle } from '@/lib/weddingIntro';
import { isPreviewStep, previewSections, type PreviewStep } from './previewSections';

const themes: InvitationThemeKey[] = ['simple', 'emotional', 'romantic', 'gyeol', 'classic-r'];
const idle = () => {};
const refresh = async () => {};
const previewRenderers = new Map(themes.map(theme => [theme, withWeddingClosing(
  props => <WeddingBase {...props} theme={theme} demoComments={sampleWeddingComments} showMap={false} />,
  { theme, canvasClassName: closingStyles.canvas },
)]));

export function buildPreview(seed: InvitationPageSeed, theme: InvitationThemeKey): WeddingPageReadyState {
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
  const images = data?.galleryImages?.filter((url) => url.trim()) ?? [];
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

export function WeddingPreviewContent({ state, theme }: { state: WeddingPageReadyState; theme: InvitationThemeKey }) {
  const Renderer = previewRenderers.get(theme);
  return Renderer ? <Renderer state={state} options={{ slug: state.pageConfig.slug, theme }} /> : null;
}

export default function WizardPreviewClient() {
  const [draft, setDraft] = useState<{ seed: InvitationPageSeed; theme: InvitationThemeKey } | null>(null);
  const [introRun, setIntroRun] = useState(0);
  const [focus, setFocus] = useState<{ step: PreviewStep; revision: number } | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (window.parent === window || event.origin !== window.location.origin || event.source !== window.parent) return;
      const message = event.data;
      if (message?.type === 'wedding-wizard-preview:section') {
        if (!isPreviewStep(message.step)) return;
        const step = message.step;
        setShowIntro(step === 'music');
        if (step === 'music') setIntroRun(run => run + 1);
        setFocus(previous => ({ step, revision: (previous?.revision ?? 0) + 1 }));
        return;
      }
      if (message?.type === 'wedding-wizard-preview:top') {
        setFocus(null);
        setShowIntro(true);
        window.scrollTo({ top: 0, behavior: 'instant' });
        setIntroRun(run => run + 1);
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
  useEffect(() => {
    // A cached frame can announce ready before the parent subscribes. Confirm
    // each rendered draft without asking the parent to send it again.
    if (draft && window.parent !== window) {
      window.parent.postMessage({ type: 'wedding-wizard-preview:rendered' }, window.location.origin);
    }
  }, [draft]);
  useEffect(() => {
    if (!state || !focus) return;
    // Section messages can arrive before the first draft commit. Resolve the
    // element after React renders, and re-resolve when preview content changes.
    let target: HTMLElement | null = null;
    const frame = window.requestAnimationFrame(() => {
      target = document.querySelector<HTMLElement>(previewSections[focus.step].selector);
      if (!target) {
        window.scrollTo({ top: 0, behavior: 'instant' });
        return;
      }
      target.dataset.wizardPreviewFocus = 'true';
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (target) delete target.dataset.wizardPreviewFocus;
    };
  }, [state, focus]);
  if (!draft || !state) return <p className={styles.notice} role="status">편집 화면의 입력 내용을 기다리고 있습니다.</p>;
  return (
    <AppQueryProvider>
      <div className={styles.canvas}>
      <WeddingPreviewContent state={state} theme={draft.theme} />
      </div>
      {showIntro && <WeddingIntro
        key={`${normalizeWeddingIntroStyle(draft.seed.introStyle)}:${introRun}`}
        style={normalizeWeddingIntroStyle(draft.seed.introStyle)}
        slug={state.pageConfig.slug}
        groomName={state.pageConfig.groomName}
        brideName={state.pageConfig.brideName}
        date={state.pageConfig.date}
        imageUrl={state.mainImageUrl}
        theme={draft.theme}
        preview
        connectToCover
      />}
    </AppQueryProvider>
  );
}
