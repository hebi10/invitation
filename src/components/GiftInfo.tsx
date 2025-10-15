'use client';

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
  message = "축하의 마음을 전하고 싶으시다면 아래 계좌로 송금해주세요." 
}: GiftInfoProps) {
  const copyToClipboard = (bank: string, accountNumber: string) => {
    navigator.clipboard.writeText(`${bank} ${accountNumber}`);
    alert('계좌번호가 복사되었습니다.');
  };

  // \n을 줄바꿈으로 변환
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
      <h2 className={styles.title}>축의금 안내</h2>
      <p className={styles.message}>{formatMessage(message)}</p>
      
      <div className={styles.accountsContainer}>
        {groomAccounts.length > 0 && (
          <div className={styles.accountSection}>
            <h3 className={styles.sectionTitle}>신랑측 계좌</h3>
            {groomAccounts.map((account, index) => (
              <div key={index} className={styles.accountCard}>
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
                  onClick={() => copyToClipboard(account.bank, account.accountNumber)}
                >
                  계좌번호 복사
                </button>
              </div>
            ))}
          </div>
        )}
        
        {brideAccounts.length > 0 && (
          <div className={styles.accountSection}>
            <h3 className={styles.sectionTitle}>신부측 계좌</h3>
            {brideAccounts.map((account, index) => (
              <div key={index} className={styles.accountCard}>
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
                  onClick={() => copyToClipboard(account.bank, account.accountNumber)}
                >
                  계좌번호 복사
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
