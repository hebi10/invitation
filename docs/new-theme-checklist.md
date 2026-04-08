# 새 테마 추가 체크리스트

현재 테마 시스템은 `emotional`, `simple` 두 개를 기준으로 동작합니다.
새 테마를 추가할 때는 아래 순서대로 확인합니다.

## 1. 테마 레지스트리 등록

- `src/lib/invitationThemes.ts`
  - `key`, `label`, `adminLabel`, `variantLabel`
  - `pathSuffix`
  - `shareTitleMode`
  - `documentTitleSuffix`, `ariaLabelSuffix`
  - 기본 테마 여부(`isDefault`)

`/{slug}`는 실제 페이지가 아니라 redirect 전용이므로, 새 테마를 추가해도 실제 공개 라우트는 `/{slug}/{theme}` 형태여야 합니다.

## 2. 실제 렌더러 구현

- `src/app/_components/themeRenderers/{theme}.tsx`
  - 로더
  - 섹션 구성
  - 테마 전용 스타일 / 섹션 조합

- `src/app/_components/WeddingInvitationPage.tsx`
  - 렌더러 import
  - `themeRendererByKey` 매핑 추가

- `src/app/_components/weddingThemes.ts`
  - 공유 제목 / 접근성 suffix / 문서 제목 suffix 확인

## 3. Variant / 편집기 연결 확인

- `src/lib/invitationVariants.ts`
  - 새 테마 path와 displayName이 기대대로 생성되는지 확인

- `src/app/page-editor/PageEditorClient.tsx`
  - 미리보기 링크와 테마 전환 UI 확인

- `src/app/page-wizard/steps/ThemeStep.tsx`
  - 신규 테마 선택 UI와 설명 노출 확인

## 4. 데이터 / 공유 / SEO 확인

- `src/lib/invitationThemePageData.ts`
  - 테마별 pageData override가 필요한지 확인

- `src/app/_components/WeddingInvitationPage.tsx`
  - canonical, `og:url`, 공유 URL이 실제 테마 경로를 가리키는지 확인

- `src/app/[slug]/page.tsx`
  - `defaultTheme` redirect가 새 테마와 충돌하지 않는지 확인

## 5. 검증

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- 실제 확인
  - `/{slug}` redirect
  - `/{slug}/{theme}` 렌더링
  - 카카오 공유 링크
  - canonical / OG URL
  - 모바일 / 데스크톱 레이아웃
