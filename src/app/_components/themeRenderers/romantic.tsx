'use client';

import { useState } from 'react';

import { Gallery, Guestbook, WeddingLoader } from '@/components/sections';
import WeddingCountdownDisplay from '@/components/sections/WeddingCountdown/WeddingCountdownDisplay';
import { copyTextToClipboard } from '@/utils/copyTextToClipboard';
import {
  buildGoogleMapSearchUrl,
  buildKakaoMapSearchUrl,
  buildNaverMapSearchUrl,
} from '@/utils/kakaoMaps';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';

import {
  createWeddingThemeRenderer,
  getCeremonyAddress,
  getCeremonyContact,
  getMapDescription,
  getThemePageData,
  shouldShowGiftInfo,
} from '../weddingPageRenderers';
import styles from './romantic.module.css';

interface BankAccount {
  bank: string;
  accountNumber: string;
  accountHolder: string;
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

function formatDateLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAY_LABELS[date.getDay()]})`;
}

function getDisplayTime(date: Date, ceremonyTime: string) {
  if (ceremonyTime.trim()) {
    return ceremonyTime.trim();
  }

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const countdownStyles = {
  countdownContainer: styles.countdownContainer,
  icon: styles.countdownIcon,
  content: styles.countdownContent,
  title: styles.countdownTitle,
  subtitle: styles.countdownSubtitle,
  timeDisplay: styles.countdownTimeDisplay,
  timeUnit: styles.countdownTimeUnit,
  timeNumber: styles.countdownTimeNumber,
  timeLabel: styles.countdownTimeLabel,
  separator: styles.countdownSeparator,
} as const;

function RomanticGiftSection({
  groomAccounts,
  brideAccounts,
  message,
}: {
  groomAccounts: BankAccount[];
  brideAccounts: BankAccount[];
  message: string;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const renderAccounts = (title: string, accounts: BankAccount[]) => (
    <div className={styles.accountSection}>
      <h3 className={styles.accountTitle}>{title}</h3>
      {accounts.map((account, index) => {
        const key = `${title}-${index}`;
        const value = `${account.bank} ${account.accountNumber}`;
        return (
          <div className={styles.accountCard} key={key}>
            <div>
              <div className={styles.accountName}>{account.accountHolder}</div>
              <div className={styles.accountInfo}>{account.bank}</div>
              <div className={styles.accountInfoMonospace}>{account.accountNumber}</div>
            </div>
            <button
              type="button"
              className={styles.copyButton}
              onClick={async () => {
                const ok = await copyTextToClipboard(value);
                if (!ok) {
                  return;
                }

                setCopiedKey(key);
                window.setTimeout(() => {
                  setCopiedKey((current) => (current === key ? null : current));
                }, 1800);
              }}
            >
              {copiedKey === key ? '복사됨' : '계좌 복사'}
            </button>
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      <p className={styles.sectionMessage}>
        {message.split('\n').map((line, index, lines) => (
          <span key={`${line}-${index}`}>
            {line}
            {index < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
      {groomAccounts.length > 0 ? renderAccounts('신랑측', groomAccounts) : null}
      {brideAccounts.length > 0 ? renderAccounts('신부측', brideAccounts) : null}
    </div>
  );
}

export default createWeddingThemeRenderer({
  ariaLabelSuffix: ' (Romantic)',
  renderLoader: ({ state }) => (
    <WeddingLoader
      groomName={state.pageConfig.groomName}
      brideName={state.pageConfig.brideName}
      onLoadComplete={() => state.setIsLoading(false)}
      mainImage={state.mainImageUrl}
      preloadImages={state.preloadImages}
      duration={2500}
    />
  ),
  sections: [
    ({ state }) => {
      const pageData = getThemePageData(state.pageConfig, 'romantic');
      const heroDate = formatDateLabel(state.weddingDate);
      const heroTime = getDisplayTime(state.weddingDate, pageData?.ceremonyTime || '');

      return (
        <section className={styles.hero}>
          {state.mainImageUrl ? (
            <img
              src={state.mainImageUrl}
              alt={`${state.pageConfig.groomName} & ${state.pageConfig.brideName} 커플 썸네일`}
              className={styles.heroImage}
            />
          ) : (
            <div className={styles.heroNoImage} />
          )}
          <div className={styles.heroOverlay} />
          <div className={styles.heroContent}>
            <div className={styles.heroDateLine}>
              {heroDate} · {heroTime}
            </div>
            <h1 className={styles.heroNames}>
              <span>{state.pageConfig.groomName}</span>
              <span className={styles.heroAmpersand}> &amp; </span>
              <span>{state.pageConfig.brideName}</span>
            </h1>
            <p className={styles.heroVenue}>{state.pageConfig.venue}</p>
          </div>
        </section>
      );
    },
    ({ state }) => {
      const pageData = getThemePageData(state.pageConfig, 'romantic');
      const greeting = pageData?.greetingMessage ?? '';
      const greetingAuthor = pageData?.greetingAuthor ?? '신랑&신부';

      return (
        <section className={styles.section}>
          <p className={styles.sectionLabel}>Invitation</p>
          <div className={styles.sectionDivider} />
          <p className={styles.greetingText}>
            {greeting || `${state.pageConfig.displayName}의 결혼식에 초대합니다.`}
          </p>
          <p className={styles.greetingAuthor}>from. {greetingAuthor}</p>
        </section>
      );
    },
    ({ state }) => {
      const pageData = getThemePageData(state.pageConfig, 'romantic');
      const features = resolveInvitationFeatures(state.pageConfig.productTier, state.pageConfig.features);
      const address = getCeremonyAddress(state.pageConfig, pageData);
      const eventTime = getDisplayTime(state.weddingDate, pageData?.ceremonyTime || '');

      return (
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <p className={styles.sectionLabel}>Date</p>
          <div className={styles.sectionDivider} />
          <div className={styles.dateCard}>
            <div className={styles.dateMain}>{state.weddingDate.getDate()}</div>
            <div className={styles.dateMeta}>{formatDateLabel(state.weddingDate)}</div>
            <div className={styles.dateMeta}>{eventTime}</div>
            <div className={styles.dateVenue}>{address || state.pageConfig.venue}</div>
          </div>
          <p className={styles.sectionLabel}>D-DAY</p>
          {features.showCountdown ? (
            <WeddingCountdownDisplay
              targetDate={state.weddingDate}
              title="D-DAY"
              separator=":"
              styles={countdownStyles}
              expiredTitle="축하해요, 이미 지나간 날이에요"
              expiredSubtitle="새로워진 기억으로 오래 남길 거예요."
            />
          ) : null}
        </section>
      );
    },
    ({ state }) => (
      <section className={`${styles.section} ${styles.sectionDark} ${styles.gallerySection}`}>
        <p className={styles.sectionLabel}>Gallery</p>
        <h2 className={styles.sectionTitle}>우리의 이야기</h2>
        <Gallery
          images={state.galleryImageUrls}
          previewImages={state.galleryPreviewImageUrls}
          imagesLoading={state.imagesLoading}
          title=""
        />
      </section>
    ),
    ({ state }) => {
      const pageData = getThemePageData(state.pageConfig, 'romantic');
      const address = getCeremonyAddress(state.pageConfig, pageData);
      const contact = getCeremonyContact(state.pageConfig, pageData);
      const description = getMapDescription(state.pageConfig, pageData);
      const rows = [
        {
          icon: '🏛',
          label: '행사장',
          value: state.pageConfig.venue,
        },
        {
          icon: '📍',
          label: '주소',
          value: address,
        },
        {
          icon: '🕒',
          label: '안내',
          value: description,
        },
        {
          icon: '☎',
          label: '연락처',
          value: contact,
        },
      ].filter((row) => row.value?.trim());

      return (
        <section className={styles.section}>
          <p className={styles.sectionLabel}>Location</p>
          <div className={styles.sectionDivider} />
          <div className={styles.sectionTitle}>오시는 길</div>

          <div className={styles.mapPlaceholder}>
            <div className={styles.mapGrid} />
            <span className={styles.mapPin} />
            <div className={styles.mapLabel}>모바일 지도 프리뷰</div>
          </div>

          <div className={styles.locationRows}>
            {rows.map((row) => (
              <div className={styles.locationRow} key={row.label}>
                <div className={styles.locationIcon}>{row.icon}</div>
                <div className={styles.locationText}>
                  <div className={styles.locationLabel}>{row.label}</div>
                  <div className={styles.locationValue}>{row.value}</div>
                </div>
              </div>
            ))}
          </div>

          {address ? (
            <div className={styles.mapActions}>
              <button
                type="button"
                className={styles.mapAction}
                onClick={() => window.open(buildGoogleMapSearchUrl(address), '_blank')}
              >
                Google Map
              </button>
              <button
                type="button"
                className={styles.mapAction}
                onClick={() => window.open(buildNaverMapSearchUrl(address), '_blank')}
              >
                Naver Map
              </button>
              <button
                type="button"
                className={styles.mapAction}
                onClick={() => window.open(buildKakaoMapSearchUrl(address), '_blank')}
              >
                Kakao Map
              </button>
            </div>
          ) : null}
        </section>
      );
    },
    ({ state }) => {
      const pageData = getThemePageData(state.pageConfig, 'romantic');
      const groomAccounts = pageData?.giftInfo?.groomAccounts ?? state.giftInfo?.groomAccounts ?? [];
      const brideAccounts = pageData?.giftInfo?.brideAccounts ?? state.giftInfo?.brideAccounts ?? [];
      const message = pageData?.giftInfo?.message ?? state.giftInfo?.message ?? '축하의 마음을 담아 축의금을 전해 주세요.';

      if (!shouldShowGiftInfo(state)) {
        return null;
      }

      return (
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <p className={styles.sectionLabel}>Gift</p>
          <div className={styles.sectionDivider} />
          <div className={styles.sectionTitle}>마음 전하기</div>
          <RomanticGiftSection
            groomAccounts={groomAccounts}
            brideAccounts={brideAccounts}
            message={message}
          />
        </section>
      );
    },
    ({ state }) => {
      const features = resolveInvitationFeatures(state.pageConfig.productTier, state.pageConfig.features);

      if (!features.showGuestbook) {
        return null;
      }

      return (
        <section className={styles.section}>
          <p className={styles.sectionLabel}>Guestbook</p>
          <div className={styles.sectionDivider} />
          <div className={styles.sectionTitle}>축하 메시지</div>
          <Guestbook pageSlug={state.pageConfig.slug} />
        </section>
      );
    },
    ({ state }) => (
      <footer className={styles.footer}>
        <div className={styles.footerHeart}>♡</div>
        <div className={styles.footerNames}>
          {state.pageConfig.groomName} & {state.pageConfig.brideName}
        </div>
        <div className={styles.footerDate}>
          {formatDateLabel(state.weddingDate)} · {state.pageConfig.venue}
        </div>
        <div className={styles.footerDivider} />
        <p className={styles.footerText}>함께하는 가장 큰 날로 기억되길 바랍니다.</p>
      </footer>
    ),
  ],
});
