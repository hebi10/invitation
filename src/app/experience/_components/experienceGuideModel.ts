export type ExperienceGuideStep = {
  id: string;
  stage: string;
  title: string;
  description: string;
  tasks: string[];
  action: string;
};

const steps: Record<string, ExperienceGuideStep> = {
  customer: {
    id: 'customer', stage: '고객 화면', title: '고객이 청첩장을 완성하는 과정을 체험해 보세요',
    description: '체험용 초대장에 이름, 예식 정보, 인사말과 사진을 미리 준비했습니다. 처음부터 모두 입력하지 않아도 됩니다.',
    tasks: ['목록의 초대장에서 「내용 수정」을 눌러 편집 화면을 여세요.', '기본 정보부터 사진까지 확인하고 저장한 뒤, 완성된 청첩장을 열어볼 수 있습니다.'],
    action: '안내 닫고 초대장 선택',
  },
  basic: {
    id: 'basic', stage: '내용 입력 · 기본 정보', title: '미리 입력한 두 분의 이름을 확인해 주세요',
    description: '고객은 연결된 초대장의 내용을 수정합니다. 주소와 디자인을 정하는 시작 설정은 관리자가 담당합니다.',
    tasks: ['신랑·신부 이름을 확인해 주세요. 샘플 이름을 그대로 두어도 됩니다.', '이름을 바꿔 보고 싶다면 실제 이름 대신 가상의 이름을 입력하세요. 확인 후 아래 「저장 후 다음」을 누르세요.'],
    action: '안내 닫고 기본 정보 확인',
  },
  schedule: {
    id: 'schedule', stage: '내용 입력 · 일정과 장소', title: '예식 일정과 지도를 함께 확인해 보세요',
    description: '날짜, 시간과 예식장 주소도 샘플로 입력되어 있습니다. 주소를 새로 검색하지 않아도 체험을 이어갈 수 있습니다.',
    tasks: ['예식 날짜·시간과 예식장 이름을 확인하고, 아래 지도에서 선택된 위치를 보세요.', '필요하면 예식 시간이나 상세 안내를 바꿔 보세요. 확인을 마치면 「저장 후 다음」을 누르세요.'],
    action: '안내 닫고 일정 확인',
  },
  greeting: {
    id: 'greeting', stage: '내용 입력 · 인사말과 관계 정보', title: '초대하는 마음을 한 문장 더해 보세요',
    description: '초대 문구와 관계 정보를 미리 채웠습니다. 실제 개인정보를 추가하지 않고도 저장과 반영 과정을 확인할 수 있습니다.',
    tasks: ['인사말 끝에 「함께해 주셔서 감사합니다.」를 추가해 보세요.', '관계 정보는 샘플 값을 유지하고 「저장 후 다음」을 누르세요.'],
    action: '안내 닫고 인사말 수정',
  },
  media: {
    id: 'media', stage: '내용 입력 · 사진과 부가 기능', title: '사진을 바꾸고 실제 디자인으로 확인해 보세요',
    description: '대표 사진과 갤러리를 미리 준비했습니다. 체험에서는 제공된 샘플 사진을 선택할 수 있습니다.',
    tasks: ['「체험용 샘플 이미지」에서 다른 사진을 선택해 대표 이미지의 변화를 확인해 보세요.', '미리보기로 배치를 확인한 뒤 닫으세요. 사진과 추가 안내를 확인하고 「저장 후 다음」을 누르세요.'],
    action: '안내 닫고 사진 확인',
  },
  review: {
    id: 'review', stage: '내용 입력 · 검토 및 저장', title: '입력 내용을 확인하고 저장해 주세요',
    description: '이 안내를 닫는 것만으로 저장되지는 않습니다. 화면의 실제 저장 버튼을 눌러야 변경 내용이 반영됩니다.',
    tasks: ['검토 화면에서 이름, 일정과 필수 항목을 확인해 주세요. 오류가 있으면 해당 항목으로 돌아가 수정하세요.', '고객 화면의 「내용 저장 완료」를 누르세요. 관리자 역할에서는 현재 공개 상태에 맞는 저장 버튼이 표시됩니다. 처리 중에는 잠시 기다려 주세요.'],
    action: '안내 닫고 저장 확인',
  },
  result: {
    id: 'result', stage: '저장 결과', title: '저장 결과에서 청첩장을 열어 보세요',
    description: '이 화면은 서버에서 저장 결과를 불러와 보여줍니다. 같은 초대장을 다시 편집하면 기존 내용이 갱신됩니다.',
    tasks: ['저장된 이름과 일정, 저장 시간을 확인해 주세요.', '「청첩장 열기」를 눌러 선택한 디자인에 입력 내용이 반영되었는지 확인하세요.'],
    action: '안내 닫고 청첩장 열기',
  },
  preview: {
    id: 'preview', stage: '완성된 청첩장', title: '하객에게 보이는 화면을 확인해 보세요',
    description: '실제 청첩장 디자인에 저장한 내용이 반영된 화면입니다. 아래로 스크롤하며 직접 살펴보세요.',
    tasks: ['대표 사진, 인사말과 예식 정보를 확인하고 갤러리 사진을 옆으로 넘겨 보세요.', '화면 확인을 마치면 상단 「관리자」를 눌러 이벤트·고객 관리 기능도 체험할 수 있습니다.'],
    action: '안내 닫고 청첩장 둘러보기',
  },
  admin: {
    id: 'admin', stage: '추가 체험 · 관리자', title: '제작 후 운영하는 화면도 둘러보세요',
    description: '고객 입력뿐 아니라 이벤트 조회, 디자인 확인과 고객 연결을 관리하는 화면도 구성했습니다.',
    tasks: ['이벤트 목록에서 이름을 눌러 상세 화면을 여세요. 디자인, 공개·노출, 고객 연결 탭을 확인할 수 있습니다.', '새 이벤트를 반복해서 만들기보다 기존 체험 이벤트를 열어 확인해 주세요. 상단 「고객」을 누르면 고객 화면으로 돌아갑니다.'],
    action: '안내 닫고 관리자 둘러보기',
  },
  setup: {
    id: 'setup', stage: '관리자 · 시작 설정', title: '초대장 생성은 관리자가 담당합니다',
    description: '기본 체험 흐름에는 이미 준비된 초대장이 있습니다. 새로 생성하지 않아도 고객 입력부터 완성 화면까지 확인할 수 있습니다.',
    tasks: ['새 초대장을 만들 때는 행사 종류, 디자인과 주소를 확인하고 고객 연결 정보를 설정하세요.', '「초대장 생성」은 한 번만 누르고 결과를 기다려 주세요. 기존 초대장은 목록에서 다시 열어 편집할 수 있습니다.'],
    action: '안내 닫고 시작 설정 확인',
  },
};

export function resolveExperienceGuideStep(
  pathname: string,
  state: { wizardStep?: string | null; customerReady?: boolean; resultReady?: boolean; previewReady?: boolean },
): ExperienceGuideStep | null {
  if (pathname.startsWith('/experience/my-invitations')) return state.customerReady ? steps.customer : null;
  if (pathname.startsWith('/experience/preview/')) return state.previewReady ? steps.preview : null;
  if (pathname.startsWith('/experience/admin')) return steps.admin;
  if (!pathname.startsWith('/experience/page-wizard')) return null;
  if (/\/result\/?$/.test(pathname)) return state.resultReady ? steps.result : null;
  const mapping: Record<string, string> = {
    eventType: 'setup', theme: 'setup', slug: 'setup', basic: 'basic', schedule: 'schedule', venue: 'schedule',
    greeting: 'greeting', images: 'media', music: 'media', extra: 'media', final: 'review',
  };
  return state.wizardStep ? steps[mapping[state.wizardStep]] ?? null : null;
}
