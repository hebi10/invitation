const DIRECT_ERROR_MESSAGE_MAP: Record<string, string> = {
  'Invitation page config is invalid.': '청첩장 설정 형식이 올바르지 않습니다.',
  'Invitation page config is required.': '저장할 청첩장 설정 정보가 필요합니다.',
  'Invitation page was not found.': '청첩장 페이지를 찾을 수 없습니다.',
  'Failed to update the invitation page.': '청첩장 정보를 업데이트하지 못했습니다.',
  'A valid invitation page slug is required.': '올바른 페이지 주소가 필요합니다.',
  'A valid URL slug base is required.': '올바른 페이지 주소를 입력해 주세요.',
  'Unknown invitation page slug.': '해당 페이지 주소를 찾을 수 없습니다.',
  'Unknown invitation page seed.': '청첩장 기본 템플릿을 찾을 수 없습니다.',
  'Invitation page seed was not found.': '청첩장 기본 템플릿을 찾을 수 없습니다.',
  'Groom and bride names are required.': '신랑과 신부 이름을 모두 입력해 주세요.',
  'Page slug and password are required.': '페이지 주소와 비밀번호를 모두 입력해 주세요.',
  'Invalid page password.': '비밀번호가 올바르지 않습니다.',
  'Failed to verify the page password.': '페이지 비밀번호를 확인하지 못했습니다.',
  'Published state is required.': '공개 상태 값이 필요합니다.',
  'Unsupported action.': '지원하지 않는 요청입니다.',
  'Unauthorized.': '편집 권한이 없습니다. 다시 로그인해 주세요.',
  'Request failed.': '요청 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  'Firestore is not available.': '데이터 저장소 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  'Server Firestore is not available.':
    '데이터 저장소 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  'Firestore is not initialized.':
    '데이터 저장소가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.',
  'CLIENT_EDITOR_SESSION_SECRET is required in production.':
    '편집 세션 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요.',
  'Firebase storage initialization timeout':
    '이미지 저장소 연결이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.',
};

export function toUserFacingKoreanErrorMessage(
  error: unknown,
  fallback = '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
) {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  const message = rawMessage.trim();
  if (!message) {
    return fallback;
  }

  const mapped = DIRECT_ERROR_MESSAGE_MAP[message];
  if (mapped) {
    return mapped;
  }

  if (!/[가-힣]/.test(message) && /[A-Za-z]/.test(message)) {
    return fallback;
  }

  return message;
}
