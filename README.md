# Invitation

모바일 청첩장과 추억 페이지를 운영하는 Next.js + Firebase 프로젝트입니다.

현재 기준 핵심 포인트는 아래와 같습니다.

- 공개 청첩장 테마는 `emotional`, `simple` 두 가지입니다.
- 공개 청첩장 페이지는 `Firestore 우선 + 로컬 sample fallback` 구조입니다.
- 고객 편집기는 `/page-editor/[slug]`에서 동작하며, 관리자 로그인 또는 페이지별 고객 비밀번호로 진입할 수 있습니다.
- 방명록은 표준 구조 `guestbooks/{pageSlug}/comments/{commentId}`를 사용하며, 레거시 `comments` / `comments-{slug}`는 마이그레이션 대상으로만 관리합니다.
- 메모리 페이지는 별도 `memory-pages` 컬렉션과 `memory-images` 스토리지를 사용합니다.

## 추가 문서

- 새 디자인(테마) 추가 체크리스트: `docs/new-theme-checklist.md`

## 1. 기술 스택

- `Next.js 15`
- `React 19`
- `TypeScript`
- `Firebase Auth`
- `Cloud Firestore`
- `Firebase Storage`
- `Playwright`

## 2. 현재 라우트 구조

### 공개 페이지

- `/`
  메인 홈
- `/{slug}`
  감성형 청첩장
- `/{slug}/simple`
  심플형 청첩장
- `/memory/{slug}`
  추억 페이지

### 운영 / 편집

- `/admin`
  관리자 대시보드
- `/page-editor`
  편집기 안내 페이지
- `/page-editor/{slug}`
  고객용 청첩장 편집기
- `/firebase-test`
  개발용 Firebase 점검 페이지

## 3. 현재 아키텍처 요약

### 청첩장 페이지

공개 청첩장 페이지는 서버에서 먼저 Firestore를 확인하고, 해당 slug에 대한 커스텀 설정이 있으면 그것을 사용합니다. Firestore에 설정이 없거나 서버 Admin 자격증명이 없는 로컬 환경에서는 `src/config/pages/*` sample 데이터를 fallback으로 사용합니다.

관련 파일:

- `src/server/invitationPageServerService.ts`
- `src/services/invitationPageService.ts`
- `src/config/weddingPages.ts`

### 편집기

편집기는 단계형 고객 입력 화면입니다.

- 단계형 입력
- 실시간 섹션 미리보기
- 감성형 / 심플형 미리보기 전환
- 자동 저장
- 관리자 또는 고객 비밀번호 기반 편집 진입

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

## 4. 테마 시스템

현재 실제 운영 테마는 2개만 남겨둔 상태입니다.

- `emotional`
- `simple`

URL 규칙:

- `/{slug}` → `emotional`
- `/{slug}/simple` → `simple`

관련 파일:

- `src/app/_components/themeRenderers/emotional.tsx`
- `src/app/_components/themeRenderers/simple.tsx`
- `src/lib/invitationVariants.ts`
- `src/app/_components/weddingThemes.ts`

## 5. 주요 디렉터리 구조

```text
src/
  app/
    [slug]/
    admin/
    memory/
    page-editor/
  components/
    admin/
    icons/
    maps/
    media/
    motion/
    sections/
  config/
    pages/
    weddingPages.ts
  contexts/
  lib/
  server/
  services/
  types/
  utils/

scripts/
  firebase-static-hosting-migration.mjs
  migrate-comments-to-guestbooks.mjs
  postbuild-static-cleanup.mjs
  sync-memory-page-metadata.mjs
```

## 6. 데이터 소스 구조

### 6.1 sample / seed

기본 샘플 데이터는 아래 파일들에 있습니다.

- `src/config/pages/*`
- `src/config/weddingPages.ts`

이 데이터는 더 이상 라우트 생성의 단일 진실 공급원만은 아니고, 기본값과 fallback 역할을 합니다.

### 6.2 Firestore 기반 청첩장 설정

#### `invitation-page-configs/{slug}`

페이지 본문 설정값 자체를 저장합니다.

예:

