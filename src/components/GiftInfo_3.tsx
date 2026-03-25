'use client';

import { useState } from 'react';

import { copyTextToClipboard } from '@/utils';

import styles from './GiftInfo_3.module.css';

interface BankAccount {
  bank: string;
  accountNumber: string;
  accountHolder: string;
}

interface GiftInfoProps {
  groomAccounts?: BankAccount[];
  brideAccounts?: BankAccount[];
}

export default function GiftInfo_3({ groomAccounts = [], brideAccounts = [] }: GiftInfoProps) {
  const [expandedSection, setExpandedSection] = useState<'groom' | 'bride' | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  const copyToClipboard = async (text: string, accountId: string) => {
    const copied = await copyTextToClipboard(text);
    if (!copied) {
      return;
    }

    setCopiedAccount(accountId);
    window.setTimeout(() => setCopiedAccount(null), 2000);
  };

  const toggleSection = (section: 'groom' | 'bride') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <section className={styles.container}>
      <div className={styles.spaceBackground}>
        <div className={styles.stars}></div>
      </div>

      <div className={styles.header}>
        <div className={styles.starIcon}>✦</div>
        <h2 className={styles.title}>마음 전하실 곳</h2>
        <div className={styles.starIcon}>✦</div>
      </div>

      <div className={styles.messageCard}>
        <div className={styles.messageGlow}></div>
        <p className={styles.message}>
          참석이 어려우신 분들을 위해
          <br />
          계좌번호를 함께 안내드립니다.
        </p>
      </div>

      <div className={styles.accountsWrapper}>
        {groomAccounts.length > 0 && (
          <div className={styles.accountSection}>
            <button
              onClick={() => toggleSection('groom')}
              className={styles.sectionToggle}
              aria-expanded={expandedSection === 'groom'}
            >
              <span className={styles.toggleLabel}>신랑측 계좌번호</span>
              <span className={`${styles.toggleIcon} ${expandedSection === 'groom' ? styles.rotated : ''}`}>
                ⌄
              </span>
            </button>

            <div className={`${styles.accountsList} ${expandedSection === 'groom' ? styles.expanded : ''}`}>
              {groomAccounts.map((account, index) => {
                const accountId = `groom-${index}`;
                return (
                  <div key={accountId} className={styles.accountCard}>
                    <div className={styles.accountInfo}>
                      <div className={styles.accountRow}>
                        <span className={styles.accountLabel}>은행</span>
                        <span className={styles.accountValue}>{account.bank}</span>
                      </div>
                      <div className={styles.accountRow}>
                        <span className={styles.accountLabel}>예금주</span>
                        <span className={styles.accountValue}>{account.accountHolder}</span>
                      </div>
                      <div className={styles.accountRow}>
                        <span className={styles.accountLabel}>계좌번호</span>
                        <span className={styles.accountNumber}>{account.accountNumber}</span>
                      </div>
                    </div>
                    <button onClick={() => copyToClipboard(account.accountNumber, accountId)} className={styles.copyButton}>
                      {copiedAccount === accountId ? (
                        <>
                          <svg className={styles.checkIcon} viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span>복사 완료</span>
                        </>
                      ) : (
                        <>
                          <svg className={styles.copyIcon} viewBox="0 0 24 24" fill="none">
                            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
                            <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" strokeWidth="2" />
                          </svg>
                          <span>복사</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {brideAccounts.length > 0 && (
          <div className={styles.accountSection}>
            <button
              onClick={() => toggleSection('bride')}
              className={styles.sectionToggle}
              aria-expanded={expandedSection === 'bride'}
            >
              <span className={styles.toggleLabel}>신부측 계좌번호</span>
              <span className={`${styles.toggleIcon} ${expandedSection === 'bride' ? styles.rotated : ''}`}>
                ⌄
              </span>
            </button>

            <div className={`${styles.accountsList} ${expandedSection === 'bride' ? styles.expanded : ''}`}>
              {brideAccounts.map((account, index) => {
                const accountId = `bride-${index}`;
                return (
                  <div key={accountId} className={styles.accountCard}>
                    <div className={styles.accountInfo}>
                      <div className={styles.accountRow}>
                        <span className={styles.accountLabel}>은행</span>
                        <span className={styles.accountValue}>{account.bank}</span>
                      </div>
                      <div className={styles.accountRow}>
                        <span className={styles.accountLabel}>예금주</span>
                        <span className={styles.accountValue}>{account.accountHolder}</span>
                      </div>
                      <div className={styles.accountRow}>
                        <span className={styles.accountLabel}>계좌번호</span>
                        <span className={styles.accountNumber}>{account.accountNumber}</span>
                      </div>
                    </div>
                    <button onClick={() => copyToClipboard(account.accountNumber, accountId)} className={styles.copyButton}>
                      {copiedAccount === accountId ? (
                        <>
                          <svg className={styles.checkIcon} viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span>복사 완료</span>
                        </>
                      ) : (
                        <>
                          <svg className={styles.copyIcon} viewBox="0 0 24 24" fill="none">
                            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
                            <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" strokeWidth="2" />
                          </svg>
                          <span>복사</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className={styles.footerNote}>
        <p className={styles.noteText}>마음만으로도 충분히 감사드립니다.</p>
      </div>

      <div className={styles.decorations}>
        <div className={styles.moonDeco}></div>
        <div className={styles.starDeco1}></div>
        <div className={styles.starDeco2}></div>
      </div>
    </section>
  );
}
