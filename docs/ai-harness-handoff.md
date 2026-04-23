### 진행 요약
- Wedding 테마 등록을 `romantic` 한 개 추가하고, 메타/정책/샘플 URL을 `src/lib/invitationThemes.ts`에 등록했습니다.
- 테마 렌더러 연결을 `src/app/_components/themeRenderers/registry.ts`에 추가하고, 새 렌더러 파일을 새로 작성했습니다.
- `Wedding Invitation.html`의 로맨틱 구성(커버·초대문·날짜·카운트다운·갤러리·지도/안내·선물·방명록)을 프로젝트 공통 데이터에 맞춰 구현했습니다.

### 다음 단계 (최대 3개)
- 웹/모바일 타입체크 및 린트/빌드에서 새 렌더러 타입 오류가 없는지 확인합니다.
- 관리자/클라이언트에서 `romantic` 샘플 URL(표준/디럭스/프리미엄) 접근과 렌더링을 확인합니다.
- 모바일 테마 목록이 `invitationThemes.ts` 기반으로 `romantic`을 정상 노출하는지 확인합니다.

### 완료 파일
- [src/lib/invitationThemes.ts](/c:/Users/gy554/Desktop/portfolio/invitation/src/lib/invitationThemes.ts)
- [src/app/_components/themeRenderers/registry.ts](/c:/Users/gy554/Desktop/portfolio/invitation/src/app/_components/themeRenderers/registry.ts)
- [src/app/_components/themeRenderers/romantic.tsx](/c:/Users/gy554/Desktop/portfolio/invitation/src/app/_components/themeRenderers/romantic.tsx)
- [src/app/_components/themeRenderers/romantic.module.css](/c:/Users/gy554/Desktop/portfolio/invitation/src/app/_components/themeRenderers/romantic.module.css)