- 신랑/신부 정보
- 일정
- 장소
- 인사말
- 메타데이터
- 테마 variant 정보

#### `invitation-page-registry/{slug}`

페이지 레지스트리와 공개 상태를 저장합니다.

예:

- `pageSlug`
- `published`
- `hasCustomConfig`
- `editorTokenHash`
- `createdAt`
- `updatedAt`

#### `display-periods/{slug}`

페이지의 공개 기간을 제어합니다.

- 문서가 없으면 기간 제한 없음
- 문서가 있고 `isActive == true`면 기간 적용

### 6.3 방명록

#### 신규 구조

```text
guestbooks/{pageSlug}
guestbooks/{pageSlug}/comments/{commentId}
```

실제 댓글 문서는 하위 `comments` 서브컬렉션에 저장됩니다.

예:

- `author`
- `message`
- `pageSlug`
- `createdAt`
- `deleted`
- `deletedAt`
- `deletedBy`
- `editorTokenHash`

#### 레거시 구조

레거시 컬렉션(`comments`, `comments-{pageSlug}`)은 마이그레이션 대상이며,
현재 서비스 조회/저장은 `guestbooks/{pageSlug}/comments/{commentId}` 기준으로 동작합니다.

관련 파일:

- `src/services/commentService.ts`
- `scripts/migrate-comments-to-guestbooks.mjs`

### 6.4 추억 페이지

```text
memory-pages/{pageSlug}
```

주요 필드 예:

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

### 6.5 고객 편집 비밀번호

#### `client-passwords/{pageSlug}`

관리자가 고객용 편집 비밀번호를 관리하는 컬렉션입니다.

#### `client-access/{pageSlug}`

편집기에서 쓰는 `editorTokenHash`를 저장합니다.

`client-passwords` 값은 관리자 편의상 관리하고, 실제 고객 삭제/편집 검증은 `client-access.editorTokenHash` 기반으로 처리합니다.

### 6.6 관리자 계정

```text
admin-users/{uid}
```

관리자 로그인 자체는 Firebase Auth로 처리하고, 실제 권한 부여는 `admin-users/{uid}` 문서 존재 여부와 `enabled != false` 여부로 판정합니다.

## 7. Storage 구조

```text
wedding-images/{pageSlug}/...
memory-images/{pageSlug}/...
```

- `wedding-images`
  청첩장용 이미지
- `memory-images`
  추억 페이지용 이미지

현재 Storage rules는 public read, admin write 구조입니다.

관련 파일:

- `storage.rules`
- `src/services/imageService.ts`

## 8. 권한 / 보안 규칙 요약

### Firestore

현재 rules 기준 주요 정책:

- `memory-pages`
  공개 메모리 페이지만 읽기 허용
- `comments`
  공개 읽기, 누구나 생성, 관리자 삭제
- `guestbooks/{pageSlug}/comments`
  공개 읽기, 누구나 생성, 관리자 삭제, 고객 soft delete 허용
- `client-passwords`
  관리자만 읽기/쓰기
- `client-access`
  공개 읽기, 관리자 쓰기
- `invitation-page-configs`
  공개 읽기, 관리자 또는 고객 편집 토큰 기반 쓰기
- `invitation-page-registry`
  공개 읽기, 관리자 또는 고객 편집 토큰 기반 쓰기
- `display-periods`
  공개 읽기, 관리자 쓰기

자세한 내용은 `firestore.rules`를 기준으로 보는 것이 가장 정확합니다.

### Storage

현재 rules 기준:

- `wedding-images/**` 공개 읽기, 관리자 쓰기/삭제
- `memory-images/**` 공개 읽기, 관리자 쓰기/삭제

## 9. 환경 변수

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

