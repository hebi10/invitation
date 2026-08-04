'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Dispatch, KeyboardEvent, SetStateAction } from 'react';

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

type ScheduleTab = 'schedule' | 'guide' | 'wreath';

interface ScheduleTabDefinition {
  id: ScheduleTab;
  label: string;
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
  const sanitizedVenueGuide = sanitizeGuideItems(venueGuide);
  const sanitizedWreathGuide = sanitizeGuideItems(wreathGuide);
  const hasMainInfo =
    hasText(date) || hasText(time) || hasText(venue) || hasText(address);
  const hasCeremony = hasDetailContent(ceremony);
  const hasReception = hasDetailContent(reception);
  const hasScheduleInfo = hasMainInfo || hasCeremony || hasReception;
  const hasGuideInfo =
    sanitizedVenueGuide.length > 0 || sanitizedWreathGuide.length > 0;
  const availableTabs = useMemo<ScheduleTabDefinition[]>(
    () => [
      ...(hasScheduleInfo ? [{ id: 'schedule' as const, label: '예식 일정' }] : []),
      ...(sanitizedVenueGuide.length > 0
        ? [{ id: 'guide' as const, label: '예식장 안내' }]
        : []),
      ...(sanitizedWreathGuide.length > 0
        ? [{ id: 'wreath' as const, label: '화환 안내' }]
        : []),
    ],
    [hasScheduleInfo, sanitizedVenueGuide.length, sanitizedWreathGuide.length]
  );
  const [activeTab, setActiveTab] = useState<ScheduleTab>(
    () => availableTabs[0]?.id ?? 'schedule'
  );
  const [expandedGuideItems, setExpandedGuideItems] = useState<Set<number>>(new Set());
  const [expandedWreathItems, setExpandedWreathItems] = useState<Set<number>>(new Set());
  const tabListId = useId();
  const tabRefs = useRef<Partial<Record<ScheduleTab, HTMLButtonElement | null>>>({});
  const showTabs = availableTabs.length > 1;
  const resolvedActiveTab = availableTabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : (availableTabs[0]?.id ?? 'schedule');

  useEffect(() => {
    if (resolvedActiveTab !== activeTab) {
      setActiveTab(resolvedActiveTab);
    }
  }, [activeTab, resolvedActiveTab]);

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

  const getTabId = (tab: ScheduleTab) => `${tabListId}-${tab}-tab`;
  const getPanelId = (tab: ScheduleTab) => `${tabListId}-${tab}-panel`;

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tab: ScheduleTab) => {
    const currentIndex = availableTabs.findIndex((item) => item.id === tab);
    if (currentIndex < 0) {
      return;
    }

    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % availableTabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + availableTabs.length) % availableTabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = availableTabs.length - 1;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    const nextTab = availableTabs[nextIndex].id;
    setActiveTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  const renderGuideContent = (
    items: VenueGuideItem[] | WreathGuideItem[],
    expandedItems: Set<number>,
    onToggle: (index: number) => void,
  ) => (
    <div className={styles.guideContainer}>
      {items.map((item, index) => (
        <div key={`${item.title}-${index}`} className={styles.guideItem} data-schedule-guide-item>
          <button
            className={styles.guideHeader}
            onClick={() => onToggle(index)}
            aria-expanded={expandedItems.has(index)}
            aria-controls={`${tabListId}-${resolvedActiveTab}-guide-${index}`}
            type="button"
          >
            <span className={styles.guideTitle}>
              <span
                className={`${styles.guideIcon} ${expandedItems.has(index) ? styles.expanded : ''}`}
                aria-hidden="true"
              >
                ›
              </span>
              {item.title}
            </span>
            <span className={styles.toggleIcon} aria-hidden="true">
              {expandedItems.has(index) ? '−' : '+'}
            </span>
          </button>
          <div
            id={`${tabListId}-${resolvedActiveTab}-guide-${index}`}
            className={`${styles.guideContentWrapper} ${expandedItems.has(index) ? styles.expanded : ''}`}
            aria-hidden={!expandedItems.has(index)}
          >
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
        <div className={styles.detailItem} data-schedule-detail>
          <h5 className={styles.detailTitle}>{label}</h5>
          <p className={styles.detailInfo}>{info.time}</p>
          <p className={styles.detailInfo}>{info.location}</p>
        </div>
      );
    }

    return (
      <div className={styles.detailItem} data-schedule-detail>
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
        <div className={styles.tabs} role="tablist" aria-label={`${title} 목록`} data-schedule-tabs>
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[tab.id] = element;
              }}
              id={getTabId(tab.id)}
              className={`${styles.tab} ${resolvedActiveTab === tab.id ? styles.active : ''}`}
              role="tab"
              aria-selected={resolvedActiveTab === tab.id}
              aria-controls={getPanelId(tab.id)}
              tabIndex={resolvedActiveTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
              data-schedule-tab
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {resolvedActiveTab === 'schedule' && (
        <div
          id={showTabs ? getPanelId('schedule') : undefined}
          className={'scheduleContent' in styles ? styles.scheduleContent : undefined}
          role={showTabs ? 'tabpanel' : undefined}
          aria-labelledby={showTabs ? getTabId('schedule') : undefined}
          tabIndex={showTabs ? 0 : undefined}
          data-schedule-panel
        >
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

      {resolvedActiveTab === 'guide' && sanitizedVenueGuide.length > 0 && (
        <div
          id={showTabs ? getPanelId('guide') : undefined}
          role={showTabs ? 'tabpanel' : undefined}
          aria-labelledby={showTabs ? getTabId('guide') : undefined}
          tabIndex={showTabs ? 0 : undefined}
          data-schedule-panel
        >
          {renderGuideContent(sanitizedVenueGuide, expandedGuideItems, (index) =>
            toggleExpanded(index, setExpandedGuideItems)
          )}
        </div>
      )}
      {resolvedActiveTab === 'wreath' && sanitizedWreathGuide.length > 0 && (
        <div
          id={showTabs ? getPanelId('wreath') : undefined}
          role={showTabs ? 'tabpanel' : undefined}
          aria-labelledby={showTabs ? getTabId('wreath') : undefined}
          tabIndex={showTabs ? 0 : undefined}
          data-schedule-panel
        >
          {renderGuideContent(sanitizedWreathGuide, expandedWreathItems, (index) =>
            toggleExpanded(index, setExpandedWreathItems)
          )}
        </div>
      )}
    </>
  );

  return <section className={styles.container}>{wrapInCard && 'card' in styles ? <div className={styles.card}>{content}</div> : content}</section>;
}
