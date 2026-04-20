### Commit 메시지
- 최신 기준: `Update 모바일 개인정보처리방침 페이지 추가`

### 작업 요약
1. handoff 운영 규칙 정리
   - `AGENTS.md`와 `docs/ai-harness-handoff.template.md`를 맞춰 `docs/ai-harness-handoff.md`를 항상 60줄 이내, 작업 요약/남은 작업은 최대 3개 묶음으로 유지하도록 정리했다.
2. 모바일 업로드 후속 반영
   - `useImageUpload.ts`, `manage.tsx`, `InvitationEditorModalShell.tsx`, `api.ts`, `route.ts`에 multipart 우선 업로드, base64 fallback, 세션 단위 cleanup, 저장 없이 닫기/중간 실패 정리, picker 선권한 제거를 반영했다.
   - 검증: `npm --prefix apps/mobile run typecheck`, `npm --prefix apps/mobile run lint`, `npm run lint`, `npx tsc --noEmit`
3. 개인정보처리방침 및 확장성 리뷰
   - `src/app/privacy/mobile-invitation/page.tsx`, `page.module.css`에 모바일 청첩장용 개인정보처리방침 페이지를 추가했고, Play Console URL은 `https://msgnote.kr/privacy/mobile-invitation/`로 정리했다.
   - 구조 리뷰 기준으로 Next는 `src/lib/invitationThemes.ts`와 `src/lib/invitationVariants.ts` 중심의 테마 등록/선택 흐름은 확장 가능하지만, 실제 렌더러 연결은 `src/app/_components/WeddingInvitationPage.tsx`에서 수동 등록이라 새 디자인 추가 때 결합이 남아 있다.
   - Expo는 `apps/mobile/src/types/mobileInvitation.ts`, `apps/mobile/src/lib/linkedInvitationCards.ts`, `apps/mobile/src/features/manage/hooks/useTicketOperations.ts`, `apps/mobile/src/features/manage/components/TicketUsageModal.tsx`, `apps/mobile/src/features/screens/manage.tsx`에 `emotional`/`simple` 2개 테마 전제가 넓게 퍼져 있어 새 디자인 확장 비용이 높다.

### 남은 작업
1. 실기기 업로드 확인
   - 대표 이미지/갤러리 업로드에서 Blob 오류, `Network request failed`, 저장 취소 cleanup, 다중 업로드 중간 실패 cleanup, PNG/WEBP/JPEG 원본 보존, 권한 `limited`/`denied`/`canAskAgain: false` 시나리오를 실기기에서 확인해야 한다.
2. 개인정보처리방침 문의 채널 확정
   - 현재 정책 페이지에는 임시 문의 경로가 들어가 있으므로 전용 이메일이나 문의 URL이 준비되면 본문과 Play Console 정보를 같은 채널로 교체해야 한다.
3. 테마 확장 구조 정리
   - 웹은 테마 레지스트리와 렌더러 레지스트리를 통합해 새 디자인 추가 시 등록 지점을 한 곳으로 줄이는 작업이 필요하다.
   - 모바일은 theme key, label, preview URL, variant availability, 티켓 구매/전환 로직을 shared registry 기반으로 옮기고 `alternateTheme` 같은 2개 테마 전용 분기를 제거해야 한다.
