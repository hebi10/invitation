'use client';

import { useEffect, useMemo, useState } from 'react';

import GuestbookThemed from '@/components/sections/Guestbook/GuestbookThemed';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import { copyTextToClipboard } from '@/utils/copyTextToClipboard';

import type { EventPageReadyState } from '../../eventPageState';
import { buildFirstBirthdayInvitationViewModel } from '../firstBirthdayAdapter';
import type { FirstBirthdayThemeKey } from '../firstBirthdayThemes';
import styles from '../FirstBirthdayInvitationPage.module.css';

type FirstBirthdayThemeRendererProps = {
  state: EventPageReadyState;
  theme: FirstBirthdayThemeKey;
};

export function getCountdownParts(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());

  return [
    ['일', Math.floor(diff / 86400000)],
    ['시간', Math.floor((diff % 86400000) / 3600000)],
    ['분', Math.floor((diff % 3600000) / 60000)],
    ['초', Math.floor((diff % 60000) / 1000)],
  ] as const;
}

function useCountdownParts(target: Date) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return useMemo(() => {
    if (now === null) {
      return [
        ['일', 0],
        ['시간', 0],
        ['분', 0],
        ['초', 0],
      ] as const;
    }

    const diff = Math.max(0, target.getTime() - now);

    return [
      ['일', Math.floor(diff / 86400000)],
      ['시간', Math.floor((diff % 86400000) / 3600000)],
      ['분', Math.floor((diff % 3600000) / 60000)],
      ['초', Math.floor((diff % 60000) / 1000)],
    ] as const;
  }, [now, target]);
}

function AccountCard({
  account,
  title,
}: {
  account: { bank: string; accountNumber: string; accountHolder: string };
  title: string;
}) {
  const [copied, setCopied] = useState(false);
  const copyValue = `${account.bank} ${account.accountNumber}`.trim();

  return (
    <article className={styles.accountCard}>
      <div className={styles.accountTop}>
        <div>
          <div className={styles.accountName}>{account.accountHolder || title}</div>
          <div className={styles.accountMeta}>{title}</div>
        </div>
        <button
          type="button"
          className={styles.copyButton}
          onClick={async () => {
            const ok = await copyTextToClipboard(copyValue);
            if (!ok) {
              return;
            }

            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          }}
        >
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      <div className={styles.accountMeta}>
        {account.bank} {account.accountNumber}
      </div>
    </article>
  );
}

export function FirstBirthdayThemeRenderer({
  state,
  theme,
}: FirstBirthdayThemeRendererProps) {
  const model = buildFirstBirthdayInvitationViewModel(state);
  const features = resolveInvitationFeatures(
    state.pageConfig.productTier,
    state.pageConfig.features
  );
  const countdownParts = useCountdownParts(model.countdownDate);
  const rootClassName = `${styles.page} ${
    theme === 'first-birthday-mint' ? styles.mint : styles.pink
  }`;
  const hasGiftAccounts = model.dadAccounts.length > 0 || model.momAccounts.length > 0;

  return (
    <main className={rootClassName} aria-label={`${model.babyName} 돌잔치 초대장`}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroImage}>
            {model.coverImageUrl ? (
              <img src={model.coverImageUrl} alt={`${model.babyName} 대표 이미지`} />
            ) : (
              <div className={styles.heroImageFallback}>First Birthday</div>
            )}
          </div>
          <div className={styles.heroCopy}>
            <span className={styles.sectionKicker}>First Birthday</span>
            <h1 className={styles.title}>{model.babyName}</h1>
            <p className={styles.subtitle}>{model.subtitle}</p>
            <div className={styles.quickInfo}>
              <div className={styles.quickInfoItem}>
                <span className={styles.quickInfoLabel}>DATE</span>
                <strong className={styles.quickInfoValue}>{model.dateLabel}</strong>
              </div>
              <div className={styles.quickInfoItem}>
                <span className={styles.quickInfoLabel}>TIME</span>
                <strong className={styles.quickInfoValue}>{model.timeLabel}</strong>
              </div>
              <div className={styles.quickInfoItem}>
                <span className={styles.quickInfoLabel}>PLACE</span>
                <strong className={styles.quickInfoValue}>{model.venueName}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Invitation</span>
            <h2 className={styles.sectionTitle}>초대합니다</h2>
          </div>
          <div className={styles.messageCard}>
            <p className={styles.messageText}>{model.greeting}</p>
            <span className={styles.author}>{model.greetingAuthor}</span>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Growth Gallery</span>
            <h2 className={styles.sectionTitle}>성장 갤러리</h2>
          </div>
          {model.galleryImageUrls.length > 0 ? (
            <div className={styles.galleryGrid}>
              {model.galleryImageUrls.map((imageUrl, index) => (
                <div className={styles.galleryItem} key={`${imageUrl}-${index}`}>
                  <img src={imageUrl} alt={`${model.babyName} 성장 사진 ${index + 1}`} />
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyText}>성장 사진을 등록하면 이 영역에 표시됩니다.</p>
          )}
        </div>
      </section>

      {features.showCountdown ? (
        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionKicker}>D-Day</span>
              <h2 className={styles.sectionTitle}>돌잔치까지</h2>
            </div>
            <div className={styles.countdownGrid}>
              {countdownParts.map(([label, value]) => (
                <div className={styles.detailItem} key={label}>
                  <strong className={styles.countNumber}>
                    {String(value).padStart(2, '0')}
                  </strong>
                  <span className={styles.detailLabel}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Location</span>
            <h2 className={styles.sectionTitle}>오시는 길</h2>
          </div>
          <div className={styles.detailCard}>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>장소</span>
                <strong className={styles.detailValue}>{model.venueName}</strong>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>주소</span>
                <strong className={styles.detailValue}>
                  {model.address || '주소를 입력해 주세요'}
                </strong>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>시간</span>
                <strong className={styles.detailValue}>{model.timeLabel}</strong>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>연락처</span>
                <strong className={styles.detailValue}>{model.contact || '-'}</strong>
              </div>
            </div>
            <p className={styles.emptyText}>{model.mapDescription}</p>
            {model.mapUrl ? (
              <a className={styles.mapButton} href={model.mapUrl} target="_blank" rel="noreferrer">
                지도 열기
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {hasGiftAccounts ? (
        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionKicker}>Gift</span>
              <h2 className={styles.sectionTitle}>마음 전하기</h2>
            </div>
            <div className={styles.accountStack}>
              <p className={styles.emptyText}>{model.giftMessage}</p>
              {model.dadAccounts.map((account, index) => (
                <AccountCard
                  key={`dad-${index}`}
                  account={account}
                  title="아빠 계좌"
                />
              ))}
              {model.momAccounts.map((account, index) => (
                <AccountCard
                  key={`mom-${index}`}
                  account={account}
                  title="엄마 계좌"
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {features.showGuestbook ? (
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.sectionInner}>
            <GuestbookThemed
              pageSlug={state.pageConfig.slug}
              styles={styles}
              title="방명록"
              subtitle={`${model.babyName}에게 따뜻한 축하 메시지를 남겨 주세요.`}
              statusColors={{
                success: '#2f6f66',
                error: '#b84a62',
              }}
            />
          </div>
        </section>
      ) : null}

      <footer className={styles.footer}>
        <strong>{model.babyName}의 첫 번째 생일잔치</strong>
        <p>
          {model.dadName} · {model.momName}
        </p>
      </footer>
    </main>
  );
}
