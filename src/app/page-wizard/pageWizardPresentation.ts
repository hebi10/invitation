import { DEFAULT_EVENT_TYPE, type EventTypeKey } from '@/lib/eventTypes';

export interface PageWizardPresentation {
  pageClassName: 'default' | 'firstBirthday' | 'birthday' | 'generalEvent';
  loadingTitle: string;
  loadingDescription: string;
  createLoginTitle: string;
  createLoginDescription: string;
  createLoginHelper: string;
  editLoginTitle: string;
  editLoginDescription: string;
  editLoginHelper: string;
  ownershipTitle: string;
  ownershipDescription: string;
  accessTitle: string;
  fallbackTitle: string;
  fallbackDescription: string;
  myPagesLabel: string;
  loadErrorMessage: string;
  saveSuccessMessage: string;
  saveErrorMessage: string;
  unpublishedStatusLabel: string;
}

const WEDDING_PRESENTATION: PageWizardPresentation = {
  pageClassName: 'default',
  loadingTitle: '청첩장 편집 화면을 준비하고 있습니다.',
  loadingDescription: '현재 입력된 설정과 연결 상태를 확인하고 있습니다.',
  createLoginTitle: '청첩장 만들기는 관리자만 이용 가능합니다',
  createLoginDescription: '관리자 계정으로 로그인한 뒤 새 청첩장 생성 화면을 이용해 주세요.',
  createLoginHelper: '청첩장 생성은 관리자 권한이 확인된 계정에서만 가능합니다.',
  editLoginTitle: '청첩장 편집을 위해 로그인해 주세요',
  editLoginDescription:
    '청첩장에 연결된 고객 계정으로 로그인하면 편집 화면을 이용할 수 있습니다.',
  editLoginHelper: '아직 계정에 연결되지 않은 청첩장은 관리자에게 계정 연결을 요청해 주세요.',
  ownershipTitle: '관리자에게 청첩장 연결을 요청해 주세요',
  ownershipDescription:
    '이 청첩장은 현재 계정으로 연동되어 있지 않습니다. 관리자를 통해 고객 계정에 연결된 청첩장만 편집할 수 있습니다.',
  accessTitle: '이 청첩장은 현재 계정으로 관리할 수 없습니다.',
  fallbackTitle: '청첩장 정보를 확인하고 있습니다.',
  fallbackDescription: '다시 시도해 주세요. 로그인 상태와 청첩장 연동 상태를 확인해 주세요.',
  myPagesLabel: '내 청첩장으로 이동',
  loadErrorMessage: '청첩장 정보를 불러오지 못했습니다.',
  saveSuccessMessage: '청첩장을 저장했습니다.',
  saveErrorMessage: '청첩장 저장에 실패했습니다.',
  unpublishedStatusLabel: '비공개',
};

const BIRTHDAY_PRESENTATION: PageWizardPresentation = {
  pageClassName: 'birthday',
  loadingTitle: '생일 초대장 편집 화면을 준비하고 있습니다.',
  loadingDescription: '입력값과 예산 설정을 불러오는 중입니다.',
  createLoginTitle: '생일 초대장 만들기는 관리자만 이용 가능합니다',
  createLoginDescription: '관리자 계정으로 로그인한 뒤 새 생일 초대장 생성 화면을 이용해 주세요.',
  createLoginHelper: '생일 초대장 생성은 관리자 권한이 확인된 계정에서만 가능합니다.',
  editLoginTitle: '생일 초대장 편집을 위해 로그인해 주세요',
  editLoginDescription:
    '생일 초대장에 연결된 고객 계정으로 로그인하면 편집 화면을 이용할 수 있습니다.',
  editLoginHelper:
    '아직 계정에 연결되지 않은 생일 초대장은 관리자에게 계정 연결을 요청해 주세요.',
  ownershipTitle: '관리자에게 생일 초대장 연결을 요청해 주세요',
  ownershipDescription:
    '이 생일 초대장은 현재 계정으로 연동되어 있지 않습니다. 관리자에게 요청된 고객 연동으로만 편집할 수 있습니다.',
  accessTitle: '이 생일 초대장은 현재 계정으로 관리할 수 없습니다.',
  fallbackTitle: '생일 초대장 정보를 확인하고 있습니다.',
  fallbackDescription: '다시 시도해 주세요. 로그인 상태와 생일 초대장 연동 상태를 확인해 주세요.',
  myPagesLabel: '내 생일 초대장으로 이동',
  loadErrorMessage: '생일 초대장 정보를 불러오지 못했습니다.',
  saveSuccessMessage: '생일 초대장을 저장했습니다.',
  saveErrorMessage: '생일 초대장 저장에 실패했습니다.',
  unpublishedStatusLabel: '비공개',
};

