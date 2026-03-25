'use client';

import { useState } from 'react';

import { copyTextToClipboard } from '@/utils';

import styles from './GiftInfo.module.css';

interface AccountInfo {
  bank: string;
  accountNumber: string;
  accountHolder: string;
}

interface GiftInfoProps {
  groomAccounts?: AccountInfo[];
  brideAccounts?: AccountInfo[];
  message?: string;
}

export default function GiftInfo({
  groomAccounts = [],
  brideAccounts = [],
  message = '참석이 어려우신 분들을 위해 계좌번호를 함께 안내드립니다.',
}: GiftInfoProps) {
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

  const formatMessage = (text: string) => {
    return text.split('\n').map((line, index, array) => (
      <span key={index}>
        {line}
        {index < array.length - 1 && <br />}
      </span>
    ));
  };

  return (
    <section className={styles.container}>
      <h2 className={styles.title}>마음 전하실 곳</h2>
      <p className={styles.message}>{formatMessage(message)}</p>

      <div className={styles.accountsContainer}>
        {groomAccounts.length > 0 && (
          <div className={styles.accountSection}>
            <h3 className={styles.sectionTitle}>신랑측 계좌</h3>
            {groomAccounts.map((account, index) => {
              const accountKey = `groom-${index}`;

              return (
                <div key={accountKey} className={styles.accountCard}>
                  <h4 className={styles.accountHolder}>{account.accountHolder}</h4>
                  <div className={styles.accountDetails}>
                    <div className={styles.accountDetail}>
                      <span className={styles.accountLabel}>은행</span>
                      <span className={styles.accountValue}>{account.bank}</span>
                    </div>
                    <div className={styles.accountDetail}>
                      <span className={styles.accountLabel}>계좌번호</span>
                      <span className={styles.accountValue}>{account.accountNumber}</span>
                    </div>
                  </div>
                  <button
                    className={styles.copyButton}
                    onClick={() => handleCopy(accountKey, account.bank, account.accountNumber)}
                  >
                    {copiedKey === accountKey ? '복사 완료' : '계좌번호 복사'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {brideAccounts.length > 0 && (
          <div className={styles.accountSection}>
            <h3 className={styles.sectionTitle}>신부측 계좌</h3>
            {brideAccounts.map((account, index) => {
              const accountKey = `bride-${index}`;

              return (
                <div key={accountKey} className={styles.accountCard}>
                  <h4 className={styles.accountHolder}>{account.accountHolder}</h4>
                  <div className={styles.accountDetails}>
                    <div className={styles.accountDetail}>
                      <span className={styles.accountLabel}>은행</span>
                      <span className={styles.accountValue}>{account.bank}</span>
                    </div>
                    <div className={styles.accountDetail}>
                      <span className={styles.accountLabel}>계좌번호</span>
                      <span className={styles.accountValue}>{account.accountNumber}</span>
                    </div>
                  </div>
                  <button
                    className={styles.copyButton}
                    onClick={() => handleCopy(accountKey, account.bank, account.accountNumber)}
                  >
                    {copiedKey === accountKey ? '복사 완료' : '계좌번호 복사'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
