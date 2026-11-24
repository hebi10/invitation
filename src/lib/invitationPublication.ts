import { isValidWeddingDateTime } from '../contracts/weddingDateTime';
import type { InvitationPageSeed } from '../types/invitationPage';
import { DEFAULT_EVENT_TYPE, type EventTypeKey } from './eventTypes';

export type InvitationPublicationField = 'name' | 'dateTime' | 'venue' | 'address' | 'content';

const FIELD_LABELS: Record<InvitationPublicationField, string> = {
  name: '이름',
  dateTime: '날짜와 시간',
  venue: '장소명',
  address: '주소',
  content: '초대장 내용',
};

const GROOM_PLACEHOLDERS = ['신랑', '신랑 입력 전'];
const BRIDE_PLACEHOLDERS = ['신부', '신부 입력 전'];
const WEDDING_TITLE_PLACEHOLDERS = ['신랑 · 신부', '신랑 ♥ 신부', '신랑 입력 전 · 신부 입력 전'];

function readText(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function hasPersonName(
  name: string | undefined,
  legacyName: string | undefined,
  placeholders: readonly string[]
) {
  // Both aliases can appear in public templates. An omitted alias may use the
  // other, but a stored placeholder must be corrected before publication.
  const storedNames = [name, legacyName].map(readText).filter(Boolean);
  return storedNames.length > 0 && storedNames.every((stored) => !placeholders.includes(stored));
}

function hasPublicationName(config: InvitationPageSeed, eventType: EventTypeKey) {
  const title = readText(config.displayName);
  const groom = config.couple?.groom?.name;
  const bride = config.couple?.bride?.name;

  switch (eventType) {
    case 'first-birthday':
      return Boolean(title) && title !== '아기 이름' && !WEDDING_TITLE_PLACEHOLDERS.includes(title) &&
        hasPersonName(groom, config.groomName, [...GROOM_PLACEHOLDERS, '아빠']) &&
        hasPersonName(bride, config.brideName, [...BRIDE_PLACEHOLDERS, '엄마']);
    case 'birthday':
      return hasPersonName(groom, config.groomName, [...GROOM_PLACEHOLDERS, '생일 주인공']);
    case 'general-event':
      return Boolean(title) && title !== '일반 행사' && !WEDDING_TITLE_PLACEHOLDERS.includes(title);
    case 'opening':
      return Boolean(title) && title !== '새 매장' && !WEDDING_TITLE_PLACEHOLDERS.includes(title);
    default:
      return !WEDDING_TITLE_PLACEHOLDERS.includes(title) &&
        hasPersonName(groom, config.groomName, GROOM_PLACEHOLDERS) &&
        hasPersonName(bride, config.brideName, BRIDE_PLACEHOLDERS);
  }
}

export class InvitationPublicationIncompleteError extends Error {
  readonly code = 'INVITATION_PUBLICATION_INCOMPLETE';
  readonly status = 422;

  constructor(readonly missingFields: readonly InvitationPublicationField[]) {
    super(`공개하려면 ${missingFields.map((field) => FIELD_LABELS[field]).join(', ')} 항목을 확인해 주세요.`);
    this.name = 'InvitationPublicationIncompleteError';
  }
}

export function getInvitationPublicationMissingFields(
  config: InvitationPageSeed | null | undefined,
  eventType?: EventTypeKey
): InvitationPublicationField[] {
  if (!config) return ['content'];

  const missingFields: InvitationPublicationField[] = [];
  if (!hasPublicationName(config, eventType ?? config.eventType ?? DEFAULT_EVENT_TYPE)) {
    missingFields.push('name');
  }
  if (!isValidWeddingDateTime(config.weddingDateTime)) missingFields.push('dateTime');
  if (!readText(config.venue) && !readText(config.pageData?.venueName)) missingFields.push('venue');
  if (!readText(config.pageData?.ceremonyAddress)) missingFields.push('address');
  return missingFields;
}

export function assertInvitationReadyForPublication(
  config: InvitationPageSeed | null | undefined,
  eventType?: EventTypeKey
) {
  const missingFields = getInvitationPublicationMissingFields(config, eventType);
  if (missingFields.length) throw new InvitationPublicationIncompleteError(missingFields);
}
