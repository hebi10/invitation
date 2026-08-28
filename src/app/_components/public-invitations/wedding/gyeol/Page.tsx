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
              <h1 id="gyeol-couple-name" className={styles.heroNames}>
                <span>{page.groomName}</span>
                <span className={styles.nameJoin} aria-hidden="true">과</span>
                <span>{page.brideName}</span>
              </h1>
              <div className={styles.heroMeta}>
                <p>{page.date}</p>
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
            두 사람의 결이<br />하나로 이어지는 날
          </h2>
          <div className={styles.invitationCopy}>
            <p>{invitationMessage}</p>
            {invitationAuthor ? <p className={styles.invitationAuthor}>{invitationAuthor}</p> : null}
          </div>
        </section>
      ) : null}

      <PublicInvitationDateFeature
        className={styles.dateSection}
        eventDate={state.weddingDate}
        mode="calendar-countdown"
        page={page}
        title="기다리는 날"
        titleClassName={styles.heading}
      />

      <section
        id="wedding-info"
        className={styles.scheduleSection}
        data-gyeol-section="schedule"
        aria-labelledby="gyeol-schedule-title"
      >
        <div className={styles.scheduleHeading}>
          <h2 id="gyeol-schedule-title" className={styles.heading}>
            예식 안내
          </h2>
          <p>오래 기억될 하루에 귀한 걸음을 청합니다.</p>
        </div>
        <div className={styles.scheduleContent}>
          <dl className={styles.details}>
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
            <div>
              <dt>장소</dt>
              <dd>{page.venue}</dd>
            </div>
          </dl>
          {ceremonyAddress ? (
            <address className={styles.address}>{ceremonyAddress}</address>
          ) : null}
        </div>
      </section>

      <WeddingStoredContent
        className={styles.storedSection}
        model={storedContent}
        titleClassName={styles.heading}
      />

      {contacts.length > 0 ? (
        <section
          className={styles.contactSection}
          data-gyeol-section="contact"
          aria-labelledby="gyeol-contact-title"
        >
          <h2 id="gyeol-contact-title" className={styles.heading}>
            마음을 전하는 방법
          </h2>
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
        </section>
      ) : null}

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
          />
        </div>
      ) : null}

      {state.galleryImageUrls.length > 0 ? (
        <div data-gyeol-section="gallery">
          <GalleryGridShared
            images={state.galleryImageUrls}
            previewImages={state.galleryPreviewImageUrls}
            imageAltPrefix={`${page.groomName}과 ${page.brideName}의 웨딩 갤러리`}
            title="함께 쌓인 장면"
            styles={styles}
          />
        </div>
      ) : null}

      {features.showGuestbook ? (
        <div data-gyeol-section="guestbook">
          <GuestbookThemed
            pageSlug={page.slug}
            styles={styles}
            title="두 사람에게 남기는 글"
            subtitle="축하의 마음을 천천히 적어 주세요."
            statusColors={{ success: '#355b45', error: '#9b3f36' }}
          />
        </div>
      ) : null}
    </main>
  );
}
