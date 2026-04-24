# 이벤트 wizard step config

## 목적
- `/page-wizard`가 `eventType`에 따라 step 구성을 바꿀 수 있는 구조를 먼저 만든다.
- 현재는 `wedding`, `birthday`가 실제 생성 경로에 들어갈 수 있고, 이후 `seventieth`, `etc`를 붙일 때 `PageWizardClient`를 크게 갈아엎지 않게 한다.

## 현재 기준 파일
- `src/app/page-wizard/pageWizardData.ts`
- `src/app/page-wizard/PageWizardClient.tsx`
- `src/app/page-wizard/hooks/useWizardPersistence.ts`
- `src/app/page-wizard/steps/EventTypeStep.tsx`

## 현재 구조
- `resolveWizardStepConfig(eventType)`
  - `eventType`를 `defaultWizardStepConfigKey`로 해석한다.
- `getWizardSteps({ eventType, includeSetupSteps, includeMusic })`
  - 새 생성과 기존 수정의 step 목록을 분기한다.

## 현재 step 구성
### 새 생성
- `eventType`
- `theme`
- `slug`
- `basic`
- `schedule`
- `greeting`
- `images`
- `music`
- `extra`
- `final`

### 기존 수정
- `basic`
- `schedule`
- `greeting`
- `images`
- `music`
- `extra`
- `final`

## 현재 정책
- 새 생성에서만 `eventType` 선택 step을 노출한다.
- 기존 수정에서는 `eventType`을 고정한다.
- `slug` step은 초안 생성 전에 한글 이름과 영문 주소용 이름을 함께 받는다.
- 한글 이름은 초안 생성 시 기본 `displayName`/`description`/본문 인물 정보에 바로 반영하고, 영문 이름은 주소 자동 제안값을 만든다.
- 현재 선택 가능한 타입은 `wedding`, `birthday`이고, `seventieth`, `etc`는 UI에 `준비 중`으로만 보인다.
- `birthday`는 PoC 단계라서 현재는 wedding용 본문 step과 문구를 대부분 재사용한다.
- 저장 payload에는 `eventType`을 `InvitationPageSeed`와 event summary/content mirror에 함께 반영한다.

## 저장 경로 반영 위치
- 새 초안 생성
  - `createInvitationPageDraftFromSeed`
  - `createServerInvitationPageDraftFromSeed`
- 임시저장 / 수정 / 발행
  - `saveInvitationPageConfig`
  - `saveServerInvitationPageConfig`
  - client/server event repository content mirror

## 다음 작업
1. `birthday` 전용 기본 정보/문구/본문 step을 wedding과 분리
2. `seventieth`, `etc`용 실제 step 배열 추가
3. `eventType`별 theme/editor 제한 규칙 분리
4. `page-editor`와 결과 화면에도 이벤트 타입 표시 확장
