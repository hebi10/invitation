import type { AdminEventDeletionResult } from '@/server/adminEventDeletionService';
import type { EventDeletionMetadata, EventDeletionStep } from '@/types/invitationPage';

const STEP_LABELS: Record<EventDeletionStep, string> = {
  'block-access': '공개 접근 차단',
  'delete-comments': '방명록 정리',
  'delete-images': '이미지 정리',
  'delete-ownership-references': '고객 연결 및 이용 기록 정리',
  'delete-content-and-indexes': '페이지 내용 및 주소 정리',
  'delete-event-root': '이벤트 최종 삭제',
};

export function getEventDeletionFailureMessage(result: AdminEventDeletionResult) {
  const step = result.failedStep ? STEP_LABELS[result.failedStep] : '삭제 처리';
  return `${step} 단계에서 삭제를 완료하지 못했습니다. ${result.retryable ? '원인을 해결한 뒤 삭제 재시도를 눌러 주세요. 완료된 단계는 다시 실행하지 않습니다.' : '관리자가 오류 원인을 확인해야 합니다.'}`;
}

export function isEventDeletionComplete(result: AdminEventDeletionResult) {
  return result.success === true && result.deletionStatus === 'completed';
}

export function getEventDeletionButtonLabel(deletion?: EventDeletionMetadata) {
  return deletion?.status === 'failed' ? '삭제 재시도' : '완전 삭제';
}
