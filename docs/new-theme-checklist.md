# 신규 테마 확장 체크리스트

## 8-1. invitationThemes.ts를 Source of Truth로 고정
- 신규 테마 키는 `src/lib/invitationThemes.ts`의 `INVITATION_THEME_METADATA_REGISTRY`에서만 등록한다.
- 신규 테마 키는 `INVITATION_THEME_SALES_POLICY_REGISTRY`도 동시에 등록한다.
- `INVITATION_THEME_KEYS`, `INVITATION_THEME_REGISTRY`, `INVITATION_THEME_REGISTRY`는 파생값이므로 개별 화면에서 직접 키 배열을 작성해 등록하지 않는다.
- 금지: 화면 컴포넌트에서 테마 목록을 하드코딩으로 `['emotional','simple']`처럼 직접 작성한다.

## 8-2. 디자인 추가 표준 순서
- 1) 테마 레지스트리 추가
  - `src/lib/invitationThemes.ts`
    - `INVITATION_THEME_METADATA_REGISTRY` 항목 추가
    - `INVITATION_THEME_SALES_POLICY_REGISTRY` 항목 추가
  - `sortOrder`, `pathSuffix`, `preview.sampleUrls` 필수 확인
  - `INVITATION_THEME_KEY` 파생값 정합성 확인

- 2) 공개 페이지 렌더 등록
  - `src/app/_components/themeRenderers/{theme}.tsx` 추가 (새 테마 렌더러)
  - `src/app/_components/themeRenderers/registry.ts`의 `WEDDING_THEME_RENDERER_REGISTRY`에 key/component 추가
  - 새 테마가 `event` 라우트로 사용될 경우 `src/app/_components/eventPageThemes.ts`의 theme definition 매핑 영향 확인
  - `resolveEventPageRenderer`/route 분기 경로에서 미연결 상태는 기본값(`wedding`) 또는 404 정책을 다시 점검

- 3) 샘플 URL 등록
  - `src/lib/invitationThemes.ts`의 `preview.sampleUrls.standard|deluxe|premium`에 공식 샘플 링크 등록
  - 모바일 가이드에서 자동 노출되는 샘플 URL 경로를 `getInvitationThemePreviewSampleUrl`가 읽어오도록 유지

- 4) 가이드/프리뷰/목록 연결
  - 웹: 테마 라벨/설명은 `getInvitationThemeLabel`, `getInvitationThemePreviewDescription`로 렌더링
  - 모바일: `apps/mobile/src/constants/content.ts`의 `designThemes`, `guideSamplePages`가 registry 파생 데이터만 사용하도록 유지
  - 공개/관리 화면에서 테마 노출 텍스트의 라벨/설명/URL이 registry에서 유입되는지 확인

- 5) 모바일 확인
  - `apps/mobile/src/lib/invitationThemes.ts`가 `src/lib/invitationThemes.ts`를 re-export하는지 확인
  - `apps/mobile/src/constants/content.ts`에서 `INVITATION_THEME_KEYS`/`getInvitationThemePreviewSampleUrl`를 통해 목록, 프리뷰, 가이드를 구성하는지 확인
  - 모바일 편집 플로우에서 `themeKey` 검증이 `isInvitationThemeKey` 기반인지 확인

## 8-3. 모바일 중앙 레지스트리 추종 체크리스트
- 중앙 레지스트리 참조가 깨지면 모바일이 즉시 영향받으므로 신규/수정 테마 추가 시 아래 3단계를 의무로 수행한다.
- `apps/mobile/src/lib/invitationThemes.ts`는 re-export 전용으로 유지한다.
- `apps/mobile/src/constants/content.ts`에서 테마 목록을 하드코딩하지 않는다.
- 검색/필터/프리뷰 화면에서 `INVITATION_THEME_KEYS`를 사용하지 않고 문자열 배열을 새로 만들지 않는다.

## 8-4. theme-specific config 분리 초안
- 공통 config
  - `src/lib/invitationThemes.ts`
    - UI 라벨, 경로, SEO suffix, 접근성 라벨, 샘플 URL 기본값
    - 판매 정책(isDefault / selectable / purchasable)
- 테마 전용 config
  - `src/app/_components/themeRenderers/{theme}.tsx`
    - 실제 렌더 컴포넌트, 섹션 구조, CSS class/이미지/애니메이션
  - `src/app/_components/weddingThemes.ts` / `src/app/_components/eventPageThemes.ts`
    - 공유 버튼/메타 처리/테마별 공유 규칙
- 분리 원칙
  - 공통 config 변경은 registry 한 파일에서 끝내고, 테마별 UI/동작 변경만 전용 모듈에 넣는다.
  - 새 테마 추가 시 공통에서의 변경을 먼저 하고 렌더/전용 config은 선택적(기본 렌더 공유 가능)으로 단계적으로 확장한다.
