# Invitation

이 저장소의 단일 기준 문서입니다. 기존에 흩어져 있던 기능 메모, 운영 가이드, 사용 예시는 모두 이 문서로 통합했습니다.

## 1. 프로젝트 개요

이 프로젝트는 `Next.js 15 + React 19 + Firebase` 기반의 모바일 청첩장 서비스입니다.

- 배포: `Firebase Hosting`
- 렌더링: `Next static export`
- 런타임 데이터: `Firestore`
- 이미지 저장소: `Firebase Storage`
- 관리자 인증: `Firebase Auth + admin-users/{uid}`

정적 배포를 유지하면서도 청첩장 본문은 코드 seed로 유지하고, 실제 운영 데이터는 Firestore와 Storage로 분리해 관리하도록 구조를 정리했습니다.

## 2. 현재 아키텍처

### 공개 라우트

- 청첩장: `/{pageSlug}/`
- 추억 페이지: `/memory/{pageSlug}/`
- 관리자: `/admin/`

### 핵심 원칙

- 청첩장 본문 데이터는 `src/config/pages/*` seed를 기준으로 렌더링합니다.
- 청첩장의 노출 기간만 `display-periods/{pageSlug}` 문서로 관리합니다.
- 추억 페이지도 `memory-pages` 컬렉션에서 읽습니다.
- 추억 페이지 URL은 고정 `pageSlug` 기반입니다.
- 사용자 정의 slug, 클라이언트 비밀번호 보호, 브라우저 평문 인증은 제거했습니다.
- `unlisted`는 보안 기능이 아니라 `미노출 + noindex` 운영 정책입니다.

## 3. 데이터 모델

### Firestore 컬렉션

- `display-periods/{pageSlug}`
  - 청첩장 노출 기간
  - 필드: `pageSlug`, `isActive`, `startDate`, `endDate`, `createdAt`, `updatedAt`
  - 문서가 없으면 해당 청첩장은 기간 제한 없이 노출됩니다.
- `memory-pages/{pageSlug}`
  - 추억 페이지 본문, 갤러리, 타임라인, 선택 댓글, SEO 설정
- `comments/{commentId}`
  - 방명록 댓글
  - 필드: `author`, `message`, `pageSlug`, `createdAt`
- `admin-users/{uid}`
  - 관리자 허용 목록
  - `enabled != false` 인 문서만 관리자 권한을 가집니다.
- `settings/**`
  - 관리자 전용 운영 데이터

### Storage 경로

- `wedding-images/{pageSlug}/...`
- `memory-images/{pageSlug}/...`

## 4. 공개/권한 모델

### Firestore 규칙

- `memory-pages`
  - 공개 읽기: `enabled == true` 이고 `visibility in ['public', 'unlisted']`
  - 관리자만 생성/수정/삭제 가능
- `comments`
  - 누구나 읽기 가능
  - 누구나 생성 가능
  - 관리자만 수정/삭제 가능
- `admin-users`
  - 본인 문서 읽기 또는 관리자 읽기 가능
- `display-periods`
  - 누구나 읽기 가능
  - 관리자만 생성/수정/삭제 가능
- `settings`
  - 관리자만 접근 가능

### Storage 규칙

- `wedding-images/**`, `memory-images/**`
  - 누구나 읽기 가능
  - 관리자만 쓰기/삭제 가능

## 5. 관리자 인증

관리자 로그인은 Firebase Auth 이메일/비밀번호 계정을 사용합니다.

권한 판정은 로그인 자체가 아니라 `admin-users/{uid}` 문서 존재 여부로 결정합니다.

예시:

```json
{
  "enabled": true,
  "role": "admin"
}
```

필수 운영 작업:

1. Firebase Auth에서 관리자 계정을 1개 생성합니다.
2. 해당 계정의 `uid`로 `admin-users/{uid}` 문서를 만듭니다.
3. 필요하면 `enabled: false`로 비활성화합니다.

## 6. 환경 변수

`.env.local` 기준:

