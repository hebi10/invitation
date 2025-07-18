'use client';

import styles from './Schedule.module.css';

interface ScheduleProps {
  date: string;
  time: string;
  venue: string;
  address: string;
  ceremony?: {
    time: string;
    location: string;
  };
  reception?: {
    time: string;
    location: string;
  };
}

export default function Schedule({ 
  date, 
  time, 
  venue, 
  address, 
  ceremony, 
  reception 
}: ScheduleProps) {
  return (
    <section className={styles.container}>
      <h2 className={styles.title}>예식 안내</h2>
      <div className={styles.mainInfo}>
        <h3 className={styles.date}>{date}</h3>
        <p className={styles.time}>{time}</p>
        <h4 className={styles.venue}>{venue}</h4>
        <p className={styles.address}>{address}</p>
      </div>
      
      {(ceremony || reception) && (
        <div className={styles.detailsContainer}>
          {ceremony && (
            <div className={styles.detailItem}>
              <h5 className={styles.detailTitle}>🌹 예식</h5>
              <p className={styles.detailInfo}>{ceremony.time}</p>
              <p className={styles.detailInfo}>{ceremony.location}</p>
            </div>
          )}
          {reception && (
            <div className={styles.detailItem}>
              <h5 className={styles.detailTitle}>🥂 피로연</h5>
              <p className={styles.detailInfo}>{reception.time}</p>
              <p className={styles.detailInfo}>{reception.location}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
