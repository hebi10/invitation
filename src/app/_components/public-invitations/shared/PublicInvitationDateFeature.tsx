'use client';

import { useEffect, useState } from 'react';

import type { InvitationPage } from '@/types/invitationPage';

import {
  buildPublicInvitationDateFeature,
  type PublicInvitationDateFeatureMode,
} from './dateFeatureModel';
import featureStyles from './PublicInvitationDateFeature.module.css';

type PublicInvitationDateFeatureProps = {
  className?: string;
  eventDate: Date;
  mode?: PublicInvitationDateFeatureMode;
  page: Pick<InvitationPage, 'features' | 'productTier'>;
  title: string;
  titleClassName?: string;
};

export function PublicInvitationDateFeature({
  className,
  eventDate,
  mode = 'countdown',
  page,
  title,
  titleClassName,
}: PublicInvitationDateFeatureProps) {
  const [now, setNow] = useState(() => new Date());
  const model = buildPublicInvitationDateFeature(page, eventDate, { mode, now });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!model) {
    return null;
  }

  return (
    <section
      className={[featureStyles.section, className].filter(Boolean).join(' ')}
      data-public-invitation-feature={model.mode}
      aria-label={title}
    >
      <h2 className={titleClassName || featureStyles.title}>{title}</h2>
      <div className={featureStyles.summary}>
        <time className={featureStyles.date} dateTime={model.dateTime}>
          {model.dateLabel}
        </time>
        <strong className={featureStyles.countdown}>{model.countdownLabel}</strong>
      </div>

      {model.mode === 'calendar-countdown' ? (
        <div className={featureStyles.calendar} aria-label={`${model.monthLabel} 달력`}>
          <p className={featureStyles.month}>{model.monthLabel}</p>
          <div className={featureStyles.weekdays} aria-hidden="true">
            {model.weekdayLabels.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          {model.calendarWeeks.map((week, weekIndex) => (
            <div className={featureStyles.week} key={`${model.monthLabel}-${weekIndex}`}>
              {week.map((day, dayIndex) =>
                day === null ? (
                  <span
                    className={featureStyles.day}
                    key={`empty-${weekIndex}-${dayIndex}`}
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className={`${featureStyles.day} ${
                      day === model.eventDay ? featureStyles.eventDay : ''
                    }`}
                    key={day}
                    aria-current={day === model.eventDay ? 'date' : undefined}
                  >
                    {day}
                  </span>
                )
              )}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
