/**
 * Theme-agnostic invitation intro catalogue.
 * Only verified assets are registered. Customer selection and persistence are separate.
 */
export type InvitationIntroPreset = {
  id: string;
  label: string;
  description: string;
  gifSrc: string;
  posterSrc: string;
  durationMs: number;
  sha256: string;
  active: boolean;
  sortOrder: number;
};

export const INVITATION_INTRO_PRESETS = [
  {
    id: 'intro-01',
    label: '미니멀 타이포',
    description: '밝은 바탕 위에 초대 문구와 얇은 선이 나타납니다.',
    gifSrc: '/assets/invitation-intro/universal-2s.gif',
    posterSrc: '/assets/invitation-intro/poster.webp',
    durationMs: 2000,
    sha256: 'dcdc8c0560282a3da8b9e6cd5d10b5407fe4e7bb3da75fe66160260f802aa2b7',
    active: true,
    sortOrder: 1,
  },
  // INTRO-GIF-03 GENERATED START
  {
    id: 'intro-02',
    label: '봉투 열림',
    description: '봉투가 열리고 초대 카드가 나타납니다.',
    gifSrc: '/assets/invitation-intro/intro-02.gif',
    posterSrc: '/assets/invitation-intro/intro-02.webp',
    durationMs: 2000,
    sha256: '3f8e72e0927a5c4583c294c821761558e8d9978320c44375beaf169b6963248f',
    active: true,
    sortOrder: 2,
  },
  {
    id: 'intro-03',
    label: '종이 펼침',
    description: '접힌 종이가 펼쳐지며 문구를 보여줍니다.',
    gifSrc: '/assets/invitation-intro/intro-03.gif',
    posterSrc: '/assets/invitation-intro/intro-03.webp',
    durationMs: 2000,
    sha256: 'edc2a8aa7fd5bbc3e3f87f9d2cd9476860584a7809581aed5f25377eea3339bd',
    active: true,
    sortOrder: 3,
  },
  {
    id: 'intro-04',
    label: '사진 프레임',
    description: '직사각형 프레임이 만들어지고 문구가 등장합니다.',
    gifSrc: '/assets/invitation-intro/intro-04.gif',
    posterSrc: '/assets/invitation-intro/intro-04.webp',
    durationMs: 2000,
    sha256: '1e05292a0cda8a42f319cb6c756159e101e7ef6e69d9a6091de8f5a03cc0b191',
    active: true,
    sortOrder: 4,
  },
  {
    id: 'intro-05',
    label: '타이핑',
    description: '초대 문구가 한 글자씩 입력됩니다.',
    gifSrc: '/assets/invitation-intro/intro-05.gif',
    posterSrc: '/assets/invitation-intro/intro-05.webp',
    durationMs: 2000,
    sha256: '0c74dc673d2b03092c0683efc1d3ad1030bdad37f3a6e9de4075b93fb89dfa3d',
    active: true,
    sortOrder: 5,
  },
  {
    id: 'intro-06',
    label: '페이지 넘김',
    description: '페이지 모서리가 넘어가며 초대장이 공개됩니다.',
    gifSrc: '/assets/invitation-intro/intro-06.gif',
    posterSrc: '/assets/invitation-intro/intro-06.webp',
    durationMs: 2000,
    sha256: 'bd688089feeee8b643fadbbc4aaa6df5d4759c3fb7a0ede951085a55f481baf2',
    active: true,
    sortOrder: 6,
  },
  {
    id: 'intro-07',
    label: '슬라이딩 패널',
    description: '좌우 패널이 움직여 가운데 문구를 보여줍니다.',
    gifSrc: '/assets/invitation-intro/intro-07.gif',
    posterSrc: '/assets/invitation-intro/intro-07.webp',
    durationMs: 2000,
    sha256: '6f365e01d9246785ed71a151f852b01a6c204b1a29c2aca74c3aa012c739d255',
    active: true,
    sortOrder: 7,
  },
  {
    id: 'intro-08',
    label: '선 드로잉',
    description: '가느다란 선이 원을 그리며 초대 문구를 감쌉니다.',
    gifSrc: '/assets/invitation-intro/intro-08.gif',
    posterSrc: '/assets/invitation-intro/intro-08.webp',
    durationMs: 2000,
    sha256: 'd042239b8f5d39ec93550990e5cd30e80a5edbefb76bf19c37ff4de6183fbcbd',
    active: true,
    sortOrder: 8,
  },
  {
    id: 'intro-09',
    label: '창문 열림',
    description: '두 문이 좌우로 열리며 문구를 드러냅니다.',
    gifSrc: '/assets/invitation-intro/intro-09.gif',
    posterSrc: '/assets/invitation-intro/intro-09.webp',
    durationMs: 2000,
    sha256: '2e1fe2bb8be99ef258e06bb4f5f5047a6ec94b6869dc7469758fda8cb323b8fb',
    active: true,
    sortOrder: 9,
  },
  {
    id: 'intro-10',
    label: '타이틀 등장',
    description: '중앙 타이틀과 수평선이 차례로 나타납니다.',
    gifSrc: '/assets/invitation-intro/intro-10.gif',
    posterSrc: '/assets/invitation-intro/intro-10.webp',
    durationMs: 2000,
    sha256: '173532ebdf329ed5101e3f5385c0ea171e1a4ab75f96a4382d1e2f3aae823f3b',
    active: true,
    sortOrder: 10,
  },
  // INTRO-GIF-03 GENERATED END
] as const satisfies readonly InvitationIntroPreset[];

export type RegisteredInvitationIntroPreset = (typeof INVITATION_INTRO_PRESETS)[number];
export type InvitationIntroPresetId = RegisteredInvitationIntroPreset['id'];
export type InvitationIntroChoice = 'none' | InvitationIntroPresetId;

export function listAvailableInvitationIntroPresets(): RegisteredInvitationIntroPreset[] {
  return [...INVITATION_INTRO_PRESETS]
    .filter((preset) => preset.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getInvitationIntroPreset(value: unknown): RegisteredInvitationIntroPreset | null {
  if (typeof value !== 'string') return null;
  return listAvailableInvitationIntroPresets().find((preset) => preset.id === value) ?? null;
}

/**
 * Return null for missing or unfamiliar IDs. Never silently overwrite a saved legacy
 * introStyle or unknown future selection with "none".
 */
export function parseInvitationIntroChoice(value: unknown): InvitationIntroChoice | null {
  if (value === 'none') return 'none';
  const preset = getInvitationIntroPreset(value);
  return preset ? preset.id : null;
}
