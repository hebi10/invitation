'use client';

import GalleryGridShared from '@/components/sections/Gallery/GalleryGridShared';
import GiftInfoThemed from '@/components/sections/GiftInfo/GiftInfoThemed';
import GuestbookThemed from '@/components/sections/Guestbook/GuestbookThemed';
import type { Comment } from '@/services/commentService';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';

import type { WeddingThemeRendererProps } from '../../weddingPageRenderers';
import {
  getCeremonyAddress,
  getCeremonySchedule,
  getThemePageData,
  shouldShowGiftInfo,
} from '../../weddingPageRenderers';
import WeddingCover from './WeddingCover';
import type { InvitationThemeKey } from '@/lib/invitationThemes';
import { PublicInvitationDateFeature } from '../shared/PublicInvitationDateFeature';
import { WeddingStoredContent } from '../shared/WeddingStoredContent';
import { buildWeddingStoredContent } from '../shared/weddingStoredContentModel';
import { useImmediateWeddingPageReveal } from './useImmediateWeddingPageReveal';
import LocationMap from './gyeol/LocationMap';
import styles from './WeddingBase.module.css';

export default function WeddingBase({ state, theme, demoComments, showMap = true }: WeddingThemeRendererProps & { theme: InvitationThemeKey; demoComments?: Comment[]; showMap?: boolean }) {
  useImmediateWeddingPageReveal(state);

  const page = state.pageConfig;
  const pageData = getThemePageData(page, theme);
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
  const contactCandidates = [
    {
      side: '신랑측',
      role: page.couple.groom.father?.relation || '아버지',
      name: page.couple.groom.father?.name,
      phone: page.couple.groom.father?.phone,
    },
    {
      side: '신랑측',
      role: page.couple.groom.mother?.relation || '어머니',
      name: page.couple.groom.mother?.name,
      phone: page.couple.groom.mother?.phone,
    },
    {
      side: '신랑측',
      role: page.couple.groom.order || '신랑',
      name: page.couple.groom.name,
      phone: page.couple.groom.phone,
    },
    {
      side: '신부측',
      role: page.couple.bride.father?.relation || '아버지',
      name: page.couple.bride.father?.name,
      phone: page.couple.bride.father?.phone,
    },
    {
      side: '신부측',
      role: page.couple.bride.mother?.relation || '어머니',
      name: page.couple.bride.mother?.name,
      phone: page.couple.bride.mother?.phone,
    },
    {
      side: '신부측',
      role: page.couple.bride.order || '신부',
      name: page.couple.bride.name,
      phone: page.couple.bride.phone,
    },
  ];
  const contacts = contactCandidates.flatMap((contact) => {
    const phone = contact.phone?.trim();

    return phone
      ? [
          {
            ...contact,
            name: contact.name?.trim() || contact.role,
            phone,
          },
        ]
      : [];
  });

  const gallery = (state.galleryImageUrls.length > 0 ? (
        <div data-wedding-section="gallery">
          <GalleryGridShared
            images={state.galleryImageUrls}
            previewImages={state.galleryPreviewImageUrls}
            imageAltPrefix={`${page.groomName}과 ${page.brideName}의 웨딩 갤러리`}
            title="사진"
            layout="carousel"
            swiperVariant={theme === 'romantic' || theme === 'emotional' || theme === 'classic-r' || theme === 'gyeol' ? theme : 'simple'}
            styles={styles}
          />
        </div>
      ) : null);
  const calendar = (<PublicInvitationDateFeature
        className={styles.dateSection}
        eventDate={state.weddingDate}
        mode="calendar-countdown"
        page={page}
        title="저희, 결혼합니다"
        titleClassName={styles.heading}
      />);

  return (
    <main
      className={styles.page}
      data-design={theme}
      aria-label={`${page.groomName}과 ${page.brideName}의 결혼식 초대장`}
    >
      <WeddingCover theme={theme} page={page} imageUrl={heroImageUrl} time={ceremony?.time} />

      {theme === 'romantic' || theme === 'classic-r' ? gallery : null}
      {invitationMessage ? (
        <section
          className={styles.invitationSection}
          data-wedding-section="invitation"
          aria-labelledby="wedding-invitation-title"
        >
          <h2 id="wedding-invitation-title" className={styles.heading}>
            초대의 글
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
          data-wedding-section="contact"
        >
          <summary className={styles.disclosureSummary}>가족에게 연락하기</summary>
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

      {theme !== 'romantic' && theme !== 'classic-r' ? gallery : null}

      {theme === 'gyeol' || theme === 'classic-r' ? calendar : null}
      <section
        id="wedding-info"
        className={styles.scheduleSection}
        data-wedding-section="schedule"
        aria-labelledby="wedding-schedule-title"
      >
        <h2 id="wedding-schedule-title" className={styles.heading}>오시는 길</h2>
        <div className={styles.scheduleContent}>
          <p className={styles.venueName}>{page.venue}</p>
          <p>{page.date}{ceremony?.time ? ` · ${ceremony.time}` : ''}</p>
          {ceremonyAddress && ceremonyAddress !== page.venue ? <address className={styles.address}>{ceremonyAddress}</address> : null}
          {venuePhone ? <a className={styles.venuePhone} href={`tel:${venuePhone}`} aria-label="예식장에 전화하기">{storedContent.ceremonyContact}</a> : null}
        </div>
        {showMap && storedContent.mapHref ? (
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

      {theme !== 'gyeol' && theme !== 'classic-r' ? calendar : null}

      {shouldShowGiftInfo(state) ? (
        <div data-wedding-section="gift">
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
        <div data-wedding-section="guestbook">
          <GuestbookThemed
            pageSlug={page.slug}
            demoComments={demoComments}
            styles={styles}
            title="축하의 마음"
            subtitle="두 사람에게 따뜻한 한마디를 남겨 주세요."
            statusColors={{ success: '#355b45', error: '#9b3f36' }}
            collapsibleForm
          />
        </div>
      ) : null}
    </main>
  );
}
