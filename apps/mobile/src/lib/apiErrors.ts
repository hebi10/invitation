const ERROR_MESSAGE_MAP: Record<string, string> = {
  'Invitation page was not found.': '청첩장 페이지를 찾을 수 없습니다.',
  'Invitation page config is required.': '저장할 청첩장 설정이 필요합니다.',
  'Published state is required.': '공개 상태 값이 필요합니다.',
  'Unsupported action.': '지원하지 않는 요청입니다.',
  'Unauthorized.': '연동 세션이 만료되었습니다. 다시 청첩장을 연동해 주세요.',
  'Forbidden.': '현재 연동 세션으로는 이 작업을 수행할 수 없습니다.',
  'Server Firestore is not available.': '서버 저장소 연결을 확인하지 못했습니다.',
  'Comment was not found.': '댓글을 찾을 수 없습니다.',
  'Comment target was not specified.': '삭제할 댓글 정보를 찾지 못했습니다.',
  'Comment page does not match the requested page.': '댓글과 페이지 정보가 일치하지 않습니다.',
  'Failed to delete comment.': '댓글을 삭제하지 못했습니다.',
  'Comment action is required.': '방명록 처리 방식을 다시 확인해 주세요.',
  'Unsupported comment action.': '지원하지 않는 방명록 처리입니다.',
  'Failed to update comment status.': '방명록 상태를 변경하지 못했습니다.',
  'Too many comment update requests. Please try again later.':
    '방명록 처리 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  'Page slug base is required.': '청첩장 주소를 입력해 주세요.',
  'Groom and bride names are required.': '신랑과 신부 이름을 모두 입력해 주세요.',
  'A valid URL slug base is required.': '사용 가능한 페이지 주소를 다시 확인해 주세요.',
  'Page slug base must be at least 3 characters.': '청첩장 주소는 3자 이상으로 입력해 주세요.',
  'Page slug base must be 40 characters or fewer.': '청첩장 주소는 40자 이하로 입력해 주세요.',
  'Page slug base is reserved.': '이미 예약된 청첩장 주소입니다. 다른 주소를 입력해 주세요.',
  'Invitation page seed was not found.': '초기 청첩장 템플릿을 찾지 못했습니다.',
  'Failed to create invitation page draft.': '청첩장 초안 생성에 실패했습니다.',
  'Invitation page slug does not match the authenticated session.':
    '요청한 청첩장 주소가 현재 로그인 세션과 일치하지 않습니다.',
  'Mobile invitation draft creation is disabled.':
    '모바일 청첩장 생성이 아직 열려 있지 않습니다. 관리자에게 문의해 주세요.',
  'Invitation page draft input is required.':
    '청첩장 생성에 필요한 정보를 모두 입력해 주세요.',
  'Ticket count adjustment amount is required.': '변경할 티켓 수량이 올바르지 않습니다.',
  'Target page slug and session are required.':
    '티켓을 이동할 대상 청첩장 정보를 확인해 주세요.',
  'Transfer ticket count amount is required.': '이동할 티켓 수량이 올바르지 않습니다.',
  'Display period enabled state is required.': '노출 기간 활성화 상태가 올바르지 않습니다.',
  'Display period dates are required.': '노출 기간 시작일과 종료일을 확인해 주세요.',
  'Display period date is invalid.': '노출 기간 날짜 형식이 올바르지 않습니다.',
  'Target page slug must be different.': '현재 청첩장과 다른 연동 페이지를 선택해 주세요.',
  'Target invitation page authorization failed.':
    '대상 청첩장의 연동 정보가 만료되었습니다. 다시 연동해 주세요.',
  'Not enough tickets.': '보유 티켓이 부족합니다.',
  'Recent authentication is required for this action.':
    '민감한 작업이라 로그인 세션을 다시 확인해야 합니다.',
  'Too many high-risk verification attempts. Please try again later.':
    '재인증 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  'Page slug is required.': '청첩장 주소를 다시 확인해 주세요.',
  'Invitation link token is required.': '연동 링크 정보를 다시 확인해 주세요.',
  'Invitation link token is invalid.': '유효하지 않은 앱 연동 링크입니다.',
  'Invitation link token was already used.': '이미 사용한 앱 연동 링크입니다.',
  'Invitation link token has expired.': '만료된 앱 연동 링크입니다. 새 링크를 발급해 주세요.',
  'Invitation link token has been revoked.': '폐기된 앱 연동 링크입니다. 새 링크를 발급해 주세요.',
  'Too many link token requests. Please try again later.':
    '앱 연동 링크 발급 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  'Too many invitation link attempts. Please try again later.':
    '앱 연동 링크 확인 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  'Failed to issue the invitation link token.':
    '앱 연동 링크를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.',
  'Failed to revoke the invitation link token.':
    '앱 연동 링크를 폐기하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  'Failed to exchange the invitation link token.':
    '앱 연동 링크를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  'Image cleanup paths are required.': '정리할 업로드 이미지 경로를 다시 확인해 주세요.',
  'Too many image cleanup paths were requested.':
    '한 번에 정리할 이미지 수가 너무 많습니다. 다시 시도해 주세요.',
  'Image cleanup path is invalid.': '정리할 이미지 경로 형식이 올바르지 않습니다.',
  'Image cleanup path does not belong to the current page.':
    '현재 청첩장에 속한 이미지 경로만 정리할 수 있습니다.',
  'Image storage is not available.':
    '이미지 저장소 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  'Failed to clean up uploaded images.':
    '임시 업로드 이미지를 정리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  'Google Play purchase information is required.':
    'Google Play 결제 정보가 누락되었습니다. 다시 시도해 주세요.',
  'RevenueCat API key is not configured.':
    '결제 검증 설정이 아직 완료되지 않았습니다. 관리자에게 문의해 주세요.',
  'RevenueCat purchase verification failed.':
    'Google Play 결제를 아직 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  'The Google Play purchase could not be verified yet.':
    'Google Play 결제가 아직 검증되지 않았습니다. 잠시 후 다시 시도해 주세요.',
  'The selected Google Play product is not a page creation SKU.':
    '선택한 결제 상품이 페이지 생성용이 아닙니다.',
  'The selected Google Play product is not a ticket pack SKU.':
    '선택한 결제 상품이 티켓 상품이 아닙니다.',
  'This purchase record is already linked to another request.':
    '이미 다른 요청에 사용된 결제 정보입니다.',
  'The created invitation page could not be loaded.':
    '생성한 청첩장 정보를 다시 불러오지 못했습니다.',
  'Firebase Auth API key is not configured.':
    '고객 로그인을 위한 Firebase 설정이 아직 준비되지 않았습니다.',
  'Firebase Admin Auth is not available.':
    '고객 인증을 확인할 수 없습니다. 관리자에게 문의해 주세요.',
  'Customer email and password are required.': '이메일과 비밀번호를 입력해 주세요.',
  'Customer refresh token is required.': '고객 로그인 정보가 만료되었습니다. 다시 로그인해 주세요.',
  'Invalid customer credentials.': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'Customer authentication is required.': '고객 계정으로 로그인한 뒤 다시 진행해 주세요.',
  'Too many login attempts. Please try again later.':
    '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  'Request failed.': '요청 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.',
};

export function toUserFacingApiMessage(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return ERROR_MESSAGE_MAP['Request failed.'];
  }

  if (value.startsWith('Missing mobile client editor permission:')) {
    return '현재 연동 세션으로는 이 작업을 수행할 수 없습니다.';
  }

  return ERROR_MESSAGE_MAP[value] ?? value;
}
