/** Content versions are separate from event metadata (tickets, owners, display periods). */
export function readInvitationContentVersion(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export class InvitationVersionConflictError extends Error {
  readonly status = 409;
  readonly code = 'VERSION_CONFLICT';

  constructor(public readonly currentVersion: number) {
    super('다른 곳에서 먼저 수정했습니다. 작성 중인 내용은 유지됩니다. 필요한 내용을 복사한 뒤 최신 내용을 불러와 다시 수정해 주세요.');
    this.name = 'InvitationVersionConflictError';
  }
}

export class InvitationVersionPreconditionError extends Error {
  readonly code = 'VERSION_REQUIRED';

  constructor(public readonly status: 400 | 428) {
    super(status === 428
      ? '편집 버전 정보가 없습니다. 작성 중인 내용을 복사한 뒤 페이지를 새로 열어 주세요. 모바일 앱은 최신 버전으로 업데이트해 주세요.'
      : '편집 버전 정보가 올바르지 않습니다. 페이지를 새로 열어 주세요.');
    this.name = 'InvitationVersionPreconditionError';
  }
}

export function requireInvitationContentVersion(value: unknown): number {
  if (value === undefined || value === null) throw new InvitationVersionPreconditionError(428);
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new InvitationVersionPreconditionError(400);
  }
  return value;
}

export function isInvitationVersionError(error: unknown): error is InvitationVersionConflictError | InvitationVersionPreconditionError {
  return error instanceof InvitationVersionConflictError || error instanceof InvitationVersionPreconditionError;
}
