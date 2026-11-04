import type { MobileDisplayPeriodSummary } from '../../types/mobileInvitation';

// Mirrors the public page's time boundaries without changing publication settings.
export function getInvitationVisibility(
  published: boolean,
  period: MobileDisplayPeriodSummary,
  now = Date.now()
) {
  if (!published) {
    return { isPublic: false, label: '비공개', tone: 'neutral' } as const;
  }

  if (!period.enabled) {
    return { isPublic: true, label: '공개 중', tone: 'success' } as const;
  }

  const start = period.startDate ? Date.parse(period.startDate) : NaN;
  const end = period.endDate ? Date.parse(period.endDate) : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { isPublic: false, label: '노출 기간 확인 필요', tone: 'notice' } as const;
  }
  if (now < start) {
    return { isPublic: false, label: '노출 시작 전', tone: 'notice' } as const;
  }
  if (now > end) {
    return { isPublic: false, label: '노출 종료', tone: 'notice' } as const;
  }

  return { isPublic: true, label: '공개 중', tone: 'success' } as const;
}
