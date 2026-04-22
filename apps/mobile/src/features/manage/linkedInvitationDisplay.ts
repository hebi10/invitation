import {
  getInvitationThemeLabel,
  type MobileInvitationThemeKey,
} from '../../lib/invitationThemes';
import type { MobileDisplayPeriodSummary } from '../../types/mobileInvitation';

export function formatThemeList(themeKeys: readonly MobileInvitationThemeKey[]) {
  return themeKeys.map((key) => getInvitationThemeLabel(key)).join(', ');
}

export function formatDateLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(parsed);
}

export function formatDisplayPeriod(period: MobileDisplayPeriodSummary | null | undefined) {
  if (!period?.enabled) {
    return '미설정';
  }

  const startDate = period.startDate ? formatDateLabel(period.startDate) : '시작일 미설정';
  const endDate = period.endDate ? formatDateLabel(period.endDate) : '종료일 미설정';

  return `${startDate} ~ ${endDate}`;
}
