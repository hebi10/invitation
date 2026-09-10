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
import styles from './styles.module.css';
import LocationMap from './LocationMap';

export default function GyeolPage({ state }: WeddingThemeRendererProps) {
  useImmediateWeddingPageReveal(state);

  const page = state.pageConfig;
  const pageData = getThemePageData(page, 'gyeol');
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

  return (
    <main
      className={styles.page}
      aria-label={`${page.groomName}과 ${page.brideName}의 결혼식 초대장`}
    >
      <div data-gyeol-section="hero">
        {heroImageUrl ? (
          <section className={styles.hero} aria-labelledby="gyeol-couple-name">
            <figure className={styles.heroFigure}>
              <img
                src={heroImageUrl}
                alt={`${page.displayName} 대표 사진`}
                className={styles.heroImage}
                loading="eager"
                decoding="async"
              />
            </figure>
            <div className={styles.heroCopy}>
              <p className={styles.coverTitle} aria-hidden="true">Our<br />Wedding Day</p>
              <h1 id="gyeol-couple-name" className={styles.heroNames}>
                <span>{page.groomName}</span>
                <span className={styles.nameJoin} aria-hidden="true">&amp;</span>
                <span>{page.brideName}</span>
              </h1>
              <div className={styles.heroMeta}>
                <p>{page.date}</p>
                {ceremony?.time ? <p>{ceremony.time}</p> : null}
                <p>{page.venue}</p>
              </div>
            </div>
          </section>
        ) : (
          <div className={styles.posterScene}>
            <InvitationPoster
              title={page.displayName}
              dateLabel={page.date}
              locationLabel={page.venue}
              tone="paper"
            />
          </div>
        )}
      </div>

      {invitationMessage ? (
        <section
          className={styles.invitationSection}
          data-gyeol-section="invitation"
          aria-labelledby="gyeol-invitation-title"
        >
          <h2 id="gyeol-invitation-title" className={styles.heading}>
            소중한 분들을 초대합니다
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
          data-gyeol-section="contact"
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

      {state.galleryImageUrls.length > 0 ? (
        <div data-gyeol-section="gallery">
          <GalleryGridShared
            images={state.galleryImageUrls}
            previewImages={state.galleryPreviewImageUrls}
            imageAltPrefix={`${page.groomName}과 ${page.brideName}의 웨딩 갤러리`}
            title="우리의 순간"
            layout="carousel"
            styles={styles}
          />
        </div>
      ) : null}

      <section
        id="wedding-info"
        className={styles.scheduleSection}
        data-gyeol-section="schedule"
        aria-labelledby="gyeol-schedule-title"
      >
        <h2 id="gyeol-schedule-title" className={styles.heading}>오시는 길</h2>
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
        <div data-gyeol-section="gift">
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
        <div data-gyeol-section="guestbook">
          <GuestbookThemed
            pageSlug={page.slug}
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