```env
NEXT_PUBLIC_USE_FIREBASE=true

NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...

NEXT_PUBLIC_KAKAO_MAP_API_KEY=...

NEXT_PUBLIC_ENABLE_DEV_TOOLS=false
ENABLE_DEV_TOOLS=false
```

설명:

- `NEXT_PUBLIC_USE_FIREBASE`
  - `true`: 실제 Firebase 사용
  - `false`: mock 데이터 모드
- `NEXT_PUBLIC_KAKAO_MAP_API_KEY`
  - 카카오 공유 버튼 초기화에 사용
- `NEXT_PUBLIC_ENABLE_DEV_TOOLS` / `ENABLE_DEV_TOOLS`
  - 개발 전용 `/firebase-test/` 페이지 노출 제어

## 7. 로컬 실행

```bash
npm install
npm run dev
```

정적 결과 미리보기:

```bash
npm run build
npm run preview
```

## 8. 주요 스크립트

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run test:e2e
npm run test:e2e:smoke
npm run migrate:firebase:static
npm run deploy:firebase
```

## 9. 데이터 준비와 마이그레이션

청첩장 본문은 `src/config/pages/*` seed가 단일 기준입니다. Firestore는 청첩장 노출 기간, 추억 페이지, 댓글, 관리자 권한만 관리합니다.

### 마이그레이션 스크립트

```bash
node scripts/firebase-static-hosting-migration.mjs analyze
node scripts/firebase-static-hosting-migration.mjs migrate-comments --execute
node scripts/firebase-static-hosting-migration.mjs sanitize-memory-pages --execute
```

### 스크립트 동작

- `analyze`
  - 기존 데이터 상태 점검
- `migrate-comments`
  - `comments-{pageSlug}` 형태의 레거시 댓글을 `comments` 단일 컬렉션으로 통합
- `sanitize-memory-pages`
  - 추억 페이지의 레거시 필드 제거
  - 제거 대상: `slug`, `passwordProtected`, `passwordHash`, `passwordHint`

### Admin SDK 인증

스크립트 실행 시 다음 둘 중 하나가 필요합니다.

- `GOOGLE_APPLICATION_CREDENTIALS`
- `FIREBASE_SERVICE_ACCOUNT_JSON`

## 10. 청첩장 데이터 기준

청첩장 본문은 Firestore 문서가 아니라 [`src/config/weddingPages.ts`](/c:/Users/gy554/Desktop/portfolio/invitation/src/config/weddingPages.ts) 와 [`src/types/invitationPage.ts`](/c:/Users/gy554/Desktop/portfolio/invitation/src/types/invitationPage.ts) 기준 seed를 사용합니다.

운영 중 Firestore에서 수정되는 청첩장 관련 데이터는 `display-periods/{pageSlug}` 뿐입니다.

주요 필드:

- `pageSlug`
- `isActive`
- `startDate`
- `endDate`
- `createdAt`
- `updatedAt`

운영 규칙:

- 문서가 없으면 기간 제한 없음
- 문서가 있으면 `isActive == true` 이고 현재 시간이 `startDate ~ endDate` 안일 때만 공개 접근 허용
- 관리자는 기간과 무관하게 항상 확인 가능

## 11. memory-pages 문서 기준

추억 페이지는 `pageSlug`가 문서 ID와 동일해야 하며, URL도 `/memory/{pageSlug}/` 로 고정됩니다.

주요 필드:

- `pageSlug`
- `enabled`
- `visibility`
  - `public`
  - `unlisted`
  - `private`
- `title`, `subtitle`, `introMessage`, `thankYouMessage`
- `heroImage`, `heroImageCrop`, `heroThumbnailUrl`
- `galleryImages`
- `selectedComments`
- `timelineItems`
- `seoTitle`, `seoDescription`, `seoNoIndex`

기준 타입은 [`src/types/memoryPage.ts`](/c:/Users/gy554/Desktop/portfolio/invitation/src/types/memoryPage.ts) 입니다.

## 12. 관리자 화면 구성

관리자 페이지는 Firebase Auth 로그인 후 탭 기준으로 운영합니다.

- 청첩장 공개/노출 기간 관리
- 이미지 관리
- 추억 페이지 관리
- 댓글 관리

이미지 관리 탭은 페이지별로 묶여 있고, 펼치기/접기와 전체 펼치기/접기를 지원합니다.

## 13. 이미지 운영 가이드

### 청첩장 이미지

- 저장 위치: `wedding-images/{pageSlug}/...`
- 읽기 훅: [`src/hooks/usePageImages.ts`](/c:/Users/gy554/Desktop/portfolio/invitation/src/hooks/usePageImages.ts)

반환값:

- `images`
- `loading`
- `error`
- `firstImage`
- `mainImage`
- `galleryImages`
- `imageUrls`
- `getImageByName(name)`

기본 규칙:

- `main.*` 또는 이름에 `main.` 이 포함된 파일은 대표 이미지로 취급
- `gallery1`, `gallery2` 같은 이름은 갤러리 우선순위에 사용

사용 예시:

```tsx
const { mainImage, galleryImages, loading } = usePageImages('shin-minje-kim-hyunji');
```

### 추억 페이지 이미지

- 저장 위치: `memory-images/{pageSlug}/...`
- 업로드 함수: `uploadMemoryImages(pageSlug, files, category, orderStart)`
- 업로드 시 이미지 압축 후 Storage에 저장됩니다.

## 14. 배경 음악 사용

배경 음악 컴포넌트는 [`src/components/BackgroundMusic.tsx`](/c:/Users/gy554/Desktop/portfolio/invitation/src/components/BackgroundMusic.tsx) 입니다.

현재 기준으로 `musicUrl` 전달이 필수입니다.

```tsx
<BackgroundMusic
  autoPlay={true}
  volume={0.3}
  musicUrl="https://firebasestorage.googleapis.com/..."
/>
```

운영 메모:

- 음원은 직접 업로드한 URL을 사용합니다.
- 브라우저 정책상 최초 사용자 인터랙션 이후 재생될 수 있습니다.
- 저작권 확인된 음원만 사용해야 합니다.

## 15. 카카오 지도/공유 설정

### 지도 데이터

청첩장 seed의 `pageData.kakaoMap` 에 좌표를 넣으면 위치 섹션에서 사용합니다.

```ts
kakaoMap: {
  latitude: 37.5048,
  longitude: 127.0280,
  level: 3,
  markerTitle: '웨딩홀 이름'
}
```

### 공유

카카오 공유 버튼은 `NEXT_PUBLIC_KAKAO_MAP_API_KEY` 를 사용합니다.

## 16. 스크롤 애니메이션

스크롤 기반 진입 애니메이션은 다음으로 구성되어 있습니다.

- 훅: [`src/hooks/useScrollAnimation.ts`](/c:/Users/gy554/Desktop/portfolio/invitation/src/hooks/useScrollAnimation.ts)
- 래퍼: [`src/components/ScrollAnimatedSection.tsx`](/c:/Users/gy554/Desktop/portfolio/invitation/src/components/ScrollAnimatedSection.tsx)

사용 예시:

```tsx
<ScrollAnimatedSection delay={200}>
  <Gallery />
</ScrollAnimatedSection>
```

## 17. 테스트와 검증

정리 후 기준 검증 명령:

```bash
npm run build
npm run lint
npm run test:e2e:smoke
```

`test:e2e:smoke`의 일부 시나리오는 아래 환경 변수가 없으면 자동으로 skip 됩니다.

```env
E2E_PUBLIC_PAGE_SLUG=...
E2E_PRIVATE_MEMORY_SLUG=...
E2E_ADMIN_EMAIL=...
E2E_ADMIN_PASSWORD=...
```

## 18. 배포

Firebase Hosting 기준:

```bash
npm run build
npm run deploy:firebase
```

`next.config.ts` 는 `output: 'export'` 와 `trailingSlash: true` 를 사용합니다. Hosting의 `public` 디렉터리는 `out/` 입니다.

## 19. 운영 체크리스트

배포 전 최소 확인 항목:

1. Firebase Auth 관리자 계정 생성
2. `admin-users/{uid}` 문서 생성
3. 공개할 청첩장의 seed slug와 기본 메타가 코드에 반영되어 있는지 확인
4. 필요 시 기존 댓글/추억 페이지 마이그레이션 실행
5. `firestore.rules`, `storage.rules`, `firestore.indexes.json` 배포
6. 공개할 페이지의 `display-periods`, `memory-pages`, `visibility` 상태 검증

## 20. 문서 정책

이 저장소에서는 이 `README.md` 하나만 문서 기준으로 유지합니다.

- 기능 메모
- 운영 가이드
- 마이그레이션 가이드
- 이미지/음악/카카오 설정 안내

위 내용은 모두 이 파일로 통합했습니다.

---

## 260401 작업 내역

### 1. 라우팅/노출 제어 정리
- `/firebase-test/` 페이지는 개발용으로만 유지하고, 프로덕션 정적 산출물에서는 제거되도록 후처리 스크립트를 추가했다.
- 빌드 후 `out/firebase-test` 디렉터리를 제거하도록 `scripts/postbuild-static-cleanup.mjs`를 연결했다.
- smoke 테스트도 실제 정적 산출물 기준으로 `/firebase-test/`가 404가 나는지 확인하도록 정리했다.
- `/memory/[slug]/`는 `dynamicParams = false`와 `generateStaticParams()`를 사용하도록 정리해, seed에 존재하는 slug만 정적으로 생성되게 맞췄다.
- 존재하지 않는 임의의 memory slug는 export 결과에 포함되지 않으며, smoke 테스트로 같이 검증하도록 맞췄다.

### 2. 댓글 데이터 구조 일원화
- 댓글 저장/조회 경로를 unified `comments` 컬렉션 기준으로 고정했다.
- 기존 `comments-{pageSlug}` 형태의 legacy fallback 코드는 제거했다.
- Firestore rules와 실제 애플리케이션 코드가 같은 저장 구조를 보도록 정리했다.
- 관리자 화면의 댓글 로딩 방식도 요약 카드용 집계와 실제 목록 조회를 분리해서, 로그인 직후 전체 댓글을 한 번에 preload하지 않도록 바꿨다.

### 3. 공개 청첩장/메모리 페이지 메타데이터 정리
- 공개 청첩장 페이지 메타데이터는 seed 기반 서버 메타를 사용하도록 정리해, Firebase 응답 이전에도 기본 메타가 정적으로 생성되도록 맞췄다.
- 공개 청첩장 상태 로딩에서 seed fallback이 권한 오류나 비공개 상태를 우회하지 않도록 `includeSeedFallback` 동작을 분리했다.
- 메모리 페이지 서버 메타데이터는 더 이상 seed만 보지 않고, 관리자에서 저장한 `seoTitle`, `seoDescription`, `seoNoIndex`를 build-time 스냅샷으로 반영할 수 있도록 바꿨다.
- 메모리 페이지 메타는 공개된 페이지일 때만 사용자 정의 SEO를 사용하고, `private`/`disabled` 상태에서는 seed 기본 메타만 노출하도록 정리했다.
- 메모리 대표 이미지는 hero thumbnail 또는 hero image를 우선 사용하고, data URL은 메타 이미지에서 제외하도록 처리했다.

### 4. 메모리 페이지 SEO 스냅샷 파이프라인 추가
- `scripts/sync-memory-page-metadata.mjs`를 추가해 빌드 전에 `memory-pages` 컬렉션의 SEO 필드를 `src/generated/memory-page-metadata.json`으로 내려받도록 했다.
- `src/lib/memoryPageMetadataSnapshot.ts`를 추가해 서버 메타 생성 시 해당 스냅샷을 안전하게 읽도록 했다.
- `npm run build` 실행 전에 메모리 메타 스냅샷 동기화가 먼저 실행되도록 스크립트를 연결했다.
- `npm run deploy:firebase`는 `--strict` 동기화를 사용하도록 바꿔, 실제 배포 시 Firestore 메타를 읽지 못하면 배포가 실패하게 했다.
- 생성 파일은 `src/generated/` 아래에 두고 `.gitignore`에 추가해 작업 트리를 오염시키지 않도록 정리했다.

### 5. 운영 설정과 외부 SDK 공통화
- Firebase 공개 설정은 하드코딩 fallback을 제거하고, 런타임 env가 없으면 fail-fast 하도록 정리했다.
- Kakao 지도/공유 관련 공개 설정도 단일 runtime config 경로로 모았다.
- Kakao 지도 SDK 로더와 지도 URL 생성 로직을 공통 유틸로 분리해, 여러 `LocationMap*` 컴포넌트가 같은 로더를 쓰도록 정리했다.
- 지도 컴포넌트에 흩어져 있던 API key 하드코딩을 없애고 env 기반 설정으로 통일했다.

### 6. 테마 렌더링 구조 리팩터링
- 기존 `weddingPageRenderers.tsx`의 거대한 switch/중복 렌더링 구조를 줄이고, 테마별 렌더러 모듈과 레지스트리 구조로 분해했다.
- `WeddingInvitationPage`는 테마별 렌더러를 동적으로 불러오도록 바꿔서, 모든 테마 코드를 한 번에 번들에 싣지 않도록 정리했다.
- `Cover`, `Greeting`, `Gallery`, `Loader` 영역에 themed base 컴포넌트를 도입해서 `_1~_5` 변형의 중복을 줄였다.
- `GiftInfoThemed`, `GuestbookThemed`, `LocationMapThemed`, `ScheduleTabbedThemed`, `WeddingCalendarThemed`와 같은 공통화 방향에 맞춰 나머지 섹션도 같은 구조로 맞췄다.
- simple/blue/classic 계열에서 예식장 연락처가 누락되던 드리프트도 같이 수정했다.

### 7. 공개 페이지 번들 및 클라이언트 상태 개선
- 공개 청첩장 상태는 Firebase 사용 시 seed 데이터를 먼저 노출하지 않도록 바꿔서, 비공개 페이지가 seed 기반으로 잠깐 보이는 문제를 막았다.
- 테마 렌더러를 direct import/dynamic registry 기반으로 분리해 invitation page first-load JS를 줄였다.
- 관리자 데이터 접근도 탭 진입 시점 lazy fetch 중심으로 정리해 초기 로딩 비용을 낮췄다.

### 8. 기타 정리
- 배경음악 관련 디버그 로그를 정리해 운영 콘솔 노이즈를 줄였다.
- 일부 테마 렌더러에 남아 있던 날짜 클릭 로그 등 디버그 출력도 정리했다.

### 9. 검증 결과
- `npm run lint` 통과
- `npm run build` 통과
- `npm run test:e2e:smoke` 통과
- smoke 테스트 기준 정적 호스팅 시나리오 2건 통과, emulator 의존 시나리오 3건은 환경 조건이 없으면 skip 되도록 유지

### 10. 운영 메모
- 메모리 페이지 SEO 스냅샷이 실제 Firestore 데이터를 반영하려면 배포 환경에 `GOOGLE_APPLICATION_CREDENTIALS` 또는 `FIREBASE_SERVICE_ACCOUNT_JSON`이 필요하다.
- 로컬에서 `NEXT_PUBLIC_USE_FIREBASE=false` 상태로 빌드하면 메모리 메타 스냅샷은 empty snapshot으로 생성되고, 메모리 페이지 메타는 안전한 기본 fallback만 사용한다.

### 11. 청첩장 Firestore 구조 재정리
- 청첩장 운영 데이터의 기준을 별도 청첩장 Firestore 문서 구조에서 `display-periods` 단일 컬렉션으로 되돌렸다.
- `src/services/invitationPageService.ts` 는 seed 본문에 `display-periods` 값을 오버레이하는 구조로 다시 단순화했다.
- 관리자 노출 기간 저장은 `display-periods/{pageSlug}` 만 생성/수정/삭제하도록 바꿨다.
- 공개 청첩장 접근 제어도 `display-periods` 기준으로 다시 계산하도록 정리했다.
- Firestore rules, 마이그레이션 스크립트, 관리자 안내 문구, 체크리스트까지 현재 운영 구조에 맞게 같이 수정했다.
