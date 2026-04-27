# Invitation

모바일 청첩장과 추억 페이지를 운영하는 Next.js + Firebase 프로젝트입니다.

현재 프로젝트의 핵심 방향은 아래와 같습니다.

- 공개 청첩장 테마는 `emotional`, `simple` 2가지를 사용합니다.
- 공개 URL은 `/{slug}/emotional`, `/{slug}/simple`를 실제 경로로 사용하고, `/{slug}`는 `/{slug}/{defaultTheme}`로 리다이렉트합니다.
- 공개 청첩장은 `Firestore 우선 + 로컬 sample fallback` 구조로 렌더링합니다.
- 고객 편집기는 `/page-editor/[slug]`에서 동작하며, 페이지별 비밀번호 기반으로 진입합니다.
- Firestore source of truth는 `events/{eventId}` 축입니다.
- 공개 주소 `slug`는 `eventSlugIndex/{slug}`로 `eventId`에 매핑합니다.
- 비밀번호는 `eventSecrets/{eventId}`, 결제는 `billingFulfillments/{transactionId}`를 기준으로 처리합니다.
- 이벤트 도메인 legacy 컬렉션은 제거 완료 상태이며, `memory-pages`는 별도 도메인으로 유지합니다.
- 추억 페이지는 `memory-pages`, `memory-images`를 별도로 사용합니다.
- 모바일 앱은 `apps/mobile` 아래 Expo 프로젝트로 관리합니다.

## 추가 문서

- 문서 허브: `docs/README.md`
- 새 테마 추가 체크리스트: `docs/new-theme-checklist.md`
- 모바일 청첩장 연동 기준: `docs/mobile-client-editor-policy.md`
- Expo 영향 범위 점검: `docs/expo-impact-assessment.md`
- 이벤트 도메인 현재 기준: `docs/event-domain-current-state.md`
- 이벤트 백필 실행 가이드: `docs/event-backfill-runbook.md`
- 이벤트 운영 모니터링 가이드: `docs/event-rollout-monitoring.md`
- 웹 생성 흐름 정리: `docs/web-page-wizard-alignment.md`
- 서비스 개요 문서: `docs/portfolio-service-overview.md`

## 기술 스택

- `Next.js 15`
- `React 19`
- `TypeScript`
- `Firebase Auth`
- `Cloud Firestore`
- `Firebase Storage`
- `Expo` (`apps/mobile`)

## 현재 라우트 구조

### 공개 페이지

- `/`
  메인 페이지
- `/{slug}`
  공개 URL 진입용 리다이렉트 라우트
- `/{slug}/emotional`
  감성형 청첩장
- `/{slug}/simple`
  심플형 청첩장
- `/memory/{slug}`
  추억 페이지

### 운영 / 편집

- `/admin`
  관리자 대시보드
- `/page-editor`
  고객 편집기 안내 페이지
- `/page-editor/{slug}`
  고객 청첩장 편집기
- `/page-wizard`
  관리자용 신규 페이지 생성 시작 화면
- `/page-wizard/{slug}`
  관리자용 페이지 생성 / 수정 화면

### 모바일 앱

- `apps/mobile`
  Expo Router 기반 모바일 운영 앱

## 현재 아키텍처 요약

### 청첩장 페이지

공개 청첩장 페이지는 서버에서 먼저 Firestore를 확인하고, 해당 slug에 대한 커스텀 설정이 있으면 그 값을 사용합니다. Firestore 설정을 읽지 못하거나 서버 Admin 자격증명이 없는 로컬 환경에서는 `src/config/pages/*`의 sample 데이터를 fallback으로 사용합니다.

관련 파일:

- `src/server/invitationPageServerService.ts`
- `src/services/invitationPageService.ts`
- `src/config/weddingPages.ts`

### 고객 편집기

고객 편집기는 청첩장 페이지를 단계적으로 수정할 수 있는 편집 화면입니다.

주요 기능:

- 섹션별 입력
- 실시간 섹션 미리보기
- 감성형 / 심플형 미리보기 전환
- 자동 저장
- 페이지별 비밀번호 기반 진입

관련 파일:

- `src/app/page-editor/PageEditorClient.tsx`
- `src/app/page-editor/pageEditorPanels.tsx`
- `src/app/page-editor/PageEditorSectionPreview.tsx`

### 관리자

관리자 대시보드는 아래 영역을 관리합니다.

- 청첩장 페이지
- 추억 페이지
- 이미지
- 방명록
- 고객 비밀번호
- 노출 기간

관련 파일:

- `src/app/admin/AdminPageClient.tsx`
- `src/app/admin/_components/*`
- `src/components/admin/*`

## 테마 시스템

현재 실제 운영 테마는 아래 2개입니다.

- `emotional`
- `simple`

URL 규칙:

- `/{slug}`는 리다이렉트 전용이고 `/{slug}/{defaultTheme}`로 이동합니다.
- `/{slug}/emotional`은 `emotional` 실제 페이지입니다.
- `/{slug}/simple`은 `simple` 실제 페이지입니다.

공유 URL, 카카오 공유, SEO canonical은 실제 테마 경로(`/{slug}/emotional`, `/{slug}/simple`) 기준으로 맞춰집니다.

관련 파일:

- `src/app/_components/themeRenderers/emotional.tsx`
- `src/app/_components/themeRenderers/simple.tsx`
- `src/lib/invitationVariants.ts`
- `src/app/_components/weddingThemes.ts`

## 주요 디렉터리 구조

```text
src/
  app/
    [slug]/
    admin/
    memory/
    page-editor/
    page-wizard/
  components/
    admin/
    icons/
    manage/
    maps/
    media/
    motion/
    sections/
  config/
    pages/
    weddingPages.ts
  contexts/
  generated/
  lib/
  server/
  services/
  types/
  utils/

apps/
  mobile/

scripts/
  firebase-static-hosting-migration.mjs
  postbuild-static-cleanup.mjs
  sync-memory-page-metadata.mjs
```

## 데이터 소스 구조

### sample / seed

기본 샘플 데이터는 아래 파일들에 있습니다.

- `src/config/pages/*`
- `src/config/weddingPages.ts`

샘플 데이터는 더 이상 임시용 데이터만은 아니고, 기본값과 fallback 역할도 합니다.

### Firestore 기반 이벤트 저장 구조

#### source of truth

- `events/{eventId}`
  - 이벤트 메타, 공개 상태, 기간, 통계
- `events/{eventId}/content/current`
  - 청첩장 본문 원본
- `events/{eventId}/comments/{commentId}`
  - 방명록/댓글
- `events/{eventId}/linkTokens/{tokenId}`
  - 모바일 1회용 연동 링크
- `events/{eventId}/auditLogs/{logId}`
  - 고위험 작업 및 운영 로그
- `eventSecrets/{eventId}`
  - 편집 비밀번호 민감정보
- `eventSlugIndex/{slug}`
  - 공개 주소 slug -> `eventId` 조회 인덱스
- `billingFulfillments/{transactionId}`
  - 결제 이행 멱등성과 상태

#### 해석 규칙

- 공개 주소와 운영 화면에서 보이는 식별자는 `slug`다.
- 실제 Firestore 원본 문서는 `eventId` 기준으로 읽고 쓴다.
- `slug`는 항상 `eventSlugIndex/{slug}`를 통해 `eventId`로 해석한다.
- `/page-wizard`, `/page-editor/{slug}`, 모바일 운영 화면은 모두 이 구조를 기준 저장소로 사용한다.
- 고객 편집기와 모바일 편집기는 Firestore에 직접 쓰지 않고 서버 API 또는 repository를 통해 저장한다.

#### 본문 / 방명록 / 비밀번호 / 결제

- 본문 저장은 `events/{eventId}/content/current`
- 방명록 저장과 상태 변경은 `events/{eventId}/comments/{commentId}`
- 비밀번호 저장과 검증은 `eventSecrets/{eventId}`
- 결제 이행은 `billingFulfillments/{transactionId}`

#### legacy 상태

- `invitation-page-configs`
- `invitation-page-registry`
- `display-periods`
- `client-passwords`
- `guestbooks`
- `page-ticket-balances`

위 이벤트 도메인 legacy 컬렉션은 제거 완료 상태다. 현재 런타임은 새 구조만 기준으로 동작한다.

### 추억 페이지

```text
memory-pages/{pageSlug}
```

주요 필드 예시:

- `enabled`
- `visibility`
- `title`
- `introMessage`
- `thankYouMessage`
- `heroImage`
- `heroThumbnailUrl`
- `galleryImages`
- `selectedComments`
- `timelineItems`
- `seoTitle`
- `seoDescription`
- `seoNoIndex`

### 고객 편집 비밀번호

#### `eventSecrets/{eventId}`

관리자가 고객 편집 비밀번호를 관리하는 컬렉션입니다. 실제 검증의 핵심은 `eventSecrets/{eventId}`에 저장된 비밀번호 해시와 `passwordVersion`입니다.

### 관리자 계정

```text
admin-users/{uid}
```

