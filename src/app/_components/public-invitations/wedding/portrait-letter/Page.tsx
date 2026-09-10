'use client';

import GalleryGridShared from '@/components/sections/Gallery/GalleryGridShared';
import GiftInfoThemed from '@/components/sections/GiftInfo/GiftInfoThemed';
import GuestbookThemed from '@/components/sections/Guestbook/GuestbookThemed';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';

import type { WeddingThemeRendererProps } from '../../../weddingPageRenderers';
import {
  getCeremonyAddress,
  getCeremonySchedule,
  getThemePageData,
  shouldShowGiftInfo,
} from '../../../weddingPageRenderers';
import { InvitationPoster } from '../../shared/InvitationPoster';
import { PublicInvitationDateFeature } from '../../shared/PublicInvitationDateFeature';
import { WeddingStoredContent } from '../../shared/WeddingStoredContent';
import { buildWeddingStoredContent } from '../../shared/weddingStoredContentModel';
import { useImmediateWeddingPageReveal } from '../useImmediateWeddingPageReveal';
import baseStyles from '../gyeol/styles.module.css';
import themeStyles from './styles.module.css';
import LocationMap from '../gyeol/LocationMap';

const styles: Record<string, string> = { ...baseStyles, ...themeStyles, page: `${baseStyles.page} ${themeStyles.page}` };

