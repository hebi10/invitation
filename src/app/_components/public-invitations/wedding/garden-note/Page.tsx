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
import { useImmediateWeddingPageReveal } from '../useImmediateWeddingPageReveal';
import letterpressStyles from '../letterpress/styles.module.css';
import styles from './styles.module.css';

const componentStyles = { ...letterpressStyles, ...styles };

export default function GardenNotePage({ state }: WeddingThemeRendererProps) {
  useImmediateWeddingPageReveal(state);

  const page = state.pageConfig;
  const pageData = getThemePageData(page, 'romantic');
  const ceremony = getCeremonySchedule(page, pageData);
  const ceremonyAddress = getCeremonyAddress(page, pageData).trim();
  const heroImageUrl = state.mainImageUrl.trim();
  const greeting = pageData?.greetingMessage
    ?.replace(/<br\s*\/?>/gi, '\n')
    .trim();
  const greetingAuthor = pageData?.greetingAuthor?.trim();
  const features = resolveInvitationFeatures(page.productTier, page.features);
  const familyMembers = [page.couple.groom.father, page.couple.groom.mother, page.couple.bride.father, page.couple.bride.mother]
    .flatMap((member, index) => {
      const phone = member?.phone?.trim();

      if (!member || !phone) {
        return [];
      }

      return [{
        side: index < 2 ? '신랑측' : '신부측',
        relation: member.relation.trim() || (index % 2 === 0 ? '아버지' : '어머니'),
        name: member.name.trim() || member.relation,
        phone,
      }];
    });

  return (
    <main
      className={styles.page}
      aria-label={`${page.groomName}과 ${page.brideName}의 결혼식 초대장`}
    >
      <section
        className={styles.noteHero}
        data-garden-note-section="letter"
        aria-labelledby="garden-note-title"
      >
        <span
          className={styles.botanicalLine}
          data-garden-note-decoration="botanical-line"
          aria-hidden="true"
        />
        <div className={styles.noteCopy}>
          <h1 id="garden-note-title" className={styles.noteTitle}>
            {page.groomName}
            <span aria-hidden="true"> · </span>
            {page.brideName}
          </h1>
          {greeting ? <p className={styles.noteBody}>{greeting}</p> : null}
          {greetingAuthor ? <p className={styles.noteAuthor}>{greetingAuthor}</p> : null}
        </div>
        {heroImageUrl ? (
          <figure className={styles.noteImageFrame}>
            <img
              src={heroImageUrl}
              alt={`${page.displayName} 대표 사진`}
              className={styles.noteImage}
              loading="eager"
              decoding="async"
            />
          </figure>
        ) : (
          <InvitationPoster
            title={page.displayName}
            dateLabel={page.date}
            locationLabel={page.venue}
            tone="paper"
          />
        )}
      </section>

      <section
        id="wedding-info"
        className={styles.ceremonySection}
        data-garden-note-section="ceremony"
        aria-labelledby="garden-note-ceremony"
      >
        <h2 id="garden-note-ceremony" className={styles.sectionHeading}>
          예식 안내
        </h2>
        <div className={styles.ceremonyDetails}>
          <p className={styles.ceremonyDate}>{page.date}</p>
          {ceremony?.time ? <p>{ceremony.time}</p> : null}
          <p className={styles.ceremonyVenue}>{page.venue}</p>
          {ceremonyAddress ? <p>{ceremonyAddress}</p> : null}
        </div>
        {pageData?.mapUrl?.trim() ? (
          <a className={styles.mapLink} href={pageData.mapUrl.trim()} target="_blank" rel="noreferrer">
            지도에서 보기
          </a>
        ) : null}
      </section>

      {familyMembers.length > 0 ? (
        <section
          className={styles.familySection}
          data-garden-note-section="family"
          aria-labelledby="garden-note-family"
        >
          <h2 id="garden-note-family" className={styles.sectionHeading}>
            가족에게 연락하기
          </h2>
          <ul className={styles.familyList}>
            {familyMembers.map((member) => (
              <li key={`${member.side}-${member.relation}-${member.name}`}>
                <div>
                  <span>{member.side}</span>
                  <strong>{member.relation} {member.name}</strong>
                </div>
                <div className={styles.familyActions}>
                  <a href={`tel:${member.phone}`} aria-label={`${member.name}에게 전화하기`}>
                    전화
                  </a>
                  <a href={`sms:${member.phone}`} aria-label={`${member.name}에게 문자 보내기`}>
                    문자
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {shouldShowGiftInfo(state) ? (
        <div data-garden-note-section="gift">
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
        <div data-garden-note-section="gallery">
          <GalleryGridShared
            images={state.galleryImageUrls}
            previewImages={state.galleryPreviewImageUrls}
            imageAltPrefix={`${page.groomName}과 ${page.brideName}의 웨딩 갤러리`}
            title="함께 자란 시간"
            styles={componentStyles}
          />
        </div>
      ) : null}

      {features.showGuestbook ? (
        <div data-garden-note-section="guestbook">
          <GuestbookThemed
            pageSlug={page.slug}
            styles={componentStyles}
            title="축하의 글"
            subtitle="두 사람의 새 계절에 따뜻한 말을 남겨 주세요."
            statusColors={{ success: '#466044', error: '#943d36' }}
          />
        </div>
      ) : null}
    </main>
  );
}
