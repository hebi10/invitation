'use client';

import styles from './GiftInfo_4.module.css';

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

export default function GiftInfo_4({ 
  groomAccounts = [], 
  brideAccounts = [], 
  message = "축하의 마음을 전하고 싶으시다면 아래 계좌로 송금해주세요." 
}: GiftInfoProps) {
  const copyToClipboard = (bank: string, accountNumber: string) => {
    navigator.clipboard.writeText(`${bank} ${accountNumber}`);
    alert('계좌번호가 복사되었습니다.');
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
      {/* 레몬 장식 */}
      <div className={styles.lemonDecoration}>🍋</div>
      
      <h2 className={styles.title}>Gift</h2>
      <p className={styles.subtitle}>축의금 안내</p>
      <p className={styles.message}>{formatMessage(message)}</p>
      
      <div className={styles.accountsContainer}>
        {groomAccounts.length > 0 && (
          <div className={styles.accountSection}>
            <h3 className={styles.sectionTitle}>Groom</h3>
            {groomAccounts.map((account, index) => (
              <div key={index} className={styles.accountCard}>
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
                  onClick={() => copyToClipboard(account.bank, account.accountNumber)}
                >
                  📋 복사
                </button>
              </div>
            ))}
          </div>
        )}
        
        {brideAccounts.length > 0 && (
          <div className={styles.accountSection}>
            <h3 className={styles.sectionTitle}>Bride</h3>
            {brideAccounts.map((account, index) => (
              <div key={index} className={styles.accountCard}>
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
                  onClick={() => copyToClipboard(account.bank, account.accountNumber)}
                >
                  📋 복사
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