const FIRST_BIRTHDAY_PRESENTATION: PageWizardPresentation = {
  pageClassName: 'firstBirthday',
  loadingTitle: '돌잔치 초대장 편집 화면을 준비하고 있습니다.',
  loadingDescription: '현재 설정값을 불러오는 중입니다.',
  createLoginTitle: '돌잔치 초대장 만들기는 관리자만 이용 가능합니다',
  createLoginDescription: '관리자 계정으로 로그인한 뒤 새 돌잔치 초대장 생성 화면을 이용해 주세요.',
  createLoginHelper: '돌잔치 초대장 생성은 관리자 권한이 확인된 계정에서만 가능합니다.',
  editLoginTitle: '돌잔치 초대장 편집을 위해 로그인해 주세요',
  editLoginDescription:
    '돌잔치 초대장에 연결된 고객 계정으로 로그인하면 편집 화면을 이용할 수 있습니다.',
  editLoginHelper:
    '아직 계정에 연결되지 않은 돌잔치 초대장은 관리자에게 계정 연결을 요청해 주세요.',
  ownershipTitle: '관리자에게 돌잔치 초대장 연결을 요청해 주세요',
  ownershipDescription:
    '이 돌잔치 초대장은 현재 계정으로 연동되어 있지 않습니다. 고객 계정에 연결된 초대장만 편집할 수 있습니다.',
  accessTitle: '이 돌잔치 초대장은 현재 계정으로 관리할 수 없습니다.',
  fallbackTitle: '돌잔치 초대장 정보를 확인하고 있습니다.',
  fallbackDescription:
    '다시 시도해 주세요. 로그인 상태와 돌잔치 초대장 연동 상태를 확인해 주세요.',
  myPagesLabel: '내 돌잔치 초대장으로 이동',
  loadErrorMessage: '돌잔치 초대장 정보를 불러오지 못했습니다.',
  saveSuccessMessage: '돌잔치 초대장을 저장했습니다.',
  saveErrorMessage: '돌잔치 초대장 저장에 실패했습니다.',
  unpublishedStatusLabel: '비공개',
};

const GENERAL_EVENT_PRESENTATION: PageWizardPresentation = {
  pageClassName: 'generalEvent',
  loadingTitle: '행사 초대장 편집 화면을 준비하고 있습니다.',
  loadingDescription: '일정과 장소 정보를 확인하는 중입니다.',
  createLoginTitle: '행사 초대장 만들기는 관리자만 이용 가능합니다',
  createLoginDescription: '관리자 계정으로 로그인한 뒤 새 행사 초대장 생성 화면을 이용해 주세요.',
  createLoginHelper: '행사 초대장 생성은 관리자 권한이 확인된 계정에서만 가능합니다.',
  editLoginTitle: '행사 초대장 편집을 위해 로그인해 주세요',
  editLoginDescription:
    '행사 초대장에 연결된 고객 계정으로 로그인하면 편집 화면을 이용할 수 있습니다.',
  editLoginHelper:
    '아직 계정에 연결되지 않은 행사 초대장은 관리자에게 계정 연결을 요청해 주세요.',
  ownershipTitle: '관리자에게 행사 초대장 연결을 요청해 주세요',
  ownershipDescription:
    '이 행사 초대장은 현재 계정으로 연동되어 있지 않습니다. 관리자 또는 고객 계정 연결로만 편집할 수 있습니다.',
  accessTitle: '이 행사 초대장은 현재 계정으로 관리할 수 없습니다.',
  fallbackTitle: '행사 초대장 정보를 확인하고 있습니다.',
  fallbackDescription:
    '다시 시도해 주세요. 로그인 상태와 행사 초대장 연동 상태를 확인해 주세요.',
  myPagesLabel: '내 행사 초대장으로 이동',
  loadErrorMessage: '행사 초대장 정보를 불러오지 못했습니다.',
  saveSuccessMessage: '행사 초대장을 저장했습니다.',
  saveErrorMessage: '행사 초대장 저장에 실패했습니다.',
  unpublishedStatusLabel: '비공개',
};

const OPENING_PRESENTATION: PageWizardPresentation = {
  pageClassName: 'default',
  loadingTitle: '개업 초대장 편집 화면을 준비하고 있습니다.',
  loadingDescription: '기존 설정값을 불러오는 중입니다. 잠시만 기다려 주세요.',
  createLoginTitle: '개업 초대장 만들기는 관리자만 이용 가능합니다',
  createLoginDescription: '관리자 계정으로 로그인한 뒤 새 개업 초대장 생성 화면을 이용해 주세요.',
  createLoginHelper: '개업 초대장 생성은 관리자 권한이 확인된 계정에서만 가능합니다.',
  editLoginTitle: '개업 초대장 편집을 위해 로그인해 주세요',
  editLoginDescription:
    '개업 초대장에 연결된 고객 계정으로 로그인하면 편집 화면을 이용할 수 있습니다.',
  editLoginHelper: '아직 계정에 연결되지 않은 개업 초대장은 관리자에게 계정 연결을 요청해 주세요.',
  ownershipTitle: '관리자에게 개업 초대장 연결을 요청해 주세요',
  ownershipDescription:
    '이 개업 초대장은 현재 계정으로 연동되어 있지 않습니다. 관리자에게 요청된 고객 연동으로만 편집할 수 있습니다.',
  accessTitle: '이 개업 초대장은 현재 계정으로 관리할 수 없습니다.',
  fallbackTitle: '개업 초대장 정보를 확인하고 있습니다.',
  fallbackDescription:
    '다시 시도해 주세요. 로그인 상태와 개업 초대장 연동 상태를 확인해 주세요.',
  myPagesLabel: '내 개업 초대장으로 이동',
  loadErrorMessage: '개업 초대장 정보를 불러오지 못했습니다.',
  saveSuccessMessage: '개업 초대장을 저장했습니다.',
  saveErrorMessage: '개업 초대장 저장에 실패했습니다.',
  unpublishedStatusLabel: '비공개',
};

export function getPageWizardPresentation(eventType: EventTypeKey = DEFAULT_EVENT_TYPE) {
  if (eventType === 'birthday') {
    return BIRTHDAY_PRESENTATION;
  }

  if (eventType === 'first-birthday') {
    return FIRST_BIRTHDAY_PRESENTATION;
  }

  if (eventType === 'general-event') {
    return GENERAL_EVENT_PRESENTATION;
  }

  if (eventType === 'opening') {
    return OPENING_PRESENTATION;
  }

  return WEDDING_PRESENTATION;
}

