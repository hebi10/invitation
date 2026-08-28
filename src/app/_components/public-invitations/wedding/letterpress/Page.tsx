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
import { PublicInvitationDateFeature } from '../../shared/PublicInvitationDateFeature';
import { WeddingStoredContent } from '../../shared/WeddingStoredContent';
import { buildWeddingStoredContent } from '../../shared/weddingStoredContentModel';
import styles from './styles.module.css';

export default function LetterpressPage({ state }: WeddingThemeRendererProps) {
  const { imagesLoading, isLoading, setIsLoading } = state;
  const page = state.pageConfig;
  const pageData = getThemePageData(page, 'classic-r');
  const ceremony = getCeremonySchedule(page, pageData);
  const ceremonyAddress = getCeremonyAddress(page, pageData);
  const storedContent = buildWeddingStoredContent(page, pageData);
  const heroImageUrl = state.mainImageUrl.trim();
  const invitationMessage = storedContent.greetingMessage;
  const invitationAuthor = storedContent.greetingAuthor;
  const features = resolveInvitationFeatures(page.productTier, page.features);
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

    if (!phone) {
      return [];
    }

    return [
      {
        ...contact,
        name: contact.name?.trim() || contact.role,
        phone,
      },
    ];
  });

  useEffect(() => {
    setIsLoading(false);

    const releasePageOverflow = () => {
      document.body.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('overflow');
    };

    releasePageOverflow();
    const frame = window.requestAnimationFrame(releasePageOverflow);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [imagesLoading, isLoading, setIsLoading]);

  return (
    <main
      className={styles.page}
      aria-label={`${page.groomName}과 ${page.brideName}의 결혼식 초대장`}
    >
      <div data-letterpress-section="hero">
        {heroImageUrl ? (
          <section className={styles.hero} aria-labelledby="letterpress-couple-name">
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
              <h1 id="letterpress-couple-name" className={styles.heroNames}>
                {page.groomName}
                <span aria-hidden="true"> · </span>
                {page.brideName}
              </h1>
              <p className={styles.heroDate}>{page.date}</p>
              <p className={styles.heroVenue}>{page.venue}</p>
            </div>
          </section>
        ) : (
          <InvitationPoster
            title={page.displayName}
            dateLabel={page.date}
            locationLabel={page.venue}
            tone="paper"
          />
        )}
      </div>

      {invitationMessage ? (
        <section
          className={styles.section}
          data-letterpress-section="invitation"
          aria-labelledby="letterpress-invitation-title"
        >
          <h2 id="letterpress-invitation-title" className={styles.sectionTitle}>
            초대합니다
          </h2>
          <p className={styles.invitationMessage}>{invitationMessage}</p>
          {invitationAuthor ? (
            <p className={styles.invitationAuthor}>{invitationAuthor}</p>
          ) : null}
        </section>
      ) : null}

      <PublicInvitationDateFeature
        className={styles.section}
        eventDate={state.weddingDate}
        mode="calendar-countdown"
        page={page}
        title="결혼식까지"
        titleClassName={styles.sectionTitle}
      />

      <section
        id="wedding-info"
        className={styles.section}
        data-letterpress-section="schedule"
        aria-labelledby="letterpress-schedule-title"
      >
        <h2 id="letterpress-schedule-title" className={styles.sectionTitle}>
          일정과 장소
        </h2>
        <dl className={styles.details}>
          <div className={styles.detailRow}>
            <dt>날짜</dt>
            <dd>{page.date}</dd>
          </div>
          {ceremony?.time ? (
            <div className={styles.detailRow}>
              <dt>시간</dt>
              <dd>{ceremony.time}</dd>
            </div>
          ) : null}
          <div className={styles.detailRow}>
            <dt>예식장</dt>
            <dd>{page.venue}</dd>
          </div>
          {ceremonyAddress ? (
            <div className={styles.detailRow}>
              <dt>주소</dt>
              <dd>{ceremonyAddress}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <WeddingStoredContent
        className={styles.section}
        model={storedContent}
        titleClassName={styles.sectionTitle}
      />

      {contacts.length > 0 ? (
        <section
          className={styles.section}
          data-letterpress-section="contact"
          aria-labelledby="letterpress-contact-title"
        >
          <h2 id="letterpress-contact-title" className={styles.sectionTitle}>
            연락처
          </h2>
          <ul className={styles.contactList}>
            {contacts.map((contact) => (
              <li
                className={styles.contactItem}
                key={`${contact.side}-${contact.role}-${contact.name}`}
              >
                <div className={styles.contactIdentity}>
                  <span className={styles.contactSide}>{contact.side}</span>
                  <span>
                    {contact.role} {contact.name}
                  </span>
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
        <div data-letterpress-section="gift">
          <GiftInfoThemed
            groomAccounts={state.giftInfo?.groomAccounts ?? []}
            brideAccounts={state.giftInfo?.brideAccounts ?? []}
            message={state.giftInfo?.message}
            styles={styles}
            title="마음 전하실 곳"
            groomSectionTitle="신랑측 계좌"
            brideSectionTitle="신부측 계좌"
            copyLabel="복사"
          />
        </div>
      ) : null}

      {state.galleryImageUrls.length > 0 ? (
        <div data-letterpress-section="gallery">
          <GalleryGridShared
            images={state.galleryImageUrls}
            previewImages={state.galleryPreviewImageUrls}
            imageAltPrefix={`${page.groomName}과 ${page.brideName}의 웨딩 갤러리`}
            title="우리의 장면"
            styles={styles}
          />
        </div>
      ) : null}

      {features.showGuestbook ? (
        <div data-letterpress-section="guestbook">
          <GuestbookThemed
            pageSlug={page.slug}
            styles={styles}
            title="축하 메시지"
            subtitle="두 사람에게 따뜻한 마음을 남겨 주세요."
            statusColors={{
              success: '#49614f',
              error: '#9f3f36',
            }}
          />
        </div>
      ) : null}
    </main>
  );
}
