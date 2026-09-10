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
import { resolveGardenFamilyMember } from '../../shared/identityModel';
import { buildWeddingStoredContent } from '../../shared/weddingStoredContentModel';
import { useImmediateWeddingPageReveal } from '../useImmediateWeddingPageReveal';
import baseStyles from '../gyeol/styles.module.css';
import themeStyles from './styles.module.css';
import LocationMap from '../gyeol/LocationMap';

const styles: Record<string, string> = { ...baseStyles, ...themeStyles, page: `${baseStyles.page} ${themeStyles.page}` };

export default function GardenNotePage({ state }: WeddingThemeRendererProps) {
  useImmediateWeddingPageReveal(state);

  const page = state.pageConfig;
  const pageData = getThemePageData(page, 'romantic');
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
  const familyMembers = [page.couple.groom.father, page.couple.groom.mother, page.couple.bride.father, page.couple.bride.mother]
    .flatMap((member, index) => {
      const resolvedMember = resolveGardenFamilyMember(member, index);
      return resolvedMember ? [resolvedMember] : [];
    });

  return (
    <main
      className={styles.page}
      aria-label={`${page.groomName}과 ${page.brideName}의 결혼식 초대장`}
    >
      <section className={styles.noteHero} data-garden-note-section="portrait" aria-labelledby="garden-note-title">
        <div className={styles.noteCopy}>
          <h1 id="garden-note-title" className={styles.noteTitle}>
            {page.groomName}<span aria-hidden="true"> · </span>{page.brideName}
          </h1>
          <p className={styles.noteDate}>{page.date}{ceremony?.time ? ` · ${ceremony.time}` : ''}</p>
        </div>
        {heroImageUrl ? (
          <figure className={styles.noteImageFrame}>
            <img src={heroImageUrl} alt={`${page.displayName} 대표 사진`} className={styles.noteImage} loading="eager" decoding="async" />
          </figure>
        ) : (
          <InvitationPoster title={page.displayName} dateLabel={page.date} locationLabel={page.venue} tone="paper" />
        )}
        <p className={styles.noteVenue}>{page.venue}</p>
      </section>

      {invitationMessage ? (
        <section
          className={styles.invitationSection}
          data-garden-note-section="letter"
          aria-labelledby="garden-note-invitation-title"
        >
          <h2 id="garden-note-invitation-title" className={styles.heading}>
            두 사람의 새 계절
          </h2>
          <div className={styles.invitationCopy}>
            <p>{invitationMessage}</p>
            {invitationAuthor ? <p className={styles.invitationAuthor}>{invitationAuthor}</p> : null}
          </div>
        </section>
      ) : null}

      {familyMembers.length > 0 ? (
        <details className={styles.contactSection} data-garden-note-section="family">
          <summary className={styles.disclosureSummary}>가족에게 연락하기</summary>
          <ul className={styles.contactList}>
            {familyMembers.map((member) => (
              <li key={`${member.side}-${member.relation}-${member.name}`}>
                <div className={styles.contactIdentity}>
                  <span>{member.side}</span>
                  <strong>{member.displayName}</strong>
                </div>
                <div className={styles.contactActions}>
                  <a href={`tel:${member.phone}`} aria-label={`${member.name}에게 전화하기`}>전화</a>
                  <a href={`sms:${member.phone}`} aria-label={`${member.name}에게 문자 보내기`}>문자</a>
                </div>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {state.galleryImageUrls.length > 0 ? (
        <div data-garden-note-section="gallery">
          <GalleryGridShared
            images={state.galleryImageUrls}
            previewImages={state.galleryPreviewImageUrls}
            imageAltPrefix={`${page.groomName}과 ${page.brideName}의 웨딩 갤러리`}
            title="함께 자란 시간"
            layout="carousel"
            styles={styles}
          />
        </div>
      ) : null}

      <section
        id="wedding-info"
        className={styles.scheduleSection}
        data-garden-note-section="ceremony"
        aria-labelledby="garden-note-schedule-title"
      >
        <h2 id="garden-note-schedule-title" className={styles.heading}>오시는 길</h2>
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
        <div data-garden-note-section="gift">
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
        <div data-garden-note-section="guestbook">
          <GuestbookThemed
            pageSlug={page.slug}
            styles={styles}
            title="축하의 글"
            subtitle="두 사람의 새 계절에 따뜻한 말을 남겨 주세요."
            statusColors={{ success: '#355b45', error: '#9b3f36' }}
            collapsibleForm
          />
        </div>
      ) : null}
    </main>
  );
}
