'use client';

import styles from './Schedule_3.module.css';

interface ScheduleProps {
  weddingDate: string;
  weddingTime: string;
  location: string;
  address: string;
  floor?: string;
  contact?: {
    groom?: { name: string; phone: string };
    bride?: { name: string; phone: string };
    parents?: {
      groomFather?: string;
      groomMother?: string;
      brideFather?: string;
      brideMother?: string;
    };
  };
}

export default function Schedule_3({
  weddingDate,
  weddingTime,
  location,
  address,
  floor,
  contact
}: ScheduleProps) {
  const formatPhoneNumber = (phone: string) => {
    // 전화번호 형식화 (010-1234-5678)
    return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  };

  return (
    <section className={styles.container}>
      {/* 우주 배경 */}
      <div className={styles.cosmicBg}>
        <div className={styles.starfield}></div>
      </div>

      {/* 타이틀 */}
      <div className={styles.header}>
        <div className={styles.constellation}>✦</div>
        <h2 className={styles.title}>When & Where</h2>
        <div className={styles.constellation}>✦</div>
      </div>

      {/* 메인 정보 카드 */}
      <div className={styles.mainCard}>
        <div className={styles.cardGlow}></div>
        
        {/* 날짜 & 시간 */}
        <div className={styles.dateTimeSection}>
          <div className={styles.iconWrapper}>
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className={styles.infoText}>
            <p className={styles.label}>날짜</p>
            <p className={styles.value}>{weddingDate}</p>
          </div>
        </div>

        <div className={styles.divider}></div>

        <div className={styles.dateTimeSection}>
          <div className={styles.iconWrapper}>
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className={styles.infoText}>
            <p className={styles.label}>시간</p>
            <p className={styles.value}>{weddingTime}</p>
          </div>
        </div>

        <div className={styles.separator}></div>

        {/* 장소 */}
        <div className={styles.locationSection}>
          <div className={styles.iconWrapper}>
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" stroke="currentColor" strokeWidth="2"/>
              <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className={styles.infoText}>
            <p className={styles.label}>장소</p>
            <p className={styles.value}>{location}</p>
            {floor && <p className={styles.subValue}>{floor}</p>}
            <p className={styles.address}>{address}</p>
          </div>
        </div>
      </div>

      {/* 연락처 정보 */}
      {contact && (
        <div className={styles.contactSection}>
          <h3 className={styles.contactTitle}>
            <span className={styles.contactTitleText}>연락하기</span>
          </h3>

          <div className={styles.contactGrid}>
            {/* 신랑측 */}
            {contact.groom && (
              <div className={styles.contactCard}>
                <div className={styles.contactHeader}>
                  <span className={styles.contactRole}>신랑</span>
                  <span className={styles.contactName}>{contact.groom.name}</span>
                </div>
                <a href={`tel:${contact.groom.phone}`} className={styles.phoneButton}>
                  <svg className={styles.phoneIcon} viewBox="0 0 24 24" fill="none">
                    <path d="M22 16.92V19.92C22 20.52 21.52 21 20.92 21C10.38 21 2 12.62 2 2.08C2 1.48 2.48 1 3.08 1H6.08C6.68 1 7.16 1.48 7.16 2.08C7.16 3.58 7.43 5.02 7.93 6.37C8.06 6.72 7.96 7.11 7.68 7.39L5.82 9.25C7.62 12.83 11.17 16.38 14.75 18.18L16.61 16.32C16.89 16.04 17.28 15.94 17.63 16.07C18.98 16.57 20.42 16.84 21.92 16.84C22.52 16.84 23 17.32 23 17.92V20.92C23 21.52 22.52 22 21.92 22Z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <span>전화하기</span>
                </a>
              </div>
            )}

            {/* 신부측 */}
            {contact.bride && (
              <div className={styles.contactCard}>
                <div className={styles.contactHeader}>
                  <span className={styles.contactRole}>신부</span>
                  <span className={styles.contactName}>{contact.bride.name}</span>
                </div>
                <a href={`tel:${contact.bride.phone}`} className={styles.phoneButton}>
                  <svg className={styles.phoneIcon} viewBox="0 0 24 24" fill="none">
                    <path d="M22 16.92V19.92C22 20.52 21.52 21 20.92 21C10.38 21 2 12.62 2 2.08C2 1.48 2.48 1 3.08 1H6.08C6.68 1 7.16 1.48 7.16 2.08C7.16 3.58 7.43 5.02 7.93 6.37C8.06 6.72 7.96 7.11 7.68 7.39L5.82 9.25C7.62 12.83 11.17 16.38 14.75 18.18L16.61 16.32C16.89 16.04 17.28 15.94 17.63 16.07C18.98 16.57 20.42 16.84 21.92 16.84C22.52 16.84 23 17.32 23 17.92V20.92C23 21.52 22.52 22 21.92 22Z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <span>전화하기</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 장식 요소 */}
      <div className={styles.decorations}>
        <div className={styles.orbit}></div>
        <div className={styles.planetDeco1}></div>
        <div className={styles.planetDeco2}></div>
      </div>
    </section>
  );
}
