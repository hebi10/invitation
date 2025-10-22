'use client';

import { useState } from 'react';
import styles from './Schedule_5.module.css';

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

export default function Schedule_5({ 
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
      {/* 금박 장식 */}
      <svg className={styles.topDecoration} viewBox="0 0 100 10">
        <path d="M 0 5 Q 25 2, 50 5 T 100 5" fill="none" stroke="var(--accent)" strokeWidth="1" />
      </svg>
      
      <h2 className={styles.title}>日時</h2>
      <p className={styles.subtitle}>Wedding Schedule</p>
      
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
        <div className={styles.scheduleContent}>
          <div className={styles.mainInfo}>
            <div className={styles.infoItem}>
              <span className={styles.label}>일시</span>
              <span className={styles.value}>{date} {time}</span>
            </div>
            <div className={styles.divider}></div>
            <div className={styles.infoItem}>
              <span className={styles.label}>장소</span>
              <span className={styles.value}>{venue}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>주소</span>
              <span className={styles.value}>{address}</span>
            </div>
          </div>

          {(ceremony || reception) && (
            <div className={styles.detailSchedule}>
              <h3 className={styles.detailTitle}>상세 일정</h3>
              {ceremony && (
                <div className={styles.scheduleItem}>
                  <span className={styles.scheduleLabel}>예식</span>
                  <span className={styles.scheduleTime}>{ceremony.time}</span>
                  <span className={styles.scheduleLocation}>{ceremony.location}</span>
                </div>
              )}
              {reception && (
                <div className={styles.scheduleItem}>
                  <span className={styles.scheduleLabel}>피로연</span>
                  <span className={styles.scheduleTime}>{reception.time}</span>
                  <span className={styles.scheduleLocation}>{reception.location}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'guide' && venueGuide && venueGuide.length > 0 && (
        <div className={styles.guideContent}>
          {venueGuide.map((item, index) => (
            <div key={index} className={styles.guideItem}>
              <button
                className={styles.guideHeader}
                onClick={() => toggleGuideItem(index)}
              >
                <span className={styles.guideTitle}>{item.title}</span>
                <span className={styles.guideToggle}>
                  {expandedGuideItems.has(index) ? '−' : '+'}
                </span>
              </button>
              {expandedGuideItems.has(index) && (
                <div className={styles.guideBody}>
                  <p>{item.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'wreath' && wreathGuide && wreathGuide.length > 0 && (
        <div className={styles.guideContent}>
          {wreathGuide.map((item, index) => (
            <div key={index} className={styles.guideItem}>
              <button
                className={styles.guideHeader}
                onClick={() => toggleWreathItem(index)}
              >
                <span className={styles.guideTitle}>{item.title}</span>
                <span className={styles.guideToggle}>
                  {expandedWreathItems.has(index) ? '−' : '+'}
                </span>
              </button>
              {expandedWreathItems.has(index) && (
                <div className={styles.guideBody}>
                  <p>{item.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <svg className={styles.bottomDecoration} viewBox="0 0 100 10">
        <path d="M 0 5 Q 25 8, 50 5 T 100 5" fill="none" stroke="var(--accent)" strokeWidth="1" />
      </svg>
    </section>
  );
}