NEXT_PUBLIC_ENABLE_DEV_TOOLS=false
ENABLE_DEV_TOOLS=false
```

설명:

- `NEXT_PUBLIC_USE_FIREBASE`
  Firebase 실제 사용 여부
- `NEXT_PUBLIC_FIREBASE_*`
  Firebase Web SDK 설정
- `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`
  Kakao 지도 / 공유 SDK 키
- `NEXT_PUBLIC_ENABLE_DEV_TOOLS`, `ENABLE_DEV_TOOLS`
  `/firebase-test` 노출 제어

주의:

- 관리자 로그인은 Firebase Auth 계정 + `admin-users/{uid}` 권한 문서로 제어됩니다.
- 클라이언트 공개 env(`NEXT_PUBLIC_*`)에 관리자 비밀번호를 두지 않습니다.

### 서버 / 스크립트용 env

```env
FIREBASE_SERVICE_ACCOUNT_JSON=
GOOGLE_APPLICATION_CREDENTIALS=
FIREBASE_PROJECT_ID=
GOOGLE_CLOUD_PROJECT=
GCLOUD_PROJECT=
MEMORY_METADATA_SYNC_STRICT=true
```

설명:

- `FIREBASE_SERVICE_ACCOUNT_JSON`
  서비스 계정 JSON 전체를 문자열로 주입할 때 사용
- `GOOGLE_APPLICATION_CREDENTIALS`
  서비스 계정 JSON 파일 경로
- `MEMORY_METADATA_SYNC_STRICT`
  메모리 페이지 메타데이터 동기화 실패 시 빌드 실패 처리

## 10. 로컬 개발

```bash
npm install
npm run dev
```

개발 서버는 빌드 캐시 꼬임 방지를 위해 `npm run dev`에서 `.next`를 먼저 지우고 시작합니다.

## 11. 주요 스크립트

```bash
npm run dev
npm run build
npm run build:memory-metadata-strict
npm run preview
npm run lint
npm run test:e2e
npm run test:e2e:smoke
npm run deploy:firebase

npm run migrate:firebase:static
npm run migrate:comments:guestbooks
npm run migrate:comments:guestbooks:execute
npm run migrate:comments:guestbooks:validate
npm run migrate:comments:guestbooks:purge
npm run migrate:comments:guestbooks:purge:execute
```

### 스크립트 설명

- `build`
  메모리 메타데이터 snapshot 생성 후 `.next` 정리 후 `next build`
- `build:memory-metadata-strict`
  strict 모드 메타데이터 동기화 후 빌드
- `preview`
  `next start -p 3000`
- `deploy:firebase`
  strict build 후 `firebase deploy`
- `migrate:comments:guestbooks`
  레거시 댓글 구조 분석
- `migrate:comments:guestbooks:execute`
  댓글을 `guestbooks/{pageSlug}/comments/{commentId}`로 복사
- `migrate:comments:guestbooks:validate`
  마이그레이션 누락 검증
- `migrate:comments:guestbooks:purge`
  레거시 댓글 삭제 계획(dry-run) 확인
- `migrate:comments:guestbooks:purge:execute`
  target 검증 후 레거시 댓글 실제 삭제

## 12. 고객 편집기 개요

`/page-editor/{slug}`는 고객이 직접 내용을 수정할 수 있도록 만든 단계형 편집기입니다.

주요 기능:

- 관리자 로그인 시 즉시 편집 가능
- 고객은 페이지별 비밀번호로 잠금 해제 가능
- 단계별 입력
- 자동 저장
- 감성형 / 심플형 미리보기 전환
- 공개 상태 저장
- 기본값 복원
- 변경 취소

현재 UX 기준:

- 데스크톱: 좌측 단계 메뉴 + 우측 작업 영역
- 모바일: 플로팅 단계 버튼 + 바텀시트 기반 단계 이동

## 13. 관리자 대시보드 개요

`/admin`은 운영 화면입니다.

지원 기능:

- 청첩장 목록 조회
- 편집기 이동
- 이미지 업로드 / 삭제
- 메모리 페이지 관리
- 방명록 조회 / 삭제
- 고객 비밀번호 저장 및 편집기 이동
- 노출 기간 설정

관리자 권한 체크:

1. Firebase Auth 로그인
2. `admin-users/{uid}` 문서 존재
3. `enabled != false`

## 14. 방명록 마이그레이션 가이드

현재 댓글 저장/조회 표준은 `guestbooks/{pageSlug}/comments/{commentId}`이며, 레거시 컬렉션은 purge 대상입니다.

권장 순서:

```bash
npm run migrate:comments:guestbooks
npm run migrate:comments:guestbooks:execute
npm run migrate:comments:guestbooks:validate
npm run migrate:comments:guestbooks:purge
npm run migrate:comments:guestbooks:purge:execute
npm run deploy:firebase
```

검증 기준:

- `validate` 결과에서 `missingCount: 0`이면 정상
- `purge` dry-run에서 `blockedEntryCount: 0`이면 안전 삭제 가능

### 마이그레이션 실행 전 준비

아래 중 하나가 필요합니다.

- `GOOGLE_APPLICATION_CREDENTIALS`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- 또는 `gcloud auth application-default login`

예시:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\Users\your-name\Downloads\firebase-admin.json"
npm run migrate:comments:guestbooks
```

