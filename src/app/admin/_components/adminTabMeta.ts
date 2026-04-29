import {
  getPageCategoryMeta,
  getTabLabelForPageCategory,
  isImplementedPageCategory,
  isEventAdminTab,
  type AdminSection,
  type AdminTab,
  type PageCategoryTabKey,
} from './adminPageUtils';

export function getSectionLabel(section: AdminSection) {
  switch (section) {
    case 'customers':
      return '고객 관리';
    case 'events':
      return '이벤트 운영';
    default:
      return '관리';
  }
}

export function getSectionSummary(
  section: AdminSection,
  pageCategory: PageCategoryTabKey = 'invitation'
) {
  switch (section) {
    case 'customers':
      return {
        title: '고객 계정과 청첩장 소유권을 관리합니다.',
        description: '고객 계정 목록과 청첩장 소유권 연결을 한 흐름으로 관리합니다.',
        helper: '현재 제공 기능: 고객 계정 연결 관리',
      };
    case 'events':
      if (!isImplementedPageCategory(pageCategory)) {
        const categoryLabel = getPageCategoryMeta(pageCategory).label;

        return {
          title: `${categoryLabel} 서비스 운영 화면을 준비하고 있습니다.`,
          description: `${categoryLabel} 전용 페이지, 이미지, 메시지, 노출 정책은 서비스별 요구사항에 맞춰 순차적으로 분리할 예정입니다.`,
          helper: `현재 선택 서비스: ${categoryLabel}`,
        };
      }

      return {
        title: '청첩장과 이벤트 운영 데이터를 관리합니다.',
        description: '페이지, 이미지, 방명록, 노출 기간, 추억 페이지까지 운영 작업을 이어서 처리합니다.',
        helper: '핵심 작업: 이벤트 운영',
      };
    default:
      return {
        title: '관리 구조를 확인합니다.',
        description: '고객 관리와 이벤트 운영으로 나눠 필요한 범위만 빠르게 엽니다.',
        helper: '핵심 작업: 관리',
      };
  }
}

export function getTabLabel(
  tab: AdminTab,
  pageCategory: PageCategoryTabKey = 'invitation'
) {
  return getTabLabelForPageCategory(tab, pageCategory);
}

export function getTabSummary(
  tab: AdminTab,
  pageCategory: PageCategoryTabKey = 'invitation'
) {
  if (isEventAdminTab(tab) && !isImplementedPageCategory(pageCategory)) {
    const categoryLabel = getPageCategoryMeta(pageCategory).label;
    const tabLabel = getTabLabelForPageCategory(tab, pageCategory);

    return {
      title: `${tabLabel} 관리 화면은 준비 중입니다.`,
      description: `${categoryLabel} 서비스에 맞는 ${tabLabel} 관리 흐름은 별도 정책과 데이터 구조를 정리한 뒤 연결할 예정입니다.`,
      helper: `현재 선택 서비스: ${categoryLabel}`,
    };
  }

  switch (tab) {
    case 'accounts':
      return {
        title: 'Firebase 로그인 계정과 연결된 청첩장을 한 번에 관리합니다.',
        description: '고객 계정에 현재 연결된 이벤트를 확인하고, 아직 연결되지 않은 청첩장을 바로 연결하거나 해제할 수 있습니다.',
        helper: '핵심 작업: 고객 계정 연결 관리',
      };
    case 'pages':
      return {
        title: '모바일 청첩장 공개 상태와 연결 상태를 바로 확인합니다.',
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
