'use client';

import { useState } from 'react';
import styles from './Schedule_1.module.css';

interface VenueGuideItem {
  title: string;
  content: string;
}

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
  venueGuide?: VenueGuideItem[];
}

export default function Schedule_1({ 
  date, 
  time, 
  venue, 
  address, 
  ceremony, 
  reception,
  venueGuide
}: ScheduleProps) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'guide'>('schedule');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const showTabs = venueGuide && venueGuide.length > 0;

  const toggleItem = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <section className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>예식 안내</h2>
        
        {showTabs && (
          <div className={styles.tabs}>
            <button 
              className={`${styles.tab} ${activeTab === 'schedule' ? styles.active : ''}`}
              onClick={() => setActiveTab('schedule')}
            >
              예식 일정
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'guide' ? styles.active : ''}`}
              onClick={() => setActiveTab('guide')}
            >
              예식장 안내
            </button>
          </div>
        )}
        
        {activeTab === 'schedule' && (
          <>
            <div className={styles.mainInfo}>
              <div className={styles.dateTimeWrapper}>
                <h3 className={styles.date}>{date}</h3>
                <p className={styles.time}>{time}</p>
              </div>
              
              <div className={styles.venueWrapper}>
                <h4 className={styles.venue}>{venue}</h4>
                <p className={styles.address}>{address}</p>
              </div>
            </div>
            
            {(ceremony || reception) && (
              <div className={styles.detailsContainer}>
                {ceremony && (
                  <div className={styles.detailItem}>
                    <div className={styles.detailHeader}>
                      <span className={styles.detailIcon}>●</span>
                      <h5 className={styles.detailTitle}>예식</h5>
                    </div>
                    <div className={styles.detailContent}>
                      <p className={styles.detailInfo}>{ceremony.time}</p>
                      <p className={styles.detailInfo}>{ceremony.location}</p>
                    </div>
                  </div>
                )}
                {reception && (
                  <div className={styles.detailItem}>
                    <div className={styles.detailHeader}>
                      <span className={styles.detailIcon}>●</span>
                      <h5 className={styles.detailTitle}>피로연</h5>
                    </div>
                    <div className={styles.detailContent}>
                      <p className={styles.detailInfo}>{reception.time}</p>
                      <p className={styles.detailInfo}>{reception.location}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        
        {activeTab === 'guide' && venueGuide && (
          <div className={styles.guideContainer}>
            {venueGuide.map((item, index) => (
              <div key={index} className={styles.guideItem}>
                <button
                  className={styles.guideHeader}
                  onClick={() => toggleItem(index)}
                  aria-expanded={expandedItems.has(index)}
                >
                  <h5 className={styles.guideTitle}>
                    <span className={`${styles.guideIcon} ${expandedItems.has(index) ? styles.expanded : ''}`}>
                      ▷
                    </span>
                    {item.title}
                  </h5>
                  <span className={styles.toggleIcon}>
                    {expandedItems.has(index) ? '−' : '+'}
                  </span>
                </button>
                <div className={`${styles.guideContentWrapper} ${expandedItems.has(index) ? styles.expanded : ''}`}>
                  <p className={styles.guideContent}>{item.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
