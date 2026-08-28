'use client';

import { useEffect } from 'react';

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
import letterpressStyles from '../letterpress/styles.module.css';
import styles from './styles.module.css';

const componentStyles = { ...letterpressStyles, ...styles };

export default function PortraitLetterPage({ state }: WeddingThemeRendererProps) {
  const { imagesLoading, isLoading, setIsLoading } = state;
  const page = state.pageConfig;
  const pageData = getThemePageData(page, 'emotional');
  const ceremony = getCeremonySchedule(page, pageData);
  const ceremonyAddress = getCeremonyAddress(page, pageData).trim();
  const heroImageUrl = state.mainImageUrl.trim();
  const invitationMessage = pageData?.greetingMessage
    ?.replace(/<br\s*\/?>/gi, '\n')
    .trim();
  const invitationAuthor = pageData?.greetingAuthor?.trim();
  const features = resolveInvitationFeatures(page.productTier, page.features);
  const contacts = [
    { side: '신랑측', role: page.couple.groom.order || '신랑', ...page.couple.groom },
    { side: '신부측', role: page.couple.bride.order || '신부', ...page.couple.bride },
  ].flatMap((contact) => {
    const phone = contact.phone?.trim();

    return phone
      ? [{ ...contact, name: contact.name.trim() || contact.role, phone }]
      : [];
  });

  useEffect(() => {
    setIsLoading(false);

    document.body.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow');
  }, [imagesLoading, isLoading, setIsLoading]);

  return (
    <main
      className={styles.page}
      aria-label={`${page.groomName}과 ${page.brideName}의 결혼식 초대장`}
    >
      <div data-portrait-letter-section="portrait">
        {heroImageUrl ? (
          <section
            className={styles.portraitHero}
            aria-labelledby="portrait-letter-couple"
          >
            <figure className={styles.portraitFrame}>
              <img
                src={heroImageUrl}
                alt={`${page.displayName} 대표 사진`}
                className={styles.portraitImage}
                loading="eager"
                decoding="async"
              />
            </figure>
            <div className={styles.portraitCaption}>
              <h1 id="portrait-letter-couple" className={styles.coupleNames}>
                {page.groomName}
                <span aria-hidden="true"> 그리고 </span>
                {page.brideName}
              </h1>
              <p>{page.date}</p>
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
          className={styles.letterSection}
          data-portrait-letter-section="letter"
          aria-labelledby="portrait-letter-title"
        >
          <h2 id="portrait-letter-title" className={styles.sectionHeading}>
            당신께 보내는 초대
          </h2>
          <p className={styles.letterBody}>{invitationMessage}</p>
          {invitationAuthor ? (
            <p className={styles.letterAuthor}>{invitationAuthor}</p>
          ) : null}
        </section>
      ) : null}

      <section
        id="wedding-info"
        className={styles.scheduleSection}
        data-portrait-letter-section="schedule"
        aria-labelledby="portrait-letter-schedule"
      >
        <h2 id="portrait-letter-schedule" className={styles.sectionHeading}>
          약속한 날
        </h2>
        <dl className={styles.scheduleList}>
          <div>
            <dt>날짜</dt>
            <dd>{page.date}</dd>
          </div>
          {ceremony?.time ? (
            <div>
              <dt>시간</dt>
              <dd>{ceremony.time}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section
        className={styles.locationSection}
        data-portrait-letter-section="location"
        aria-labelledby="portrait-letter-location"
      >
        <div>
          <h2 id="portrait-letter-location" className={styles.locationTitle}>
            {page.venue}
          </h2>
          {ceremonyAddress ? <p>{ceremonyAddress}</p> : null}
        </div>
        {pageData?.mapUrl?.trim() ? (
          <a href={pageData.mapUrl.trim()} target="_blank" rel="noreferrer">
            지도에서 보기
          </a>
        ) : null}
      </section>

      {contacts.length > 0 ? (
        <section
          className={styles.contactSection}
          data-portrait-letter-section="contact"
          aria-labelledby="portrait-letter-contact"
        >
          <h2 id="portrait-letter-contact" className={styles.sectionHeading}>
            두 사람에게 연락하기
          </h2>
          <ul className={styles.contactList}>
            {contacts.map((contact) => (
              <li key={contact.side}>
                <div>
                  <span className={styles.contactSide}>{contact.side}</span>
                  <strong>{contact.name}</strong>
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
        </section>
      ) : null}

      {shouldShowGiftInfo(state) ? (
        <div data-portrait-letter-section="gift">
          <GiftInfoThemed
            groomAccounts={state.giftInfo?.groomAccounts ?? []}
            brideAccounts={state.giftInfo?.brideAccounts ?? []}
            message={state.giftInfo?.message}
            styles={componentStyles}
            title="마음 전하실 곳"
            groomSectionTitle="신랑측 계좌"
            brideSectionTitle="신부측 계좌"
            copyLabel="복사"
          />
        </div>
      ) : null}

      {state.galleryImageUrls.length > 0 ? (
        <div data-portrait-letter-section="gallery">
          <GalleryGridShared
            images={state.galleryImageUrls}
            previewImages={state.galleryPreviewImageUrls}
            imageAltPrefix={`${page.groomName}과 ${page.brideName}의 웨딩 갤러리`}
            title="함께한 장면"
            styles={componentStyles}
          />
        </div>
      ) : null}

      {features.showGuestbook ? (
        <div data-portrait-letter-section="guestbook">
          <GuestbookThemed
            pageSlug={page.slug}
            styles={componentStyles}
            title="답장을 남겨 주세요"
            subtitle="두 사람에게 전하고 싶은 마음을 적어 주세요."
            statusColors={{ success: '#425b4b', error: '#963f38' }}
          />
        </div>
      ) : null}
    </main>
  );
}
