import { isEventDeletionBlockingAccess } from '@/server/eventDeletionPolicy';
import type { EventDeletionMetadata } from '@/types/invitationPage';

type InvitationPublicAccessInput = {
  published: boolean;
  displayPeriodEnabled: boolean;
  displayPeriodStart: Date | null;
  displayPeriodEnd: Date | null;
  deletion?: EventDeletionMetadata | null;
};

export type InvitationPublicAccessReason =
  | 'public'
  | 'deleting'
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
  visitorMessage: string | null;
};

const accessDateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function shouldRunClientInvitationPageQuery(input: {
  isAdminLoading: boolean;
  isAdminLoggedIn: boolean;
  hasInitialPage: boolean;
  hasInitialBlockMessage: boolean;
}) {
  return (
    !input.isAdminLoading &&
    (input.isAdminLoggedIn ||
      (!input.hasInitialPage && !input.hasInitialBlockMessage))
  );
}

function formatAccessDateTime(value: Date | null) {
  return value ? accessDateTimeFormatter.format(value) : null;
}

export function getInvitationPublicAccessState(
  page: InvitationPublicAccessInput,
  now: Date = new Date()
): InvitationPublicAccessState {
  if (isEventDeletionBlockingAccess(page.deletion)) {
    return {
      isPublic: false,
      reason: 'deleting',
      adminLabel: '삭제 진행 중',
      adminDescription: '삭제 작업이 끝날 때까지 페이지를 공개할 수 없습니다.',
      adminNotice: '현재 이용할 수 없는 페이지입니다.',
      visitorMessage: '현재 이용할 수 없는 페이지입니다.',
    };
  }

  if (!page.published) {
    return {
      isPublic: false,
      reason: 'private',
      adminLabel: '비공개',
      adminDescription: '공개 상태가 꺼져 있어 방문자에게는 열리지 않습니다.',
      adminNotice: '현재 비공개 상태인 청첩장입니다. 관리자만 볼 수 있습니다.',
      visitorMessage: '비공개 페이지입니다.',
    };
  }

  if (!page.displayPeriodEnabled) {
    return {
      isPublic: true,
      reason: 'public',
      adminLabel: '공개 가능',
      adminDescription: null,
      adminNotice: null,
      visitorMessage: null,
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
      visitorMessage: '노출 기간이 아직 설정되지 않은 페이지입니다.',
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
      visitorMessage: startLabel
        ? `아직 노출 기간이 시작되지 않은 페이지입니다. ${startLabel}부터 확인하실 수 있습니다.`
        : '아직 노출 기간이 시작되지 않은 페이지입니다.',
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
      visitorMessage: endLabel
        ? `노출 기간이 지난 페이지입니다. ${endLabel}에 공개가 종료되었습니다.`
        : '노출 기간이 지난 페이지입니다.',
    };
  }

  return {
    isPublic: true,
    reason: 'public',
    adminLabel: '공개 가능',
    adminDescription: null,
    adminNotice: null,
    visitorMessage: null,
  };
}
