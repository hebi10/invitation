'use client';

import { useState } from 'react';
import styles from './Schedule_2.module.css';

interface VenueGuideItem {
  title: string;
  content: string;
}

interface WreathGuideItem {
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
  wreathGuide?: WreathGuideItem[];
}

export default function Schedule_2({ 
  date, 
  time, 
  venue, 
  address, 
  ceremony, 
  reception,
  venueGuide,
  wreathGuide
}: ScheduleProps) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'guide' | 'wreath'>('schedule');
  const [expandedGuideItems, setExpandedGuideItems] = useState<Set<number>>(new Set());
  const [expandedWreathItems, setExpandedWreathItems] = useState<Set<number>>(new Set());
  const showTabs = (venueGuide && venueGuide.length > 0) || (wreathGuide && wreathGuide.length > 0);

  const toggleGuideItem = (index: number) => {
    const newExpanded = new Set(expandedGuideItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedGuideItems(newExpanded);
  };

  const toggleWreathItem = (index: number) => {
    const newExpanded = new Set(expandedWreathItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedWreathItems(newExpanded);
  };

  return (
    <section className={styles.container}>
      <h2 className={styles.title}>예식 안내</h2>
      
      {showTabs && (
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'schedule' ? styles.active : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            예식 일정
          </button>
          {venueGuide && venueGuide.length > 0 && (
            <button 
              className={`${styles.tab} ${activeTab === 'guide' ? styles.active : ''}`}
              onClick={() => setActiveTab('guide')}
            >
              예식장 안내
            </button>
          )}
          {wreathGuide && wreathGuide.length > 0 && (
            <button 
              className={`${styles.tab} ${activeTab === 'wreath' ? styles.active : ''}`}
              onClick={() => setActiveTab('wreath')}
            >
              화환 안내
            </button>
          )}
        </div>
      )}
      
      {activeTab === 'schedule' && (
        <div className={styles.content}>
          <div className={styles.dateSection}>
            <div className={styles.date}>{date}</div>
            <div className={styles.time}>{time}</div>
          </div>
          
          <div className={styles.venueSection}>
            <div className={styles.venue}>{venue}</div>
            <div className={styles.address}>{address}</div>
          </div>
          
          {(ceremony || reception) && (
            <div className={styles.detailsContainer}>
              {ceremony && (
                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>예식</div>
                  <div className={styles.detailInfo}>{ceremony.time}</div>
                  <div className={styles.detailInfo}>{ceremony.location}</div>
                </div>
              )}
              {reception && (
                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>피로연</div>
                  <div className={styles.detailInfo}>{reception.time}</div>
                  <div className={styles.detailInfo}>{reception.location}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'guide' && venueGuide && (
        <div className={styles.guideContainer}>
          {venueGuide.map((item, index) => (
            <div key={index} className={styles.guideItem}>
              <button
                className={styles.guideHeader}
                onClick={() => toggleGuideItem(index)}
                aria-expanded={expandedGuideItems.has(index)}
              >
                <span className={styles.guideTitle}>{item.title}</span>
                <span className={styles.toggleIcon}>
                  {expandedGuideItems.has(index) ? '−' : '+'}
                </span>
              </button>
              <div className={`${styles.guideContent} ${expandedGuideItems.has(index) ? styles.expanded : ''}`}>
                <p>{item.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'wreath' && wreathGuide && (
        <div className={styles.guideContainer}>
          {wreathGuide.map((item, index) => (
            <div key={index} className={styles.guideItem}>
              <button
                className={styles.guideHeader}
                onClick={() => toggleWreathItem(index)}
                aria-expanded={expandedWreathItems.has(index)}
              >
                <span className={styles.guideTitle}>{item.title}</span>
                <span className={styles.toggleIcon}>
                  {expandedWreathItems.has(index) ? '−' : '+'}
                </span>
              </button>
              <div className={`${styles.guideContent} ${expandedWreathItems.has(index) ? styles.expanded : ''}`}>
                <p>{item.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
