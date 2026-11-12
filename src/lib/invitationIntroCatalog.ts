
/**
 * INTRO-GIF-03-D — verified, customer-selected invitation intros.
 * One permanent ID per asset; preview does not imply saving or automatic entry.
 */
import type { EventTypeKey } from '@/lib/eventTypes';

export const INVITATION_INTRO_GROUPS = [
  { id: 'simple', label: '심플' },
  { id: 'emotional', label: '감성' },
  { id: 'luxury', label: '화려' },
  { id: 'character', label: '캐릭터' },
] as const;

export type InvitationIntroGroup = (typeof INVITATION_INTRO_GROUPS)[number]['id'];

export type InvitationIntroPreset = {
  id: string;
  label: string;
  description: string;
  group: InvitationIntroGroup;
  supportedEventTypes: readonly EventTypeKey[];
  gifSrc: string;
  posterSrc: string;
  durationMs: number;
  sha256: string;
  active: boolean;
  sortOrder: number;
};

const ALL_ACTIVE_EVENTS = [
  'wedding', 'first-birthday', 'birthday', 'opening', 'general-event',
] as const satisfies readonly EventTypeKey[];

const WEDDING_EVENTS = ['wedding'] as const satisfies readonly EventTypeKey[];

export const INVITATION_INTRO_PRESETS = [
  {
    id: 'intro-01',
    label: '미니멀 라인',
    description: '차분한 초대 문구와 얇은 선이 등장합니다.',
    group: 'simple',
    supportedEventTypes: ALL_ACTIVE_EVENTS,
    gifSrc: '/assets/invitation-intro/universal-2s.gif',
    posterSrc: '/assets/invitation-intro/poster.webp',
    durationMs: 2000,
    sha256: 'dcdc8c0560282a3da8b9e6cd5d10b5407fe4e7bb3da75fe66160260f802aa2b7',
    active: true,
    sortOrder: 1,
  },
  {
    id: 'intro-02',
    label: '페이드 타이포',
    description: '글자가 차분하게 선명해지는 미니멀 연출.',
    group: 'simple',
    supportedEventTypes: ALL_ACTIVE_EVENTS,
    gifSrc: '/assets/invitation-intro/intro-02.gif',
    posterSrc: '/assets/invitation-intro/intro-02.webp',
    durationMs: 2000,
    sha256: '3717b9b5c3ea07291b5ee2abcc82357f4d3f7bf75dc01d98e0566d50bee5b0ce',
    active: true,
    sortOrder: 2,
  },
  {
    id: 'intro-03',
    label: '카드 프레임',
    description: '사각 카드 테두리가 그려지며 초대 문구가 나타납니다.',
    group: 'simple',
    supportedEventTypes: ALL_ACTIVE_EVENTS,
    gifSrc: '/assets/invitation-intro/intro-03.gif',
    posterSrc: '/assets/invitation-intro/intro-03.webp',
    durationMs: 2000,
    sha256: '23fb428036f28138d8ad1128703369ceabca0d3fdc19837e8ef9710cfb099527',
    active: true,
    sortOrder: 3,
  },
  {
    id: 'intro-04',
    label: '봉투 열림',
    description: '봉투 안에서 초대 카드가 등장하는 감성 연출.',
    group: 'emotional',
    supportedEventTypes: ALL_ACTIVE_EVENTS,
    gifSrc: '/assets/invitation-intro/intro-04.gif',
    posterSrc: '/assets/invitation-intro/intro-04.webp',
    durationMs: 2000,
    sha256: 'db13e68f6ef02f33b491aec9388c8ea91ca95c6a64faa2697f1b023338dfdc11',
    active: true,
    sortOrder: 4,
  },
  {
    id: 'intro-05',
    label: '종이 펼침',
    description: '접힌 종이가 펼쳐지며 초대 문구가 나타납니다.',
    group: 'emotional',
    supportedEventTypes: ALL_ACTIVE_EVENTS,
    gifSrc: '/assets/invitation-intro/intro-05.gif',
    posterSrc: '/assets/invitation-intro/intro-05.webp',
    durationMs: 2000,
    sha256: '1f6539bf10495f5a8928c33fbf81d2c5ee16420adc33b7163d857a8b2a7256fc',
    active: true,
    sortOrder: 5,
  },
  {
    id: 'intro-06',
    label: '페이지 넘김',
    description: '페이지가 넘어가며 초대 문구가 공개됩니다.',
    group: 'emotional',
    supportedEventTypes: ALL_ACTIVE_EVENTS,
    gifSrc: '/assets/invitation-intro/intro-06.gif',
    posterSrc: '/assets/invitation-intro/intro-06.webp',
    durationMs: 2000,
    sha256: 'f58ae398513b53de796adfc273d382d2829b5649afad4a1dd9cf4e3799787422',
    active: true,
    sortOrder: 6,
  },
  {
    id: 'intro-07',
    label: '플로럴 블룸',
    description: '꽃이 피어나며 웨딩 문구를 감싸는 로맨틱 연출.',
    group: 'luxury',
    supportedEventTypes: WEDDING_EVENTS,
    gifSrc: '/assets/invitation-intro/intro-07.gif',
    posterSrc: '/assets/invitation-intro/intro-07.webp',
    durationMs: 2000,
    sha256: '5cee11582d69f452bc10fe524127cc31162cd680b77fb6614ae862ee888cdea7',
    active: true,
    sortOrder: 7,
  },
  {
    id: 'intro-08',
    label: '골드 샤인',
    description: '은은한 골드 포인트와 웨딩 문구가 등장합니다.',
    group: 'luxury',
    supportedEventTypes: WEDDING_EVENTS,
    gifSrc: '/assets/invitation-intro/intro-08.gif',
    posterSrc: '/assets/invitation-intro/intro-08.webp',
    durationMs: 2000,
    sha256: 'a39e360ed87be85d4a5b962c79a92d727505f8272c52cb74cbe3bb6ebb61a2e6',
    active: true,
    sortOrder: 8,
  },
  {
    id: 'intro-09',
    label: '커튼 오픈',
    description: '양쪽 커튼이 열리며 웨딩 초대장을 보여줍니다.',
    group: 'luxury',
    supportedEventTypes: WEDDING_EVENTS,
    gifSrc: '/assets/invitation-intro/intro-09.gif',
    posterSrc: '/assets/invitation-intro/intro-09.webp',
    durationMs: 2000,
    sha256: '7dcda1a2393ab6ac600f5155995a5b268b1afd77461c8ce35247ff83976f396e',
    active: true,
    sortOrder: 9,
  },
  {
    id: 'intro-10',
    label: '신랑신부 손잡기',
    description: '2D 커플이 손을 맞잡으며 인사합니다.',
    group: 'character',
    supportedEventTypes: WEDDING_EVENTS,
    gifSrc: '/assets/invitation-intro/intro-10.gif',
    posterSrc: '/assets/invitation-intro/intro-10.webp',
    durationMs: 2000,
    sha256: 'aa11d9f10e9197a6f91bd176aaa025b50c03fd7ca8db010bac9050caa66b1c3d',
    active: true,
    sortOrder: 10,
  },
  {
    id: 'intro-11',
    label: '웨딩 행진',
    description: '신랑신부가 함께 걸어 나오는 귀여운 연출.',
    group: 'character',
    supportedEventTypes: WEDDING_EVENTS,
    gifSrc: '/assets/invitation-intro/intro-11.gif',
    posterSrc: '/assets/invitation-intro/intro-11.webp',
    durationMs: 2000,
    sha256: '2a13dee1c8035a2ee6591430cf0d72580fa55736738c344440de1e59723a64a2',
    active: true,
    sortOrder: 11,
  },
  {
    id: 'intro-12',
    label: '커플 인사',
    description: '신랑신부가 가볍게 인사하는 웨딩 캐릭터형.',
    group: 'character',
    supportedEventTypes: WEDDING_EVENTS,
    gifSrc: '/assets/invitation-intro/intro-12.gif',
    posterSrc: '/assets/invitation-intro/intro-12.webp',
    durationMs: 2000,
    sha256: '3b19fb7334052c8a3421a36181b88f60531fb100aed0390830de926114359926',
    active: true,
    sortOrder: 12,
  },
 ] as const satisfies readonly InvitationIntroPreset[];

