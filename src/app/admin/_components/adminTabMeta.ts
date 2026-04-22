import type { AdminTab } from './adminPageUtils';

export function getTabLabel(tab: AdminTab) {
  switch (tab) {
    case 'pages':
      return '청첩장';
    case 'memory':
      return '추억 페이지';
    case 'images':
      return '이미지';
    case 'comments':
      return '방명록';
    case 'passwords':
      return '비밀번호';
    case 'periods':
      return '노출 기간';
    default:
      return '관리';
  }
}

export function getTabSummary(tab: AdminTab) {
  switch (tab) {
    case 'pages':
      return {
        title: '청첩장 공개 상태와 연결 상태를 바로 확인합니다.',
        description: '공개 여부, 테마 연결, 데이터 기준을 보고 곧바로 편집기로 이동할 수 있습니다.',
        helper: '핵심 작업: 청첩장 편집',
      };
    case 'memory':
      return {
        title: '청첩장별 추억 페이지 청첩장과 연결 데이터를 불러옵니다.',
        description: '청첩장을 고르면 청첩장, 댓글, 이미지 상태를 한 번에 이어서 관리할 수 있습니다.',
        helper: '핵심 작업: 청첩장 확인 및 공개 상태 조정',
      };
    case 'images':
      return {
        title: '선택한 청첩장의 이미지를 업로드하고 교체합니다.',
        description: '페이지를 고른 뒤 현재 이미지 목록을 확인하고 새 이미지를 추가하거나 삭제할 수 있습니다.',
        helper: '핵심 작업: 이미지 업로드',
      };
    case 'comments':
      return {
        title: '검색과 필터로 댓글을 찾고 삭제할 수 있습니다.',
        description: '페이지, 기간, 검색어 기준으로 방명록을 좁혀 보고 필요한 댓글만 빠르게 정리합니다.',
        helper: '핵심 작업: 댓글 검토 및 삭제',
      };
    case 'passwords':
      return {
        title: '페이지별 고객 비밀번호를 저장하고 편집기로 이동합니다.',
        description: '기본은 숨김 상태로 관리되며, 저장 완료 여부를 확인한 뒤 편집기로 안전하게 열 수 있습니다.',
        helper: '핵심 작업: 비밀번호 저장',
      };
    case 'periods':
      return {
        title: '공개 기간을 설정하고 만료 상태를 관리합니다.',
        description: '곧 종료, 노출 중, 만료 상태를 비교하면서 기간 제한을 바로 수정하거나 해제할 수 있습니다.',
        helper: '핵심 작업: 노출 기간 점검',
      };
    default:
      return {
        title: '현재 탭에 맞는 관리 작업을 진행합니다.',
        description: '필요한 범위만 불러와 빠르게 운영 작업을 이어갈 수 있습니다.',
        helper: '핵심 작업: 관리',
      };
  }
}
