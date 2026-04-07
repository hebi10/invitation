# 새 디자인 추가 체크리스트

이 문서는 청첩장 새 디자인(테마) 추가 시 필요한 최소 작업과 검증 항목을 정리합니다.

## 1. 사전 확인

- [ ] 새 테마 key를 확정했다. 예: `modern`, `minimal`
- [ ] URL suffix를 확정했다. 예: `/modern`
- [ ] 기본 테마 여부(`isDefault`)를 확인했다.

## 2. 필수 구현

### 2-1. 테마 레지스트리 등록

- [ ] src/lib/invitationThemes.ts
- [ ] `INVITATION_THEME_REGISTRY`에 새 항목 추가
- [ ] 아래 필드를 모두 채웠다.
  - `key`
  - `label`
  - `adminLabel`
  - `variantLabel`
  - `pathSuffix`
  - `wizardDescription`
  - `shareTitleMode`
  - `documentTitleSuffix`
  - `ariaLabelSuffix`
  - `isDefault`
- [ ] `pathSuffix` 중복이 없다.

### 2-2. 공개 렌더러 추가

- [ ] src/app/_components/themeRenderers/{key}.tsx 파일 생성
- [ ] 기존 렌더러(emotional/simple)와 동일한 prop 계약을 따른다.
- [ ] 로딩/에러/빈 상태를 기존 패턴과 동일하게 처리했다.

## 3. 권장 구현

### 3-1. 편집기 섹션 미리보기 반영

- [ ] src/app/page-editor/PageEditorSectionPreview.tsx
- [ ] `previewThemeProfiles`에 새 테마 프로필 추가
- [ ] 미리보기 라벨, 표면 스타일, 섹션 컴포넌트 매핑을 확인했다.

### 3-2. 디자인 전용 스타일/섹션 보강

- [ ] 새 테마에서 필요한 섹션 스타일을 분리했다.
- [ ] 모바일 우선 기준으로 레이아웃 깨짐이 없는지 확인했다.
- [ ] 접근성(버튼/링크 역할, label, alt)을 확인했다.

## 4. 동작 확인

- [ ] /{slug} 접속 시 defaultTheme 기준으로 올바른 /{slug}/{theme} 경로로 이동한다.
- [ ] /{slug}/{newTheme} 경로가 정상 렌더링된다.
- [ ] Admin 미리보기 링크에 새 테마가 노출된다.
- [ ] Page Editor 미리보기 탭에서 새 테마를 선택할 수 있다.
- [ ] Page Wizard 1단계에서 새 테마를 선택할 수 있다.

## 5. 데이터/호환성 확인

- [ ] Firestore 우선 + fallback 동작을 깨지 않았다.
- [ ] variants 가용성(available/path/displayName) 구조를 깨지 않았다.
- [ ] 기존 테마(emotional/simple) 링크가 회귀하지 않았다.

## 6. 검증 체크리스트

- [ ] npm run lint
- [ ] npx tsc --noEmit
- [ ] npm run build
- [ ] npm run test:e2e:smoke

## 7. 리뷰 포인트

- [ ] 테마 추가를 위해 라우트 파일을 개별 생성하지 않았다. ([slug]/[theme] 동적 라우트 사용)
- [ ] 하드코딩된 테마 분기(if theme === 'simple')가 신규 코드에 남지 않았다.
- [ ] 문구/라벨이 레지스트리 유틸리티를 통해 일관되게 표시된다.