export type RegisteredInvitationIntroPreset = (typeof INVITATION_INTRO_PRESETS)[number];
export type InvitationIntroPresetId = RegisteredInvitationIntroPreset['id'];
export type InvitationIntroChoice = 'none' | InvitationIntroPresetId;

export function listAvailableInvitationIntroPresets(
  eventType?: EventTypeKey,
  group?: InvitationIntroGroup,
): RegisteredInvitationIntroPreset[] {
  return [...INVITATION_INTRO_PRESETS]
    .filter((preset) =>
      preset.active &&
      (!eventType || (preset.supportedEventTypes as readonly EventTypeKey[]).includes(eventType)) &&
      (!group || preset.group === group)
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function listAvailableInvitationIntroGroups(eventType?: EventTypeKey) {
  const presets = listAvailableInvitationIntroPresets(eventType);
  return INVITATION_INTRO_GROUPS.filter((group) =>
    presets.some((preset) => preset.group === group.id)
  );
}

export function getInvitationIntroPreset(
  value: unknown,
  eventType?: EventTypeKey,
): RegisteredInvitationIntroPreset | null {
  if (typeof value !== 'string') return null;
  return listAvailableInvitationIntroPresets(eventType).find((preset) => preset.id === value) ?? null;
}

/** Missing/unsupported IDs are null, never a forced customer default. */
export function parseInvitationIntroChoice(value: unknown, eventType?: EventTypeKey): InvitationIntroChoice | null {
  if (value === 'none') return 'none';
  const preset = getInvitationIntroPreset(value, eventType);
  return preset ? preset.id : null;
}

export function isInvitationIntroChoiceAvailableForEvent(value: unknown, eventType: EventTypeKey): boolean {
  return parseInvitationIntroChoice(value, eventType) !== null;
}

/** Explicitly block a known wedding-only GIF from being saved on another event. */
export class InvitationIntroEventError extends Error {
  readonly status = 400;
  readonly code = 'INTRO_PRESET_EVENT_NOT_ALLOWED';

  constructor() {
    super('선택한 인트로는 이 행사 유형에서 사용할 수 없습니다. 다른 인트로를 선택해 주세요.');
    this.name = 'InvitationIntroEventError';
  }
}

export function assertInvitationIntroChoiceForEvent(value: unknown, eventType: EventTypeKey) {
  const registered = getInvitationIntroPreset(value);
  if (registered && !getInvitationIntroPreset(registered.id, eventType)) {
    throw new InvitationIntroEventError();
  }
}