export default function PortraitLetterPage({ state }: WeddingThemeRendererProps) {
  useImmediateWeddingPageReveal(state);

  const page = state.pageConfig;
  const pageData = getThemePageData(page, 'emotional');
  const ceremony = getCeremonySchedule(page, pageData);
  const ceremonyAddress = getCeremonyAddress(page, pageData).trim();
  const storedContent = buildWeddingStoredContent(page, pageData);
  const heroImageUrl = state.mainImageUrl.trim();
  const invitationMessage = storedContent.greetingMessage;
  const invitationAuthor = storedContent.greetingAuthor;
  const features = resolveInvitationFeatures(page.productTier, page.features);
  const venuePhone = storedContent.ceremonyContact.replace(/[^\d+]/g, '');
  const hasAdditionalGuide = Boolean(
    storedContent.reception || storedContent.venueGuide.length || storedContent.wreathGuide.length
  );
  const contacts = [
    { side: '신랑측', role: page.couple.groom.order || '신랑', ...page.couple.groom },
    { side: '신부측', role: page.couple.bride.order || '신부', ...page.couple.bride },
  ].flatMap((contact) => {
    const phone = contact.phone?.trim();

    return phone
      ? [{ ...contact, name: contact.name.trim() || contact.role, phone }]
      : [];
  });

  return (
    <main
      className={styles.page}
      aria-label={`${page.groomName}과 ${page.brideName}의 결혼식 초대장`}
    >
      <div data-portrait-letter-section="portrait">
        {heroImageUrl ? (
          <section className={styles.portraitHero} aria-labelledby="portrait-letter-couple">
            <figure className={styles.portraitFrame}>
              <img src={heroImageUrl} alt={`${page.displayName} 대표 사진`} className={styles.portraitImage} loading="eager" decoding="async" />
            </figure>
            <div className={styles.portraitCaption}>
              <h1 id="portrait-letter-couple" className={styles.coupleNames}>
                {page.groomName}<span aria-hidden="true"> 그리고 </span>{page.brideName}
              </h1>
              <p>{page.date}{ceremony?.time ? ` · ${ceremony.time}` : ''}</p>
              <p>{page.venue}</p>
            </div>
          </section>
        ) : (
          <div className={styles.posterScene}>
            <InvitationPoster title={page.displayName} dateLabel={page.date} locationLabel={page.venue} tone="paper" />
          </div>
        )}
      </div>

      {invitationMessage ? (
        <section
          className={styles.invitationSection}
          data-portrait-letter-section="letter"
          aria-labelledby="portrait-letter-invitation-title"
        >
          <h2 id="portrait-letter-invitation-title" className={styles.heading}>
            당신께 보내는 초대
          </h2>
          <div className={styles.invitationCopy}>
            <p>{invitationMessage}</p>
            {invitationAuthor ? <p className={styles.invitationAuthor}>{invitationAuthor}</p> : null}
          </div>
        </section>
      ) : null}

      {contacts.length > 0 ? (
        <details
          className={styles.contactSection}
          data-portrait-letter-section="contact"
        >
          <summary className={styles.disclosureSummary}>두 사람에게 연락하기</summary>
          <ul className={styles.contactList}>
            {contacts.map((contact) => (
              <li key={`${contact.side}-${contact.role}-${contact.phone}`}>
                <div className={styles.contactIdentity}>
                  <span>{contact.side}</span>
                  <strong>{contact.role} {contact.name}</strong>
                </div>
                <div className={styles.contactActions}>
                  <a href={`tel:${contact.phone}`} aria-label={`${contact.name}에게 전화하기`}>
                    전화
                  </a>
                  <a href={`sms:${contact.phone}`} aria-label={`${contact.name}에게 문자 보내기`}>
                    문자
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {state.galleryImageUrls.length > 0 ? (
        <div data-portrait-letter-section="gallery">
          <GalleryGridShared
            images={state.galleryImageUrls}
            previewImages={state.galleryPreviewImageUrls}
            imageAltPrefix={`${page.groomName}과 ${page.brideName}의 웨딩 갤러리`}
            title="함께한 장면"
            layout="carousel"
            styles={styles}
          />
        </div>
      ) : null}

      <section
        id="wedding-info"
        className={styles.scheduleSection}
        data-portrait-letter-section="schedule"
        aria-labelledby="portrait-letter-schedule-title"
      >
        <h2 id="portrait-letter-schedule-title" className={styles.heading}>오시는 길</h2>
        <div className={styles.scheduleContent}>
          <p className={styles.venueName}>{page.venue}</p>
          <p>{page.date}{ceremony?.time ? ` · ${ceremony.time}` : ''}</p>
          {ceremonyAddress ? <address className={styles.address}>{ceremonyAddress}</address> : null}
          {venuePhone ? <a className={styles.venuePhone} href={`tel:${venuePhone}`} aria-label="예식장에 전화하기">{storedContent.ceremonyContact}</a> : null}
        </div>
        {storedContent.mapHref ? (
          <LocationMap
            address={ceremonyAddress}
            venueName={page.venue}
            kakaoMapConfig={pageData?.kakaoMap}
            mapHref={storedContent.mapHref}
          />
        ) : null}
        {storedContent.mapDescription ? <p className={styles.travelNote}>{storedContent.mapDescription}</p> : null}
        {hasAdditionalGuide ? (
          <details className={styles.guideDisclosure}>
            <summary className={styles.disclosureSummary}>식사 · 방문 안내 자세히 보기</summary>
            <WeddingStoredContent
              className={styles.storedSection}
              model={{ ...storedContent, ceremonyContact: '', mapDescription: '', mapHref: '' }}
              titleClassName={styles.guideTitle}
            />
          </details>
        ) : null}
      </section>

      <PublicInvitationDateFeature
        className={styles.dateSection}
        eventDate={state.weddingDate}
        mode="calendar-countdown"
        page={page}
        title="저희, 결혼합니다"
        titleClassName={styles.heading}
      />

      {shouldShowGiftInfo(state) ? (
        <div data-portrait-letter-section="gift">
          <GiftInfoThemed
            groomAccounts={state.giftInfo?.groomAccounts ?? []}
            brideAccounts={state.giftInfo?.brideAccounts ?? []}
            message={state.giftInfo?.message}
            styles={styles}
            title="마음 전하실 곳"
            groomSectionTitle="신랑측 계좌"
            brideSectionTitle="신부측 계좌"
            copyLabel="복사"
            collapsibleAccounts
          />
        </div>
      ) : null}

      {features.showGuestbook ? (
        <div data-portrait-letter-section="guestbook">
          <GuestbookThemed
            pageSlug={page.slug}
            styles={styles}
            title="답장을 남겨 주세요"
            subtitle="두 사람에게 전하고 싶은 마음을 적어 주세요."
            statusColors={{ success: '#355b45', error: '#9b3f36' }}
            collapsibleForm
          />
        </div>
      ) : null}
    </main>
  );
}
