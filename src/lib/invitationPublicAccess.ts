type InvitationPublicAccessInput = {
  published: boolean;
  displayPeriodEnabled: boolean;
  displayPeriodStart: Date | null;
  displayPeriodEnd: Date | null;
};

export type InvitationPublicAccessReason =
  | 'public'
  | 'private'
  | 'period-incomplete'
  | 'scheduled'
  | 'expired';

export type InvitationPublicAccessState = {
  isPublic: boolean;
  reason: InvitationPublicAccessReason;
  adminLabel: string;
  adminDescription: string | null;
  adminNotice: string | null;
};

const accessDateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function formatAccessDateTime(value: Date | null) {
  return value ? accessDateTimeFormatter.format(value) : null;
}

export function getInvitationPublicAccessState(
  page: InvitationPublicAccessInput,
  now: Date = new Date()
): InvitationPublicAccessState {
  if (!page.published) {
    return {
      isPublic: false,
      reason: 'private',
      adminLabel: '비공개',
      adminDescription: '공개 상태가 꺼져 있어 방문자에게는 열리지 않습니다.',
      adminNotice: '현재 비공개 상태인 청첩장입니다. 관리자만 볼 수 있습니다.',
    };
  }

  if (!page.displayPeriodEnabled) {
    return {
      isPublic: true,
      reason: 'public',
      adminLabel: '공개 가능',
      adminDescription: null,
      adminNotice: null,
    };
  }

  if (!page.displayPeriodStart || !page.displayPeriodEnd) {
    return {
      isPublic: false,
      reason: 'period-incomplete',
      adminLabel: '노출 기간 설정 필요',
      adminDescription: '노출 기간이 활성화됐지만 시작일 또는 종료일이 비어 있습니다.',
      adminNotice:
        '노출 기간 설정이 완전하지 않아 공개되지 않습니다. 관리자만 볼 수 있습니다.',
    };
  }

  if (now < page.displayPeriodStart) {
    const startLabel = formatAccessDateTime(page.displayPeriodStart);

    return {
      isPublic: false,
      reason: 'scheduled',
      adminLabel: '노출 시작 전',
      adminDescription: startLabel ? `${startLabel}부터 공개됩니다.` : '노출 시작 전입니다.',
      adminNotice: startLabel
        ? `현재 노출 시작 전입니다. ${startLabel}부터 공개됩니다. 관리자만 볼 수 있습니다.`
        : '현재 노출 시작 전인 페이지입니다. 관리자만 볼 수 있습니다.',
    };
  }

  if (now > page.displayPeriodEnd) {
    const endLabel = formatAccessDateTime(page.displayPeriodEnd);

    return {
      isPublic: false,
      reason: 'expired',
      adminLabel: '노출 종료',
      adminDescription: endLabel ? `${endLabel}에 공개가 종료되었습니다.` : '노출 기간이 종료되었습니다.',
      adminNotice: endLabel
        ? `현재 노출 종료된 페이지입니다. ${endLabel}에 공개가 종료되었습니다. 관리자만 볼 수 있습니다.`
        : '현재 노출 종료된 페이지입니다. 관리자만 볼 수 있습니다.',
    };
  }

  return {
    isPublic: true,
    reason: 'public',
    adminLabel: '공개 가능',
    adminDescription: null,
    adminNotice: null,
  };
}
