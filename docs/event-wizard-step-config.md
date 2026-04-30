# 이벤트 wizard step config

## 목적
- `/page-wizard`가 `eventType`에 따라 단계 제목, 설명, 필수 검증, 입력 컴포넌트를 바꾼다.
- 저장 schema는 기존 `InvitationPageSeed`를 유지하고, 이벤트별 adapter/문구로 사용자 입력 경험을 분리한다.

## 현재 기준 파일
- `src/app/page-wizard/pageWizardData.ts`
- `src/app/page-wizard/PageWizardClient.tsx`
- `src/app/page-wizard/PageWizardStepPreview.tsx`
- `src/app/page-wizard/steps/SlugStep.tsx`
- `src/app/page-wizard/steps/BirthdayBasicStep.tsx`
- `src/app/page-wizard/steps/BirthdayScheduleStep.tsx`
- `src/app/page-wizard/steps/BirthdayGreetingStep.tsx`

## general-event step 구성
### 새 생성
- `eventType`: 이벤트 타입 선택
- `theme`: 디자인과 상품 선택
- `slug`: 행사명과 페이지 주소 설정
- `basic`: 행사 기본 정보
- `schedule`: 행사 일정과 장소
- `greeting`: 초대의 글
- `images`: 이미지/공유 정보
- `extra`: 추가 안내
- `final`: 최종 확인

### 기존 수정
- `basic`
- `schedule`
- `greeting`
- `images`
- `extra`
- `final`

## birthday step 구성
### 새 생성
- `eventType`: 이벤트 타입 선택
- `theme`: 디자인과 상품 선택
- `slug`: 페이지 주소 설정
- `basic`: 생일 주인공 정보
- `schedule`: 파티 일정과 장소
- `greeting`: 초대 문구
- `images`: 사진
- `music`: 배경음악
- `extra`: 추가 안내
- `final`: 최종 확인

### 기존 수정
- `basic`
- `schedule`
- `greeting`
- `images`
- `music`
- `extra`
- `final`

## birthday 입력 매핑
- `BirthdayBasicStep`
  - 생일 주인공 이름을 `couple.groom.name`, `groomName`, `displayName`, `pageData.greetingAuthor`에 반영한다.
  - `couple.bride.name`, `brideName`은 비워 wedding 문구가 섞이지 않게 한다.
- `BirthdayScheduleStep`
  - 기존 `weddingDateTime`을 파티 날짜/시간으로 사용한다.
  - 장소명은 `venue`, `pageData.venueName`, `pageData.ceremony.location`에 맞춘다.
- `BirthdayGreetingStep`
  - `pageData.greetingMessage`를 초대 문구로 사용한다.
  - 생일 전용 템플릿은 `BIRTHDAY_GREETING_TEMPLATES`에 둔다.

## 검증 정책
- general-event slug 단계는 행사명과 주소 영문 키워드만 필수로 본다.
- general-event 기본 정보 단계는 `displayName`을 행사명으로 필수 검증한다.
- general-event 일정 단계는 기존 `weddingDateTime`, `venue`, `pageData.ceremonyAddress`, `pageData.kakaoMap` 공통 검증을 재사용한다.
- birthday slug 단계는 생일 주인공 한글 이름과 영문 표기만 필수로 본다.
- birthday 기본 정보 단계는 `couple.groom.name`만 필수로 본다.
- birthday 일정 단계는 날짜/시간, 파티 장소명, 주소, 지도 좌표를 기존 공통 검증으로 확인한다.
- birthday 인사말 단계는 메시지를 `초대 문구`로 안내한다.

## 남은 작업
1. birthday theme 선택값을 저장하는 명시 필드 추가 여부 결정
2. page-editor도 birthday 문구로 분리
3. general-event 프로그램 편집 step과 RSVP 저장 흐름 추가
