'use client';

import styles from './GiftInfo_1.module.css';

interface AccountInfo {
  bank: string;
  accountNumber: string;
  accountHolder: string;
}

interface GiftInfoProps {
  groomAccount?: AccountInfo;
  brideAccount?: AccountInfo;
  message?: string;
}

export default function GiftInfo_1({ 
  groomAccount, 
  brideAccount, 
  message = "축하의 마음을 전하고 싶으시다면 아래 계좌로 송금해주세요." 
}: GiftInfoProps) {
  const copyToClipboard = (bank: string, accountNumber: string) => {
    navigator.clipboard.writeText(`${bank} ${accountNumber}`);
    alert('계좌번호가 복사되었습니다.');
  };

  return (
    <section className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>축의금 안내</h2>
        <p className={styles.message}>{message}</p>
        
        <div className={styles.accountsContainer}>
          {groomAccount && (
            <div className={styles.accountCard}>
              <h3 className={styles.accountTitle}>신랑측</h3>
              <div className={styles.accountInfo}>
                <div className={styles.accountDetail}>
                  <span className={styles.accountLabel}>은행</span>
                  <span className={styles.accountValue}>{groomAccount.bank}</span>
                </div>
                <div className={styles.accountDetail}>
                  <span className={styles.accountLabel}>계좌</span>
                  <span className={styles.accountValue}>{groomAccount.accountNumber}</span>
                </div>
                <div className={styles.accountDetail}>
                  <span className={styles.accountLabel}>예금주</span>
                  <span className={styles.accountValue}>{groomAccount.accountHolder}</span>
                </div>
              </div>
              <button 
                className={styles.copyButton}
                onClick={() => copyToClipboard(groomAccount.bank, groomAccount.accountNumber)}
              >
                계좌번호 복사
              </button>
            </div>
          )}
          
          {brideAccount && (
            <div className={styles.accountCard}>
              <h3 className={styles.accountTitle}>신부측</h3>
              <div className={styles.accountInfo}>
                <div className={styles.accountDetail}>
                  <span className={styles.accountLabel}>은행</span>
                  <span className={styles.accountValue}>{brideAccount.bank}</span>
                </div>
                <div className={styles.accountDetail}>
                  <span className={styles.accountLabel}>계좌</span>
                  <span className={styles.accountValue}>{brideAccount.accountNumber}</span>
                </div>
                <div className={styles.accountDetail}>
                  <span className={styles.accountLabel}>예금주</span>
                  <span className={styles.accountValue}>{brideAccount.accountHolder}</span>
                </div>
              </div>
              <button 
                className={styles.copyButton}
                onClick={() => copyToClipboard(brideAccount.bank, brideAccount.accountNumber)}
              >
                계좌번호 복사
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
