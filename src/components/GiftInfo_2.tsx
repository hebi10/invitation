'use client';

import { useState } from 'react';

import { copyTextToClipboard } from '@/utils';

import styles from './GiftInfo_2.module.css';

interface Account {
  bank: string;
  accountNumber: string;
  accountHolder?: string;
  holder?: string;
}

interface GiftInfoProps {
  groomName?: string;
  brideName?: string;
  groomAccounts?: Account[];
  brideAccounts?: Account[];
  message?: string;
}

export default function GiftInfo_2({
  groomAccounts = [],
  brideAccounts = [],
  message,
}: GiftInfoProps) {
  const [expandedSide, setExpandedSide] = useState<'groom' | 'bride' | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (text: string, accountKey: string) => {
    const copied = await copyTextToClipboard(text);
    if (!copied) {
      return;
    }

    setCopiedKey(accountKey);
    window.setTimeout(() => {
      setCopiedKey((current) => (current === accountKey ? null : current));
    }, 2000);
  };

  const toggleSection = (side: 'groom' | 'bride') => {
    setExpandedSide(expandedSide === side ? null : side);
  };

  if (groomAccounts.length === 0 && brideAccounts.length === 0) {
    return null;
  }

  return (
    <section className={styles.container}>
      <h2 className={styles.title}>마음 전하실 곳</h2>
      <p className={styles.description}>
        참석이 어려우신 분들을 위해
        <br />
        계좌번호를 함께 안내드립니다.
      </p>

      <div className={styles.sections}>
        {groomAccounts.length > 0 && (
          <div className={styles.section}>
            <button
              className={styles.sectionHeader}
              onClick={() => toggleSection('groom')}
              aria-expanded={expandedSide === 'groom'}
            >
              <span className={styles.sectionTitle}>신랑측 계좌번호</span>
              <span className={styles.toggleIcon}>{expandedSide === 'groom' ? '−' : '+'}</span>
            </button>

            <div className={`${styles.accountsList} ${expandedSide === 'groom' ? styles.expanded : ''}`}>
              {groomAccounts.map((account, index) => {
                const accountKey = `groom-${index}`;

                return (
                  <div key={accountKey} className={styles.accountItem}>
                    <div className={styles.accountInfo}>
                      <div className={styles.accountHolder}>{account.accountHolder ?? account.holder}</div>
                      <div className={styles.accountDetail}>
                        {account.bank} {account.accountNumber}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(account.accountNumber, accountKey)}
                      className={styles.copyButton}
                      aria-label="계좌번호 복사"
                    >
                      {copiedKey === accountKey ? '완료' : '복사'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {brideAccounts.length > 0 && (
          <div className={styles.section}>
            <button
              className={styles.sectionHeader}
              onClick={() => toggleSection('bride')}
              aria-expanded={expandedSide === 'bride'}
            >
              <span className={styles.sectionTitle}>신부측 계좌번호</span>
              <span className={styles.toggleIcon}>{expandedSide === 'bride' ? '−' : '+'}</span>
            </button>

            <div className={`${styles.accountsList} ${expandedSide === 'bride' ? styles.expanded : ''}`}>
              {brideAccounts.map((account, index) => {
                const accountKey = `bride-${index}`;

                return (
                  <div key={accountKey} className={styles.accountItem}>
                    <div className={styles.accountInfo}>
                      <div className={styles.accountHolder}>{account.accountHolder ?? account.holder}</div>
                      <div className={styles.accountDetail}>
                        {account.bank} {account.accountNumber}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(account.accountNumber, accountKey)}
                      className={styles.copyButton}
                      aria-label="계좌번호 복사"
                    >
                      {copiedKey === accountKey ? '완료' : '복사'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <p className={styles.notice}>
        {message ? (
          <>
            {message.split('\n').map((line, index, lines) => (
              <span key={`${line}-${index}`}>
                {line}
                {index < lines.length - 1 && <br />}
              </span>
            ))}
          </>
        ) : (
          <>
            축하의 마음으로 함께해 주시는 모든 분들께
            <br />
            진심으로 감사드립니다.
          </>
        )}
      </p>
    </section>
  );
}
