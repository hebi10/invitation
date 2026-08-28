import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import type { InvitationPage } from '@/types/invitationPage';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type PublicInvitationDateFeatureMode =
  | 'calendar-countdown'
  | 'countdown';

export type PublicInvitationDateFeatureModel = {
  calendarWeeks: Array<Array<number | null>>;
  countdownLabel: string;
  dateLabel: string;
  dateTime: string;
  eventDay: number;
  mode: PublicInvitationDateFeatureMode;
  monthLabel: string;
  remainingDays: number;
  weekdayLabels: readonly string[];
};

type DateFeaturePage = Pick<InvitationPage, 'features' | 'productTier'>;

function buildCalendarWeeks(eventDate: Date) {
  const year = eventDate.getFullYear();
  const month = eventDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7)
  );
}

function buildCountdownLabel(remainingDays: number) {
  if (remainingDays > 0) {
    return `D-${remainingDays}`;
  }

  if (remainingDays < 0) {
    return `D+${Math.abs(remainingDays)}`;
  }

  return 'D-DAY';
}

export function buildPublicInvitationDateFeature(
  page: DateFeaturePage,
  eventDate: Date,
  {
    mode,
    now = new Date(),
  }: {
    mode: PublicInvitationDateFeatureMode;
    now?: Date;
  }
): PublicInvitationDateFeatureModel | null {
  const features = resolveInvitationFeatures(page.productTier, page.features);

  if (!features.showCountdown || Number.isNaN(eventDate.getTime())) {
    return null;
  }

  const remainingDays = Math.ceil(
    (eventDate.getTime() - now.getTime()) / DAY_IN_MS
  );

  return {
    calendarWeeks:
      mode === 'calendar-countdown' ? buildCalendarWeeks(eventDate) : [],
    countdownLabel: buildCountdownLabel(remainingDays),
    dateLabel: new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }).format(eventDate),
    dateTime: eventDate.toISOString(),
    eventDay: eventDate.getDate(),
    mode,
    monthLabel: `${eventDate.getFullYear()}년 ${eventDate.getMonth() + 1}월`,
    remainingDays,
    weekdayLabels: ['일', '월', '화', '수', '목', '금', '토'],
  };
}
