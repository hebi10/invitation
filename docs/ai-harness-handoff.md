### Commit 메시지
- 최신 기준: `Refactor theme extension flow around shared registry`

### 작업 요약
1. 공통 테마 registry와 정책 분리
   - `src/lib/invitationThemes.ts`를 기준으로 웹/모바일이 같은 theme key, label, preview, 정렬 정보를 보도록 통합했다.
   - 판매 정책은 metadata와 분리해 `isDefault`, `isPurchasable`, `allowsAdditionalPurchase`, `isSelectableAtCreation` 같은 규칙을 별도 계산하게 정리했다.
   - 모바일 `content.ts`, manage 라벨, deep link 진입, 생성 화면 목록도 shared registry와 정책 getter를 사용하도록 바꿨다.
2. Expo 확장 구조를 linkedThemes/selectedTargetTheme 기반으로 정리
   - `linkedInvitationCards.ts`를 `linkedThemes` 배열 중심 구조로 바꾸고 normalize, 저장/복원, preview URL 계산을 N개 테마 기준으로 재구성했다.
   - `useTicketOperations.ts`, `TicketUsageModal.tsx`, `manage.tsx`, `useLinkedInvitationManager.ts`는 `alternateTheme` 같은 2테마 전제를 제거하고 현재 테마/연결된 테마/구매 가능 테마/선택 대상 테마로 흐름을 통일했다.
   - deep link와 linked card 정규화는 순수 로직 파일로 분리해 테스트와 재사용이 가능하게 했다.
3. Next 렌더러 연결과 확장 검증 기준 정리
   - `WeddingInvitationPage.tsx`는 renderer lookup만 하도록 단순화하고, 실제 연결은 `src/app/_components/themeRenderers/registry.ts`에서 관리하도록 분리했다.
   - `scripts/validate-theme-extension.mts`, `docs/theme-extension-test-plan.md`, `npm run validate:theme-extension`를 추가해 registry 추가 후 wizard/manage/ticket/deep link/preview 경로를 자동 및 수동으로 검증할 수 있게 했다.
   - 검증: `npm run validate:theme-extension`, `npm --prefix apps/mobile run typecheck`, `npm --prefix apps/mobile run lint`, `npm run lint`, `npx tsc --noEmit`, `npm run build`

### 남은 작업
1. 실제 3번째 테마 dry-run
   - 현재 상태: 자동 검증은 현재 등록 테마 수 기준으로 통과한다.
   - 남은 이유: 실제 3번째 테마를 registry에 추가해 end-to-end로 돌려보진 않았다.
   - 다음 작업 권장: 샘플 테마 1개를 임시 추가하고 `--expected-theme-count=3`로 wizard/manage/ticket/deep link를 확인한다.
2. Expo 런타임 스모크 테스트
   - 현재 상태: static/type/build 검증은 모두 통과했다.
   - 남은 이유: `expo start`, 실기기, EAS build에서 shared registry import와 다중 preview 동작을 직접 확인하지 못했다.
   - 다음 작업 권장: manage 화면, preview modal, ticket modal, deep link 진입을 기기에서 점검한다.
3. 모바일 업로드/정책 실기기 마감
   - 현재 상태: 업로드 cleanup, 포맷 보존 경로, 권한 UX, 개인정보처리방침 페이지까지 반영돼 있다.
   - 남은 이유: 대표 이미지/갤러리 업로드 실기기 검증과 개인정보처리방침 문의 채널 최종 확정이 남아 있다.
   - 다음 작업 권장: 실기기 업로드 확인 후 문의 이메일 또는 전용 문의 URL을 개인정보처리방침에 반영한다.
