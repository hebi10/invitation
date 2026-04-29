# Expo Impact Assessment

## 목적
- `events` 저장소 계층 전환 이후에도 Expo 앱이 기존과 같은 동작을 유지하는지 확인한다.
- Expo는 가능하면 API 소비자 역할만 유지하고, 서버 호환 계층으로 흡수 가능한 변경은 서버에서 처리한다.
- 모바일 앱 수정은 계약이 실제로 바뀌는 지점에만 최소 범위로 적용한다.

## 결론
- Expo는 기존 페이지 비밀번호 로그인 대신 Firebase 고객 로그인과 owner session을 사용한다.
- 모바일 생성은 한글/영문 이름, 자동 주소 제안, Firebase UID 기반 소유권 연결을 기준으로 동작한다.
- 운영/방명록/링크 토큰 흐름은 `apps/mobile/src/lib/api.ts`를 통해 서버 응답을 소비한다.
- 단, 향후 `slug redirect`나 canonical slug 교체를 실제 운영에 열면 최근 연동 카드와 재연동 흐름은 최소 수정이 필요할 수 있다.

## 점검 범위
- 로그인: `apps/mobile/src/app/login.tsx`, `apps/mobile/src/contexts/AuthContext.tsx`
- 생성: `apps/mobile/src/features/create/hooks/useCreateForm.ts`, `apps/mobile/src/lib/api.ts`
- 운영: `apps/mobile/src/contexts/InvitationOpsContext.tsx`, `apps/mobile/src/features/screens/manage.tsx`
- 방명록 관리: `apps/mobile/src/features/manage/hooks/useGuestbook.ts`
- 링크 기반 진입: `apps/mobile/src/lib/appDeepLink.ts`, `apps/mobile/src/contexts/AuthContext.tsx`
- 최근 연동 목록: `apps/mobile/src/features/manage/hooks/useLinkedInvitationManager.ts`, `apps/mobile/src/features/login/components/RecentLinkedInvitationsSection.tsx`, `apps/mobile/src/lib/linkedInvitationCardsModel.ts`

## API 계약 점검
| 영역 | Expo 소비 지점 | 서버 계약 | 판정 |
| --- | --- | --- | --- |
| 고객 로그인 | `loginMobileCustomerAuth`, `AuthContext.loginCustomer` | Firebase 고객 auth session | 변경 반영 |
| 링크 로그인 | `exchangeMobileClientEditorLinkToken`, `AuthContext.loginWithLinkToken` | owner session 응답 | 유지 |
| 세션 복원 | `validateMobileClientEditorSession`, `activateStoredSession` | `MobileSessionResponse` 유지 | 유지 |
| 생성 | `createMobileInvitationDraft`, `fulfillMobileBillingPageCreation` | `MobileInvitationCreationResponse` 유지 | 유지 |
| 운영 대시보드 | `fetchMobileInvitationDashboard`, `InvitationOpsContext` | `MobileInvitationDashboard` 유지 | 유지 |
| 청첩장 저장 | `saveMobileInvitationPageConfig`, `setPublishedState`, `setVariantAvailability` | `{ success: true }`와 기존 page slug 기반 요청 유지 | 유지 |
| 방명록 관리 | `manageMobileInvitationComment` | `{ success, comment }` 유지 | 유지 |
| 링크 토큰 | `issueMobileClientEditorLinkToken`, `revokeMobileClientEditorLinkTokens` | 발급/폐기 응답 유지 | 유지 |
| 딥링크 진입 | `resolveAppDeepLink`, `login.tsx` | `/login?linkToken=...` 유지 | 유지 |

## 화면 / 상태 영향 목록
### 현재 반영된 항목
- 로그인 화면
  - Firebase 고객 로그인과 앱 연동 링크 진입만 사용한다.
- 생성 화면
  - 서버는 `slugBase`, 신랑/신부 한글 이름, 영문 이름, 테마, 고객 ID token을 받는다.
  - 생성 완료 시 이벤트 `ownerUid`를 연결해 PC `/my-invitations`에서도 보이게 한다.
- 운영 화면
  - `dashboard.page`, `ticketCount`, `displayPeriod`, `permissions`, `links` 형식을 그대로 사용한다.
- 방명록 관리
  - `hide`, `scheduleDelete`, `restore` 액션과 댓글 상태 필드를 그대로 사용한다.
- 링크 기반 진입
  - `linkToken -> loginWithLinkToken -> MobileLoginResponse -> /manage` 흐름이 유지된다.

### 관찰 필요하지만 지금 수정하지 않는 항목
- 최근 연동 목록
  - 카드 모델은 `slug`, `publicUrl`, `session`, `linkedThemes`를 로컬에 저장한다.
  - 서버가 기존 모바일 응답 DTO를 유지하므로 현재는 그대로 동작한다.
- 운영 화면 문구
  - 일부 화면과 notice는 내부 식별자 fallback으로 `slug`를 보여줄 수 있다.
  - 기능 문제는 아니지만 향후 사용자 노출 용어를 더 줄이고 싶으면 별도 UX 작업으로 정리한다.

### 향후 수정 후보
- `apps/mobile/src/lib/linkedInvitationCardsModel.ts`
  - 현재 `canActivateLinkedInvitationCard`는 `card.session.pageSlug === card.slug`를 전제로 한다.
  - 나중에 slug 변경, alias, redirect를 실제 운영 기능으로 열면 이 전제가 깨질 수 있다.
- `apps/mobile/src/features/manage/hooks/useLinkedInvitationManager.ts`
  - 저장된 카드의 `slug`와 세션의 canonical slug가 달라질 수 있는 미래 시나리오를 아직 처리하지 않는다.
  - slug 변경을 허용할 때는 세션 검증 응답으로 카드 slug를 재정렬하거나, 카드 key를 `eventId` 기준으로 바꾸는 작업이 필요하다.

## 최소 수정 판단
- 현재 단계:
  - Expo 코드 수정 없이 서버 호환 계층만으로 유지 가능
- slug 변경/redirect 도입 이후:
  - 최근 연동 카드 모델
  - 세션 재활성화 조건
  - 딥링크 후 canonical slug 반영
  이 세 부분만 최소 수정 후보로 본다.

## 권장 운영 기준
1. 서버는 계속 기존 모바일 응답 DTO를 유지한다.
2. Expo는 `apps/mobile/src/lib/api.ts` 외부에서 endpoint 세부 구조를 직접 알지 않게 유지한다.
3. `eventId`는 Expo에 노출하지 않고, 모바일은 계속 `slug`와 토큰 기반으로만 동작시킨다.
4. slug redirect를 열기 전에는 최근 연동 카드 활성화 규칙을 먼저 손본다.