관리자 로그인 자체는 Firebase Auth로 처리하고, 실제 권한 부여는 `admin-users/{uid}` 문서 존재 여부와 `enabled != false` 여부로 판정합니다.

## Storage 구조

```text
wedding-images/{pageSlug}/...
memory-images/{pageSlug}/...
```

- 청첩장 이미지 업로드는 `wedding-images/{pageSlug}/thumb-*` 썸네일 파일도 함께 저장하고, 공개 갤러리 그리드는 썸네일을 우선 사용합니다.

구성:

- `wedding-images`
  청첩장용 이미지
- `memory-images`
  추억 페이지용 이미지

현재 Storage rules는 공개 상태와 노출 기간을 통과한 이벤트/추억 페이지만 `get`을 허용하고, 폴더 목록 조회와 쓰기는 관리자 또는 소유자 관리 흐름으로 제한합니다.

관련 파일:

- `storage.rules`
- `src/services/imageService.ts`

## 권한 / 보안 규칙 요약

### Firestore

현재 rules 기준 주요 정책:

- `memory-pages`
  공개 메모리 페이지 읽기 허용
- `events/{eventId}`, `events/{eventId}/content/current`
  공개 이벤트 조건 충족 시 읽기 가능, 쓰기는 관리자 또는 서버 경유
- `events/{eventId}/comments/{commentId}`
  공개 이벤트 조건 충족 시 읽기 가능, 공개 작성은 서버 API 경유, 관리자 수정/삭제
- `eventSecrets`, `eventSlugIndex`, `billingFulfillments`, `event-write-through-failures`
  관리자 전용 또는 서버 운영 보조 컬렉션

source of truth는 `events/{eventId}` 축이며, legacy 컬렉션 rules는 제거 완료 상태입니다.

자세한 기준은 `firestore.rules`를 우선 확인합니다.

### Storage

현재 rules 기준:

- `wedding-images/{slug}/**` 공개 이벤트 조건 충족 시 get 가능, list/write/delete는 관리자 또는 소유자 관리 권한 필요
- `memory-images/{slug}/**` 공개 추억 페이지 조건 충족 시 get 가능, list/write/delete는 관리자 권한 필요

## 환경 변수

### 클라이언트 공개 env

```env
NEXT_PUBLIC_USE_FIREBASE=true

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY=
# 또는
NEXT_PUBLIC_KAKAO_MAP_API_KEY=

EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=
```

설명:

- `NEXT_PUBLIC_USE_FIREBASE`
  Firebase 실제 사용 여부
- `NEXT_PUBLIC_FIREBASE_*`
  Firebase Web SDK 설정
- `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`
  Kakao 지도 / 공유 SDK 키
- `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
  Expo Android 앱에서 `react-native-purchases`가 사용할 RevenueCat 공개 SDK 키
- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
  Expo iOS 앱에서 `react-native-purchases`가 사용할 RevenueCat 공개 SDK 키

주의:

- 관리자 로그인은 Firebase Auth 계정 + `admin-users/{uid}` 권한 문서로 제어합니다.
- `NEXT_PUBLIC_*` 값에는 관리자 비밀번호나 서버 전용 키를 넣지 않습니다.

### 서버 / 스크립트용 env

```env
FIREBASE_SERVICE_ACCOUNT_JSON=
GOOGLE_APPLICATION_CREDENTIALS=
FIREBASE_PROJECT_ID=
GOOGLE_CLOUD_PROJECT=
GCLOUD_PROJECT=
CLIENT_EDITOR_SESSION_SECRET=
MOBILE_DRAFT_CREATION_ENABLED=
MEMORY_METADATA_SYNC_STRICT=true
REVENUECAT_SERVER_API_KEY=
```

설명:

- `FIREBASE_SERVICE_ACCOUNT_JSON`
  서비스 계정 JSON 전체를 문자열로 주입할 때 사용
- `GOOGLE_APPLICATION_CREDENTIALS`
  서비스 계정 JSON 파일 경로
- `CLIENT_EDITOR_SESSION_SECRET`
  고객 편집 세션 서명용 서버 전용 비밀값
- `MEMORY_METADATA_SYNC_STRICT`
  추억 페이지 메타데이터 동기화 실패 시 빌드 실패 처리
- `REVENUECAT_SERVER_API_KEY`
  RevenueCat 구매 검증용 서버 전용 키. 모바일 Billing 지급 검증은 이 값이 없으면 실패 처리합니다.

## 로컬 개발

```bash
npm install
npm run dev
```

## 배포 기준

- 이 저장소의 웹 앱은 API 라우트와 SSR 라우트를 사용하므로 정적 `out` 기반 Firebase Hosting 배포를 기본값으로 사용하지 않습니다.
- `firebase.json`은 Firestore/Storage rules 배포 설정만 유지합니다.
- `npm run deploy:firebase`는 현재 rules 배포만 수행합니다.
- 웹 런타임 배포는 Firebase App Hosting, Cloud Run, Vercel처럼 Next.js 동적 라우트를 지원하는 호스팅으로 통일합니다.

개발 서버는 빌드 캐시 꼬임을 줄이기 위해 `npm run dev`에서 `.next`를 먼저 지우고 시작합니다.

모바일 앱은 아래처럼 별도 실행합니다.

```bash
npm run mb:start
npm run mb:android
npm run mb:web
```

Google Play Billing 연동 주의:

- 모바일 앱은 `react-native-purchases`를 사용하므로 Expo Go가 아니라 development build 또는 production build에서 테스트해야 합니다.
- 현재 저장소에는 `apps/mobile/package.json`에 의존성만 반영되어 있고, 오프라인 환경에서는 `npm --prefix apps/mobile install react-native-purchases`가 실패할 수 있습니다.
- 네트워크가 가능한 환경에서 패키지 설치 후 `npx eas build --platform android --profile development` 또는 `production`으로 다시 빌드해야 실제 결제를 테스트할 수 있습니다.

## 주요 스크립트

```bash
npm run dev
npm run clean:next
npm run sync:memory-metadata
npm run build
npm run build:memory-metadata-strict
npm run typecheck
npm run export
npm run preview
npm run lint
npm run check
npm run test:smoke
npm run test:api-repository-boundary
npm run deploy:firebase

