'use client';

import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

export interface VenueGuideItem {
  title: string;
  content: string;
}

export interface WreathGuideItem {
  title: string;
  content: string;
}

export interface ScheduleProps {
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

interface ScheduleTabbedThemedProps extends ScheduleProps {
  styles: Record<string, string>;
  title: string;
  subtitle?: string;
  wrapInCard?: boolean;
  decoration?: 'none' | 'lemon';
  layout: 'stacked' | 'split';
  detailStyle: 'simple' | 'framed';
  detailIcons?: {
    ceremony: string;
    reception: string;
  };
}

export default function ScheduleTabbedThemed({
  date,
  time,
  venue,
  address,
  ceremony,
  reception,
  venueGuide,
  wreathGuide,
  styles,
  title,
  subtitle,
  wrapInCard = false,
  decoration = 'none',
  layout,
  detailStyle,
  detailIcons,
}: ScheduleTabbedThemedProps) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'guide' | 'wreath'>('schedule');
  const [expandedGuideItems, setExpandedGuideItems] = useState<Set<number>>(new Set());
  const [expandedWreathItems, setExpandedWreathItems] = useState<Set<number>>(new Set());
  const showTabs = Boolean((venueGuide && venueGuide.length > 0) || (wreathGuide && wreathGuide.length > 0));

  const toggleExpanded = (index: number, setter: Dispatch<SetStateAction<Set<number>>>) => {
    setter((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const renderGuideContent = (
    items: VenueGuideItem[] | WreathGuideItem[],
    expandedItems: Set<number>,
    onToggle: (index: number) => void,
  ) => (
    <div className={styles.guideContainer}>
      {items.map((item, index) => (
        <div key={`${item.title}-${index}`} className={styles.guideItem}>
          <button className={styles.guideHeader} onClick={() => onToggle(index)} aria-expanded={expandedItems.has(index)} type="button">
            <h5 className={styles.guideTitle}>
              <span className={`${styles.guideIcon} ${expandedItems.has(index) ? styles.expanded : ''}`}>›</span>
              {item.title}
            </h5>
            <span className={styles.toggleIcon}>{expandedItems.has(index) ? '−' : '+'}</span>
          </button>
          <div className={`${styles.guideContentWrapper} ${expandedItems.has(index) ? styles.expanded : ''}`}>
            <p className={styles.guideContent}>{item.content}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderMainInfo = () => {
    if (layout === 'stacked') {
      return (
        <div className={styles.mainInfo}>
          <h3 className={styles.date}>{date}</h3>
          <p className={styles.time}>{time}</p>
          <h4 className={styles.venue}>{venue}</h4>
          <p className={styles.address}>{address}</p>
        </div>
      );
    }

    return (
      <div className={styles.mainInfo}>
        <div className={styles.dateTimeWrapper}>
          <h3 className={styles.date}>{date}</h3>
          <p className={styles.time}>{time}</p>
        </div>

        {'divider' in styles && <div className={styles.divider}></div>}

        <div className={styles.venueWrapper}>
          <h4 className={styles.venue}>{venue}</h4>
          <p className={styles.address}>{address}</p>
        </div>
      </div>
    );
  };

  const renderDetailItem = (label: string, info: { time: string; location: string }, icon?: string) => {
    if (detailStyle === 'simple') {
      return (
        <div className={styles.detailItem}>
          <h5 className={styles.detailTitle}>{label}</h5>
          <p className={styles.detailInfo}>{info.time}</p>
          <p className={styles.detailInfo}>{info.location}</p>
        </div>
      );
    }

    return (
      <div className={styles.detailItem}>
        <div className={styles.detailHeader}>
          <span className={styles.detailIcon}>{icon}</span>
          <h5 className={styles.detailTitle}>{label}</h5>
        </div>
        <div className={styles.detailContent}>
          <p className={styles.detailInfo}>{info.time}</p>
          <p className={styles.detailInfo}>{info.location}</p>
        </div>
      </div>
    );
  };

  const content = (
    <>
      {decoration === 'lemon' && 'lemonDecoration' in styles && <div className={styles.lemonDecoration}>🍋</div>}

      <h2 className={styles.title}>{title}</h2>
      {subtitle && 'subtitle' in styles && <p className={styles.subtitle}>{subtitle}</p>}

      {showTabs && (
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${activeTab === 'schedule' ? styles.active : ''}`} onClick={() => setActiveTab('schedule')} type="button">
            예식 일정
          </button>
          {venueGuide && venueGuide.length > 0 && (
            <button className={`${styles.tab} ${activeTab === 'guide' ? styles.active : ''}`} onClick={() => setActiveTab('guide')} type="button">
              예식장 안내
            </button>
          )}
          {wreathGuide && wreathGuide.length > 0 && (
            <button className={`${styles.tab} ${activeTab === 'wreath' ? styles.active : ''}`} onClick={() => setActiveTab('wreath')} type="button">
              화환 안내
            </button>
          )}
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className={'scheduleContent' in styles ? styles.scheduleContent : undefined}>
          {renderMainInfo()}

          {(ceremony || reception) && (
            <div className={styles.detailsContainer}>
              {ceremony && renderDetailItem('본식', ceremony, detailIcons?.ceremony)}
              {reception && renderDetailItem('피로연', reception, detailIcons?.reception)}
            </div>
          )}
        </div>
      )}

      {activeTab === 'guide' && venueGuide && venueGuide.length > 0 && renderGuideContent(venueGuide, expandedGuideItems, (index) => toggleExpanded(index, setExpandedGuideItems))}
      {activeTab === 'wreath' && wreathGuide && wreathGuide.length > 0 && renderGuideContent(wreathGuide, expandedWreathItems, (index) => toggleExpanded(index, setExpandedWreathItems))}
    </>
  );

  return <section className={styles.container}>{wrapInCard && 'card' in styles ? <div className={styles.card}>{content}</div> : content}</section>;
}
