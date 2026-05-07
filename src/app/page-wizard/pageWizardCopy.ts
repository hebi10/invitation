import type { EventTypeKey } from '@/lib/eventTypes';

export function getWizardCopy(eventType: EventTypeKey) {
  if (eventType === 'general-event') {
    return {
      itemLabel: '행사 초대장',
      loadingTitle: '행사 초대장 편집 화면을 준비하고 있습니다.',
      createLoginTitle: '행사 초대장 만들기는 관리자만 이용 가능합니다',
      editLoginTitle: '행사 초대장 편집을 위해 로그인해 주세요',
      createLoginDescription:
        '관리자 계정으로 로그인한 뒤 새 행사 초대장 생성 화면을 이용해 주세요.',
      editLoginDescription:
        '행사 초대장에 연결된 고객 계정으로 로그인하면 편집 화면을 이용할 수 있습니다.',
      createLoginHelper: '행사 초대장 생성은 관리자 권한이 확인된 계정에서만 가능합니다.',
      editLoginHelper:
        '아직 계정에 연결되지 않은 행사 초대장은 관리자에게 계정 연결을 요청해 주세요.',
      claimTitle: '관리자에게 행사 초대장 연결을 요청해 주세요',
      claimDescription:
        '이 행사 초대장은 아직 현재 로그인 계정과 연결되어 있지 않습니다. 고객 계정에 연결된 행사 초대장만 편집할 수 있습니다.',
      blockedTitle: '이 행사 초대장은 현재 계정으로 관리할 수 없습니다.',
      listButton: '내 행사 초대장으로 이동',
      emptyTitle: '행사 초대장 정보를 아직 불러오지 못했습니다.',
      emptyDescription:
        '잠시 후 다시 시도하거나 로그인 상태와 행사 초대장 연결 여부를 확인해 주세요.',
      loadError: '행사 초대장 설정을 불러오지 못했습니다.',
      addressRequired: '행사 장소 주소를 먼저 입력해 주세요.',
    };
  }

  if (eventType === 'opening') {
    return {
      itemLabel: '개업 초대장',
      loadingTitle: '개업 초대장 편집 화면을 준비하고 있습니다.',
      createLoginTitle: '개업 초대장 만들기는 관리자만 이용 가능합니다',
      editLoginTitle: '개업 초대장 편집을 위해 로그인해 주세요',
      createLoginDescription: '관리자 계정으로 로그인한 뒤 새 개업 초대장 생성 화면을 이용해 주세요.',
      editLoginDescription: '개업 초대장에 연결된 고객 계정으로 로그인하면 편집 화면을 이용할 수 있습니다.',
      createLoginHelper: '개업 초대장 생성은 관리자 권한이 확인된 계정에서만 가능합니다.',
      editLoginHelper: '아직 계정에 연결되지 않은 개업 초대장은 관리자에게 계정 연결을 요청해 주세요.',
      claimTitle: '관리자에게 개업 초대장 연결을 요청해 주세요',
      claimDescription:
        '이 개업 초대장은 아직 현재 로그인 계정과 연결되어 있지 않습니다. 고객 계정에 연결된 개업 초대장만 편집할 수 있습니다.',
      blockedTitle: '이 개업 초대장은 현재 계정으로 관리할 수 없습니다.',
      listButton: '내 개업 초대장으로 이동',
      emptyTitle: '개업 초대장 정보를 아직 불러오지 못했습니다.',
      emptyDescription:
        '잠시 후 다시 시도하거나 로그인 상태와 개업 초대장 연결 여부를 확인해 주세요.',
      loadError: '개업 초대장 설정을 불러오지 못했습니다.',
      addressRequired: '매장 주소를 먼저 입력해 주세요.',
    };
  }

  return {
    itemLabel: '청첩장',
    loadingTitle: '청첩장 편집 화면을 준비하고 있습니다.',
    createLoginTitle: '청첩장 만들기는 관리자만 이용 가능합니다',
    editLoginTitle: '청첩장 편집을 위해 로그인해 주세요',
    createLoginDescription: '관리자 계정으로 로그인한 뒤 새 청첩장 생성 화면을 이용해 주세요.',
    editLoginDescription:
      '청첩장에 연결된 고객 계정으로 로그인하면 편집 화면을 이용할 수 있습니다.',
    createLoginHelper: '청첩장 생성은 관리자 권한이 확인된 계정에서만 가능합니다.',
    editLoginHelper: '아직 계정에 연결되지 않은 청첩장은 관리자에게 계정 연결을 요청해 주세요.',
    claimTitle: '관리자에게 청첩장 연결을 요청해 주세요',
    claimDescription:
      '이 청첩장은 아직 현재 로그인 계정과 연결되어 있지 않습니다. 고객 계정에 연결된 청첩장만 편집할 수 있습니다.',
    blockedTitle: '이 청첩장은 현재 계정으로 관리할 수 없습니다.',
    listButton: '내 청첩장으로 이동',
    emptyTitle: '청첩장 정보를 아직 불러오지 못했습니다.',
    emptyDescription:
      '잠시 후 다시 시도하거나 로그인 상태와 청첩장 연결 여부를 확인해 주세요.',
    loadError: '청첩장 설정을 불러오지 못했습니다.',
    addressRequired: '예식장 주소를 먼저 입력해 주세요.',
  };
}