주의:

- 서비스 계정 JSON 파일은 절대 git에 커밋하면 안 됩니다.
- 이 저장소는 해당 JSON 파일명을 `.gitignore`에 추가해 둔 상태입니다.

## 15. 메모리 페이지 메타데이터 동기화

빌드 전에 `scripts/sync-memory-page-metadata.mjs`가 `memory-pages` 컬렉션을 읽어 `src/generated/memory-page-metadata.json`을 생성합니다.

용도:

- `/memory/[slug]` 메타데이터 생성
- 빌드 시점 SEO 정보 반영

주의:

- `NEXT_PUBLIC_USE_FIREBASE=true`인데 Admin 자격증명이 없으면 strict 빌드가 실패할 수 있습니다.
- 자격증명이 없고 Firebase를 끈 상태면 빈 snapshot을 생성합니다.

## 16. 현재 배포 상태와 주의점

이 프로젝트는 현재 코드 구조상 **동적 Next 라우트**를 사용합니다.

예:

- `/{slug}`
- `/{slug}/simple`
- `/admin`
- `/page-editor/{slug}`

하지만 `firebase.json`은 아직 아래처럼 **정적 Hosting `out/` 디렉터리**를 기준으로 되어 있습니다.

```json
"hosting": {
  "public": "out"
}
```

즉 현재 상태는 다음과 같습니다.

- 애플리케이션 코드는 동적 Next 구조
- Firebase Hosting 설정은 과거 정적 export 구조

이 때문에 `npm run deploy:firebase`는 규칙 배포에는 유효하지만, Hosting 배포 방식은 현재 앱 구조와 완전히 맞지 않습니다.

정리:

- Firestore / Storage rules 배포: 가능
- 동적 청첩장 / 관리자 / 편집기까지 포함한 올바른 웹 배포: 재정비 필요

권장 방향:

1. Firebase App Hosting으로 전환
2. 또는 정적 export 기반으로 다시 구조를 맞춤

## 17. 현재 제약 사항

- 메모리 페이지는 현재 seed slug 기준으로만 static params를 생성합니다.
- 관리자에서 완전한 새 페이지 draft 생성 흐름은 아직 붙어 있지 않습니다.
- 레거시 댓글 컬렉션(`comments`, `comments-{slug}`)은 purge 스크립트로 정리합니다.
- 배포 파이프라인은 동적 Next 구조 기준으로 아직 최종 정리 전 상태입니다.

## 18. 검증 권장 명령

```bash
npm run lint
npm run build
npm run test:e2e:smoke
```

방명록 마이그레이션 이후에는 추가로:

```bash
npm run migrate:comments:guestbooks:validate
```

## 19. 참고 파일

문서보다 코드가 최종 기준입니다. 특히 아래 파일들을 우선 확인하면 현재 구조를 빠르게 파악할 수 있습니다.

- `src/app/[slug]/page.tsx`
- `src/app/[slug]/simple/page.tsx`
- `src/app/admin/AdminPageClient.tsx`
- `src/app/page-editor/PageEditorClient.tsx`
- `src/server/invitationPageServerService.ts`
- `src/services/invitationPageService.ts`
- `src/services/commentService.ts`
- `firestore.rules`
- `storage.rules`
- `firebase.json`