npm run mb:start
npm run mb:android
npm run mb:web

npm run backfill:events
npm run monitor:event-rollout
```

### 스크립트 설명

- `build`
  메모리 메타데이터 snapshot 생성 후 `.next` 정리, 이후 `next build`
- `build:memory-metadata-strict`
  strict 모드 메타데이터 동기화 후 빌드
- `typecheck`
  웹(`tsc --noEmit`)과 모바일(`apps/mobile`) 타입 검사를 함께 실행
- `clean:next`
  `.next` 캐시 삭제
- `sync:memory-metadata`
  메모리 페이지 메타데이터 snapshot 생성
- `export`
  현재는 `next build`와 동일하게 동작
- `preview`
  `next start -p 3000`
- `check`
  루트 lint + 웹/모바일 typecheck를 한 번에 실행
- `test:smoke`
  `next build` 기준의 최소 smoke 검증
- `deploy:firebase`
  Firestore / Storage rules만 배포
- `backfill:events`
  이벤트 구조 보정/백필 실행
- `monitor:event-rollout`
  이벤트 rollout 보조 컬렉션 상태 확인

### 직접 실행 스크립트

`package.json`에 alias가 없는 운영 보조 스크립트는 아래처럼 직접 실행합니다.

```bash
node scripts/firebase-static-hosting-migration.mjs analyze
node scripts/firebase-static-hosting-migration.mjs sanitize-memory-pages --execute
```

## 고객 편집기 개요

`/page-editor/{slug}`는 고객이 직접 내용을 수정할 수 있도록 만든 단계형 편집기입니다.

주요 기능:

- 관리자 로그인 없이 즉시 편집 가능
- 고객은 페이지별 비밀번호로 잠금 해제 가능
- 섹션별 입력
- 자동 저장
- 감성형 / 심플형 미리보기 전환
- 공개 상태 전환
- 기본값 복원
- 변경 취소

현재 UX 기준:

- 데스크톱: 좌측 섹션 메뉴 + 우측 작업 영역
- 모바일 / 태블릿: 섹션 버튼 + 바텀시트 기반 섹션 이동

## 관리자 대시보드 개요

`/admin`은 운영 화면입니다.

주요 기능:

- 청첩장 목록 조회
- 편집기 이동
- 이미지 업로드 / 삭제
- 추억 페이지 관리
- 방명록 조회 / 삭제
- 고객 비밀번호 관리
- 노출 기간 설정

관리자 권한 체크:

1. Firebase Auth 로그인
2. `admin-users/{uid}` 문서 존재
3. `enabled != false`

## 방명록 운영 기준

현재 댓글 대상 조회와 운영 구조는 `events/{eventId}/comments/{commentId}`입니다. 공개/관리 런타임 모두 이 구조를 기준으로 동작하며, 이벤트 도메인 댓글 legacy 컬렉션은 제거 완료 상태입니다.

## 메모리 페이지 메타데이터 동기화

빌드 전에 `scripts/sync-memory-page-metadata.mjs`가 `memory-pages` 컬렉션을 읽어 `src/generated/memory-page-metadata.json`을 생성합니다.

용도:

- `/memory/[slug]` 메타데이터 생성
- 빌드 시점 SEO 정보 반영

주의:

- `NEXT_PUBLIC_USE_FIREBASE=true`인데 Admin 자격증명이 없으면 strict 빌드가 실패할 수 있습니다.
- 자격증명이 없고 Firebase를 끈 상태면 빈 snapshot을 생성합니다.

## 운영 정책 메모

### 상품 티어 기본값

- `DEFAULT_INVITATION_PRODUCT_TIER`는 현재 `'premium'`입니다.
- 신규 페이지 생성과 fallback 샘플은 기본 기능 전체를 가진 `premium`을 기본값으로 사용합니다.
- 티어별 현재 기능 차이는 아래와 같습니다.
  - `standard`: 갤러리 6장, 링크 공유, 음악 없음, 방명록 없음
  - `deluxe`: 갤러리 12장, 카드 공유, 음악 있음, 방명록 없음
  - `premium`: 갤러리 18장, 카드 공유, 카운트다운 있음, 방명록 있음

### 공개 상태와 노출 기간

- 서버는 `isPublicInvitationPage()`에서 `events.visibility.published`와 `displayPeriod`를 함께 확인합니다.
- Firestore rules도 `events/{eventId}`의 공개 상태와 기간 조건을 다시 확인합니다.
- 따라서 공개 여부는 서버 렌더와 Firestore rules 양쪽에서 제한됩니다.

### 노출 기간 운영 기준

- 관리자와 고객 편집기는 별도 기간 컬렉션을 직접 쓰지 않습니다.
- 노출 기간 설정과 해제는 `/admin`의 노출 기간 탭에서 관리되고, 실제 저장은 `events/{eventId}.visibility`에 반영됩니다.
- `visibility.published == false`면 기간과 무관하게 항상 비공개입니다.
- `visibility.displayStartAt`, `visibility.displayEndAt`가 모두 비어 있으면 기간 제한 없이 공개입니다.
- 기간 필드를 쓸 때는 시작일과 종료일이 모두 있어야 하며, 하나라도 비어 있으면 공개 불가 상태로 봅니다.

## 배포 상태와 주의사항

현재 프로젝트 코드는 **동적 Next 라우트**를 기준으로 작성되어 있습니다.

예:

- `/{slug}`
- `/{slug}/emotional`
- `/{slug}/simple`
- `/admin`
- `/page-editor/{slug}`
- `/page-wizard/{slug}`

`firebase.json`은 정적 Hosting `out/` 배포 설정을 제거하고 Firestore / Storage rules 배포 설정만 유지합니다.

정리:

- Firestore / Storage rules 배포는 `npm run deploy:firebase`로 수행
- 동적 청첩장 / 관리자 / 편집기 웹 런타임은 Next.js SSR/API 지원 호스팅으로 배포

권장 방향:

1. Firebase App Hosting 또는 동적 런타임 호스팅 구조로 웹 배포 통일
2. 정적 export 전용 배포가 필요하면 별도 Firebase Hosting 설정 파일로 분리

## 현재 제약 사항

- 메모리 페이지는 현재 seed slug 기준으로만 static params를 생성합니다.
- 관리자에서 완전한 신규 페이지 draft 생성 흐름은 계속 정리 중입니다.
- 웹 런타임 배포 파이프라인은 동적 Next 호스팅 기준으로 별도 연결이 필요합니다.

## 검증 권장 명령

```bash
npm run check
npm run build
npm run test:smoke
```

필요하면 개별 검증도 바로 실행할 수 있습니다.

```bash
npm run lint
npm run typecheck
npm run build
```

## 참고 파일

문서보다 코드가 최종 기준입니다. 아래 파일들을 우선 확인하면 현재 구조를 빠르게 파악할 수 있습니다.

- `src/app/[slug]/page.tsx`
- `src/app/[slug]/[theme]/page.tsx`
- `src/app/page-wizard/[slug]/page.tsx`
- `src/app/admin/AdminPageClient.tsx`
- `src/app/page-editor/PageEditorClient.tsx`
- `src/server/invitationPageServerService.ts`
- `src/server/clientEditorSession.ts`
- `src/services/invitationPageService.ts`
- `src/services/commentService.ts`
- `firestore.rules`
- `storage.rules`
- `firebase.json`
