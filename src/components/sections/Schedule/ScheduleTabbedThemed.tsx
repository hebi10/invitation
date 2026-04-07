'use client';

import { useEffect, useState } from 'react';
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

function hasText(value?: string) {
  return Boolean(value?.trim());
}

function hasDetailContent(info?: { time: string; location: string }) {
  return Boolean(info && (hasText(info.time) || hasText(info.location)));
}

function sanitizeGuideItems<T extends VenueGuideItem | WreathGuideItem>(items?: T[]) {
  return (items ?? []).filter((item) => hasText(item.title) || hasText(item.content));
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
  const sanitizedVenueGuide = sanitizeGuideItems(venueGuide);
  const sanitizedWreathGuide = sanitizeGuideItems(wreathGuide);
  const hasMainInfo =
    hasText(date) || hasText(time) || hasText(venue) || hasText(address);
  const hasCeremony = hasDetailContent(ceremony);
  const hasReception = hasDetailContent(reception);
  const hasGuideInfo =
    sanitizedVenueGuide.length > 0 || sanitizedWreathGuide.length > 0;
  const showTabs = hasGuideInfo;

  useEffect(() => {
    if (activeTab === 'guide' && sanitizedVenueGuide.length === 0) {
      setActiveTab('schedule');
      return;
    }

    if (activeTab === 'wreath' && sanitizedWreathGuide.length === 0) {
      setActiveTab('schedule');
    }
  }, [activeTab, sanitizedVenueGuide.length, sanitizedWreathGuide.length]);

  if (!hasMainInfo && !hasCeremony && !hasReception && !hasGuideInfo) {
    return null;
  }

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
    const hasDateTime = hasText(date) || hasText(time);
    const hasVenueInfo = hasText(venue) || hasText(address);

    if (layout === 'stacked') {
      return (
        <div className={styles.mainInfo}>
          {hasText(date) && <h3 className={styles.date}>{date}</h3>}
          {hasText(time) && <p className={styles.time}>{time}</p>}
          {hasText(venue) && <h4 className={styles.venue}>{venue}</h4>}
          {hasText(address) && <p className={styles.address}>{address}</p>}
        </div>
      );
    }

    return (
      <div className={styles.mainInfo}>
        {hasDateTime && (
          <div className={styles.dateTimeWrapper}>
            {hasText(date) && <h3 className={styles.date}>{date}</h3>}
            {hasText(time) && <p className={styles.time}>{time}</p>}
          </div>
        )}

        {hasDateTime && hasVenueInfo && 'divider' in styles && (
          <div className={styles.divider}></div>
        )}

        {hasVenueInfo && (
          <div className={styles.venueWrapper}>
            {hasText(venue) && <h4 className={styles.venue}>{venue}</h4>}
            {hasText(address) && <p className={styles.address}>{address}</p>}
          </div>
        )}
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
          {sanitizedVenueGuide.length > 0 && (
            <button className={`${styles.tab} ${activeTab === 'guide' ? styles.active : ''}`} onClick={() => setActiveTab('guide')} type="button">
              예식장 안내
            </button>
          )}
          {sanitizedWreathGuide.length > 0 && (
            <button className={`${styles.tab} ${activeTab === 'wreath' ? styles.active : ''}`} onClick={() => setActiveTab('wreath')} type="button">
              화환 안내
            </button>
          )}
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className={'scheduleContent' in styles ? styles.scheduleContent : undefined}>
          {renderMainInfo()}

          {(hasCeremony || hasReception) && (
            <div className={styles.detailsContainer}>
              {hasCeremony && ceremony &&
                renderDetailItem('본식', ceremony, detailIcons?.ceremony)}
              {hasReception && reception &&
                renderDetailItem('피로연', reception, detailIcons?.reception)}
            </div>
          )}
        </div>
      )}

      {activeTab === 'guide' &&
        sanitizedVenueGuide.length > 0 &&
        renderGuideContent(sanitizedVenueGuide, expandedGuideItems, (index) =>
          toggleExpanded(index, setExpandedGuideItems)
        )}
      {activeTab === 'wreath' &&
        sanitizedWreathGuide.length > 0 &&
        renderGuideContent(sanitizedWreathGuide, expandedWreathItems, (index) =>
          toggleExpanded(index, setExpandedWreathItems)
        )}
    </>
  );

  return <section className={styles.container}>{wrapInCard && 'card' in styles ? <div className={styles.card}>{content}</div> : content}</section>;
}
