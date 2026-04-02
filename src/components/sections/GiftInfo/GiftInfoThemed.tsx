'use client';

import { useState } from 'react';

import { copyTextToClipboard } from '@/utils';

export interface AccountInfo {
  bank: string;
  accountNumber: string;
  accountHolder: string;
}

export interface GiftInfoProps {
  groomAccounts?: AccountInfo[];
  brideAccounts?: AccountInfo[];
  message?: string;
}

interface GiftInfoThemedProps extends GiftInfoProps {
  styles: Record<string, string>;
  title: string;
  subtitle?: string;
  groomSectionTitle: string;
  brideSectionTitle: string;
  copyLabel: string;
  copiedLabel?: string;
  wrapInCard?: boolean;
  showTopDecoration?: boolean;
  showBottomDecoration?: boolean;
}

export default function GiftInfoThemed({
  groomAccounts = [],
  brideAccounts = [],
  message = '참석이 어려우신 분들을 위해 계좌번호를 함께 안내드립니다.',
  styles,
  title,
  subtitle,
  groomSectionTitle,
  brideSectionTitle,
  copyLabel,
  copiedLabel = '복사 완료',
  wrapInCard = false,
  showTopDecoration = false,
  showBottomDecoration = false,
}: GiftInfoThemedProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (accountKey: string, bank: string, accountNumber: string) => {
    const copied = await copyTextToClipboard(`${bank} ${accountNumber}`);
    if (!copied) {
      return;
    }

    setCopiedKey(accountKey);
    window.setTimeout(() => {
      setCopiedKey((current) => (current === accountKey ? null : current));
    }, 2000);
  };

  const formatMessage = (text: string) =>
    text.split('\n').map((line, index, array) => (
      <span key={`${line}-${index}`}>
        {line}
        {index < array.length - 1 && <br />}
      </span>
    ));

  const renderAccountSection = (sectionKey: 'groom' | 'bride', sectionTitle: string, accounts: AccountInfo[]) => {
    if (accounts.length === 0) {
      return null;
    }

    return (
      <div className={styles.accountSection}>
        <h3 className={styles.sectionTitle}>{sectionTitle}</h3>
        {accounts.map((account, index) => {
          const accountKey = `${sectionKey}-${index}`;

          return (
            <div key={accountKey} className={styles.accountCard}>
              <div className={styles.accountInfo}>
                <div className={styles.accountRow}>
                  <span className={styles.accountHolder}>{account.accountHolder}</span>
                </div>
                <div className={styles.accountRow}>
                  <span className={styles.accountBank}>{account.bank}</span>
                  <span className={styles.accountNumber}>{account.accountNumber}</span>
                </div>
              </div>
              <button
                className={styles.copyButton}
                onClick={() => handleCopy(accountKey, account.bank, account.accountNumber)}
                type="button"
              >
                {copiedKey === accountKey ? copiedLabel : copyLabel}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  const content = (
    <>
      <h2 className={styles.title}>{title}</h2>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      <p className={styles.message}>{formatMessage(message)}</p>

      <div className={styles.accountsContainer}>
        {renderAccountSection('groom', groomSectionTitle, groomAccounts)}
        {renderAccountSection('bride', brideSectionTitle, brideAccounts)}
      </div>
    </>
  );

  return (
    <section className={styles.container}>
      {showTopDecoration && 'topDecoration' in styles && (
        <svg className={styles.topDecoration} viewBox="0 0 100 10">
          <path d="M 0 5 Q 25 2, 50 5 T 100 5" fill="none" stroke="var(--accent)" strokeWidth="1" />
        </svg>
      )}

      {wrapInCard && 'card' in styles ? <div className={styles.card}>{content}</div> : content}

      {showBottomDecoration && 'bottomDecoration' in styles && (
        <svg className={styles.bottomDecoration} viewBox="0 0 100 10">
          <path d="M 0 5 Q 25 8, 50 5 T 100 5" fill="none" stroke="var(--accent)" strokeWidth="1" />
        </svg>
      )}
    </section>
  );
}
