# Expo 수동 QA 결과

## 목적
- Expo 모바일 앱의 로그인, 생성, 운영, 고위험 작업, 기존 데이터 연동이 현재 코드 기준으로 기존 동작과 동일하게 유지되는지 정리한다.
- 이 환경에서 직접 실기기 조작은 불가능하므로, 자동 검증 결과와 코드 경로 점검 결과를 나눠 기록한다.

## 이번 확인 범위
- 자동 검증
  - `npm run typecheck:mobile`
  - `npm run lint:mobile`
- 참고 검증
  - `npm run qa:event-rollout`
- 코드 경로 확인
  - `apps/mobile/src/app/login.tsx`
  - `apps/mobile/src/contexts/AuthContext.tsx`
  - `apps/mobile/src/contexts/InvitationOpsContext.tsx`
  - `apps/mobile/src/features/create/hooks/useCreateForm.ts`
  - `apps/mobile/src/features/manage/hooks/useGuestbook.ts`
  - `apps/mobile/src/features/manage/hooks/useLinkedInvitationManager.ts`
  - `apps/mobile/src/features/manage/hooks/useTicketOperations.ts`
  - `apps/mobile/src/lib/api.ts`
  - `src/app/api/mobile/client-editor/login/route.ts`
  - `src/server/clientPasswordServerService.ts`
  - `src/server/repositories/eventRepository.ts`
  - `src/server/repositories/eventSecretRepository.ts`

## 자동 검증 결과
- `npm run typecheck:mobile`: 정상
- `npm run lint:mobile`: 정상
- `npm run qa:event-rollout`: 오류
  - Expo 전용 오류는 아니고, 서버 경계 검사 `test:api-repository-boundary`가 실패했다.
  - 실패 위치
    - `src/server/adminEventDeletionService.ts`
    - `src/server/adminUserServerService.ts`

## 2-1. 로그인 흐름 확인
| 항목 | 판정 | 근거 |
| --- | --- | --- |
| 일반 로그인 | 정상 | `login.tsx` -> `AuthContext.login` -> `loginMobileClientEditor` -> `/api/mobile/client-editor/login` 경로가 유지되고, 모바일 typecheck/lint 통과 |
| 최근 연동 목록 확인 | 정상 | `login.tsx`, `useLinkedInvitationManager.ts`에서 저장된 세션/카드 조회 및 재활성화 경로 유지 |
| 앱 연동 링크 진입 확인 | 애매함 | `login.tsx`에서 `linkToken` 처리, `AuthContext.loginWithLinkToken`, `appDeepLink.ts` 경로는 존재하지만 실기기 deep link 탭 동작은 미확인 |

## 2-2. 생성 흐름 확인
| 항목 | 판정 | 근거 |
| --- | --- | --- |
| 주소 입력 | 정상 | `useCreateForm.ts`에서 slug 정규화/중복 확인/미리보기 경로 유지 |
| 생성 요청 | 정상 | `createInvitationPage`와 `createMobileInvitationDraft`, `fulfillMobileBillingPageCreation` 호출 구조 유지 |
| 결제 전 응답 확인 | 애매함 | 코드상 경로는 있으나 실제 Google Play 결제 전 단계 응답은 실기기 미검증 |
| 결제 후 응답 확인 | 애매함 | `purchaseBillingProduct` -> `fulfillMobileBillingPageCreation` 흐름은 있으나 실제 결제 완료 응답 미검증 |
| 생성 직후 운영 화면 진입 확인 | 애매함 | `useCreateForm.ts`에서 성공 시 `router.replace('/manage')`를 호출하지만 실제 화면 전환은 미확인 |

## 2-3. 운영 흐름 확인
| 항목 | 판정 | 근거 |
| --- | --- | --- |
| 공개 상태 변경 | 정상 | `InvitationOpsContext.setPublishedState`와 고위험 토큰 전달 구조 유지 |
| 방명록 관리 | 정상 | `useGuestbook.ts`와 `InvitationOpsContext.manageComment`에서 `hide`, `scheduleDelete`, `restore` 경로 유지 |
| 이미지 업로드 | 애매함 | `api.ts`와 이미지 route 경로는 있으나 실제 업로드/스토리지 응답 미검증 |
| 이미지 삭제 | 애매함 | 삭제 API 경로는 유지되지만 실제 파일 정리 결과 미검증 |
| 링크 복사 | 애매함 | 관련 경로는 유지되지만 기기 clipboard/공유 UI는 미검증 |
| 앱 다시 열기 동작 확인 | 애매함 | `mobileinvitation://manage` deep link는 존재하지만 OS 레벨 동작 미확인 |

## 2-4. 고위험 작업 확인
| 항목 | 판정 | 근거 |
| --- | --- | --- |
| 재인증 모달 | 정상 | `AuthContext.runHighRiskAction` + `HighRiskActionModal` + `/api/mobile/client-editor/high-risk/verify` 경로 유지 |
| 링크 재발급 | 정상 | `manage.tsx`에서 `issueMobileClientEditorLinkToken`, `revokeMobileClientEditorLinkTokens`와 재인증 래핑 유지 |
| 티켓 관련 작업 | 애매함 | `useTicketOperations.ts`에서 연장/구매/이동 경로는 있으나 실제 실기기 수행 결과 미검증 |

## 2-5. 기존 데이터 확인
| 항목 | 판정 | 근거 |
| --- | --- | --- |
| 예전에 만든 페이지가 정상 조회되는지 확인 | 정상 | 현재 서버 로그인/세션/대시보드 경로가 `events` 저장소 기준으로 연결되어 있고 legacy 컬렉션 제거 후 구조를 사용 |
| `events` 기준 조회 확인 | 정상 | `resolveStoredEventBySlug`와 관련 repository가 `events/{eventId}`를 기준으로 조회 |
| `eventSlugIndex` 기준 slug 연결 확인 | 정상 | slug 해석이 `eventSlugIndex` -> `eventId` -> `events` 흐름으로 정리됨 |
| `eventSecrets` 기준 인증 연결 확인 | 정상 | 모바일 로그인과 고위험 인증이 `verifyServerClientPassword` -> `eventSecretRepository` 경로를 사용 |

## 2-6. QA 결과 정리
### 정상
- 모바일 타입체크와 린트는 통과했다.
- 일반 로그인, 최근 연동 목록, 주소 입력, 생성 요청 구조, 공개 상태 변경, 방명록 관리, 재인증 모달, 링크 재발급, 기존 데이터의 `events`/`eventSlugIndex`/`eventSecrets` 경로는 코드 기준으로 정상이다.

### 오류
- `npm run qa:event-rollout`가 실패한다.
- 원인: `test:api-repository-boundary`에서 아래 파일의 direct Firestore 접근이 남아 있다.
  - `src/server/adminEventDeletionService.ts`
  - `src/server/adminUserServerService.ts`

### 애매함
- 실기기/실브라우저 조작이 필요한 항목
  - 앱 연동 링크 진입
  - 결제 전/후 응답
  - 생성 직후 운영 화면 진입
  - 이미지 업로드/삭제
  - 링크 복사
  - 앱 다시 열기
  - 티켓 관련 작업

## 수정 필요 TODO
1. `qa:event-rollout`를 깨는 서버 direct Firestore 접근을 repository 경유로 정리
2. 실기기에서 아래를 최소 1회 수동 확인
   - 앱 연동 링크 탭 진입
   - 생성 -> 결제 -> `/manage` 진입
   - 이미지 업로드/삭제
   - 티켓 연장/이동
3. 수동 QA가 끝나면 이 문서의 `애매함` 항목을 `정상/오류`로 재분류
