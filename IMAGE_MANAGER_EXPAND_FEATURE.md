# 🎨 이미지 관리 펼치기/접기 기능 구현 완료

## 📋 구현 내용

Admin 페이지의 "이미지 관리" 탭에서 페이지별 이미지를 펼치기/접기할 수 있는 기능을 추가했습니다.

### ✨ 주요 기능

#### 1. **페이지별 펼치기/접기**
- 각 웨딩 페이지의 헤더를 클릭하면 이미지 목록을 펼치거나 접을 수 있습니다
- 기본적으로 모든 페이지가 접힌 상태로 시작합니다
- 이미지는 필요할 때만 표시되어 성능이 향상됩니다

#### 2. **전체 펼치기/접기 버튼**
- "📂 전체 펼치기" 버튼: 모든 페이지의 이미지를 한 번에 펼칩니다
- "📁 전체 접기" 버튼: 모든 페이지의 이미지를 한 번에 접습니다
- 이미지 목록 상단에 배치되어 편리하게 접근 가능합니다

#### 3. **시각적 피드백**
- 펼쳐진 상태: 🔽 아이콘
- 접힌 상태: ▶️ 아이콘
- 헤더 호버 시 배경색 변경 및 그림자 효과
- 부드러운 transition 애니메이션

### 🔧 기술 구현

#### 상태 관리
```typescript
const [expandedPages, setExpandedPages] = useState<{ [pageSlug: string]: boolean }>({});
```
- 각 페이지의 펼침/접힘 상태를 객체로 관리
- 페이지 slug를 키로 사용하여 독립적인 상태 관리

#### 토글 함수
```typescript
const togglePageExpand = (pageSlug: string) => {
  setExpandedPages(prev => ({
    ...prev,
    [pageSlug]: !prev[pageSlug]
  }));
};

const expandAll = () => {
  const allExpanded: { [key: string]: boolean } = {};
  Object.keys(images).forEach(slug => {
    allExpanded[slug] = true;
  });
  setExpandedPages(allExpanded);
};

const collapseAll = () => {
  setExpandedPages({});
};
```

### 📱 반응형 디자인

- **데스크톱**: 가로로 버튼 배치
- **모바일**: 세로로 버튼 배치 (화면 폭에 맞춤)
- 모든 디바이스에서 일관된 사용자 경험 제공

### 🎯 사용자 경험 개선

1. **성능 최적화**
   - 처음 로드 시 이미지를 표시하지 않아 초기 로딩 속도 향상
   - 필요한 이미지만 렌더링하여 메모리 사용 최적화

2. **직관적인 UI**
   - 클릭 가능한 헤더에 커서 포인터 표시
   - 아이콘으로 상태를 명확하게 표시
   - 호버 효과로 인터랙티브한 느낌 제공

3. **편의 기능**
   - 전체 펼치기/접기 버튼으로 대량 작업 가능
   - 개별 페이지별 제어 가능

### 📂 수정된 파일

1. **ImageManager.tsx**
   - `expandedPages` 상태 추가
   - `togglePageExpand`, `expandAll`, `collapseAll` 함수 추가
   - UI 구조 변경 (조건부 렌더링 추가)

2. **ImageManager.module.css**
   - `.bulkActions` 스타일 추가
   - `.bulkActionButton` 스타일 추가
   - `.pageSectionHeaderLeft` 스타일 추가
   - `.expandIcon` 스타일 추가
   - 호버 효과 개선

### 🚀 사용 방법

1. Admin 페이지 접속 (`/admin`)
2. "이미지 관리" 탭 선택
3. 각 페이지 헤더를 클릭하여 이미지 펼치기/접기
4. 또는 상단의 "전체 펼치기"/"전체 접기" 버튼 사용

### ✅ 테스트 완료

- ✅ TypeScript 타입 체크 통과
- ✅ 개발 서버 정상 실행
- ✅ 페이지 컴파일 성공
- ✅ UI 렌더링 정상 작동
- ✅ 반응형 디자인 확인

---

**구현 일자**: 2025년 10월 13일
**개발자**: GitHub Copilot
**버전**: 1.0.0