'use client';

import { useState } from 'react';
import styles from './GiftInfo_2.module.css';

interface Account {
  bank: string;
  accountNumber: string;
  holder: string;
}

interface GiftInfoProps {
  groomName: string;
  brideName: string;
  groomAccounts?: Account[];
  brideAccounts?: Account[];
}

export default function GiftInfo_2({ 
  groomName, 
  brideName, 
  groomAccounts = [], 
  brideAccounts = [] 
}: GiftInfoProps) {
  const [expandedSide, setExpandedSide] = useState<'groom' | 'bride' | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert(`${label}이(가) 복사되었습니다.`);
      });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert(`${label}이(가) 복사되었습니다.`);
    }
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
        참석이 어려우신 분들을 위해<br />
        계좌번호를 기재하였습니다
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
              <span className={styles.toggleIcon}>
                {expandedSide === 'groom' ? '−' : '+'}
              </span>
            </button>
            
            <div className={`${styles.accountsList} ${expandedSide === 'groom' ? styles.expanded : ''}`}>
              {groomAccounts.map((account, index) => (
                <div key={index} className={styles.accountItem}>
                  <div className={styles.accountInfo}>
                    <div className={styles.accountHolder}>{account.holder}</div>
                    <div className={styles.accountDetail}>
                      {account.bank} {account.accountNumber}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(account.accountNumber, '계좌번호')}
                    className={styles.copyButton}
                    aria-label="계좌번호 복사"
                  >
                    복사
                  </button>
                </div>
              ))}
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
              <span className={styles.toggleIcon}>
                {expandedSide === 'bride' ? '−' : '+'}
              </span>
            </button>
            
            <div className={`${styles.accountsList} ${expandedSide === 'bride' ? styles.expanded : ''}`}>
              {brideAccounts.map((account, index) => (
                <div key={index} className={styles.accountItem}>
                  <div className={styles.accountInfo}>
                    <div className={styles.accountHolder}>{account.holder}</div>
                    <div className={styles.accountDetail}>
                      {account.bank} {account.accountNumber}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(account.accountNumber, '계좌번호')}
                    className={styles.copyButton}
                    aria-label="계좌번호 복사"
                  >
                    복사
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className={styles.notice}>
        축하의 마음을 담아 보내주신 모든 분들께<br />
        감사드립니다
      </p>
    </section>
  );
}
