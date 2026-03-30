# Invitation

이 저장소의 단일 기준 문서입니다. 기존에 흩어져 있던 기능 메모, 운영 가이드, 사용 예시는 모두 이 문서로 통합했습니다.

## 1. 프로젝트 개요

이 프로젝트는 `Next.js 15 + React 19 + Firebase` 기반의 모바일 청첩장 서비스입니다.

- 배포: `Firebase Hosting`
- 렌더링: `Next static export`
- 런타임 데이터: `Firestore`
- 이미지 저장소: `Firebase Storage`
- 관리자 인증: `Firebase Auth + admin-users/{uid}`

정적 배포를 유지하면서도 실제 데이터와 공개 여부는 Firestore 규칙으로 제어하도록 구조를 정리했습니다.

## 2. 현재 아키텍처

### 공개 라우트

- 청첩장: `/{pageSlug}/`
- 추억 페이지: `/memory/{pageSlug}/`
- 관리자: `/admin/`

### 핵심 원칙

- 청첩장 본문 데이터는 코드 번들이 아니라 `invitation-pages` 컬렉션에서 읽습니다.
- 추억 페이지도 `memory-pages` 컬렉션에서 읽습니다.
- 추억 페이지 URL은 고정 `pageSlug` 기반입니다.
- 사용자 정의 slug, 클라이언트 비밀번호 보호, 브라우저 평문 인증은 제거했습니다.
- `unlisted`는 보안 기능이 아니라 `미노출 + noindex` 운영 정책입니다.

## 3. 데이터 모델

### Firestore 컬렉션

- `invitation-pages/{pageSlug}`
  - 청첩장 본문, 메타데이터, 공개 여부, 노출 기간
- `memory-pages/{pageSlug}`
  - 추억 페이지 본문, 갤러리, 타임라인, 선택 댓글, SEO 설정
- `comments/{commentId}`
  - 방명록 댓글
  - 필드: `author`, `message`, `pageSlug`, `createdAt`
- `admin-users/{uid}`
  - 관리자 허용 목록
  - `enabled != false` 인 문서만 관리자 권한을 가집니다.
- `display-periods/**`, `settings/**`
  - 관리자 전용 운영 데이터

### Storage 경로

- `wedding-images/{pageSlug}/...`
- `memory-images/{pageSlug}/...`

## 4. 공개/권한 모델

### Firestore 규칙

- `invitation-pages`
  - 공개 읽기: `published == true`
  - 그리고 `displayPeriodEnabled != true` 이거나 현재 시점이 노출 기간 안이어야 함
  - 관리자만 생성/수정/삭제 가능
- `memory-pages`
  - 공개 읽기: `enabled == true` 이고 `visibility in ['public', 'unlisted']`
  - 관리자만 생성/수정/삭제 가능
- `comments`
  - 누구나 읽기 가능
  - 누구나 생성 가능
  - 관리자만 수정/삭제 가능
- `admin-users`, `display-periods`, `settings`
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

현재 런타임 기준 문서는 Firestore입니다. `src/config/pages/*` 와 관련 설정 파일은 런타임 소스가 아니라 시드 입력 용도로만 봐야 합니다.

### 마이그레이션 스크립트

```bash
node scripts/firebase-static-hosting-migration.mjs analyze
node scripts/firebase-static-hosting-migration.mjs migrate-comments --execute
node scripts/firebase-static-hosting-migration.mjs sanitize-memory-pages --execute
node scripts/firebase-static-hosting-migration.mjs seed-invitations --input scripts/invitation-pages.example.json --execute
```

### 스크립트 동작

- `analyze`
  - 기존 데이터 상태 점검
- `migrate-comments`
  - `comments-{pageSlug}` 형태의 레거시 댓글을 `comments` 단일 컬렉션으로 통합
- `sanitize-memory-pages`
  - 추억 페이지의 레거시 필드 제거
  - 제거 대상: `slug`, `passwordProtected`, `passwordHash`, `passwordHint`
- `seed-invitations`
  - `invitation-pages` 시드 데이터 업로드

### Admin SDK 인증

스크립트 실행 시 다음 둘 중 하나가 필요합니다.

- `GOOGLE_APPLICATION_CREDENTIALS`
- `FIREBASE_SERVICE_ACCOUNT_JSON`

## 10. invitation-pages 문서 기준

청첩장 페이지는 최소한 아래 성격의 필드를 가져야 합니다.

- `slug`
- `displayName`
- `description`
- `date`
- `venue`
- `groomName`
- `brideName`
- `couple`
- `weddingDateTime`
- `metadata`
- `pageData`
- `published`
- `displayPeriodEnabled`
- `displayPeriodStart`
- `displayPeriodEnd`

위 구조는 [`src/types/invitationPage.ts`](/c:/Users/gy554/Desktop/portfolio/invitation/src/types/invitationPage.ts) 기준입니다.

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

청첩장 문서의 `pageData.kakaoMap` 에 좌표를 넣으면 위치 섹션에서 사용합니다.

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
3. `invitation-pages` 시드 또는 실제 데이터 반영
4. 필요 시 기존 댓글/추억 페이지 마이그레이션 실행
5. `firestore.rules`, `storage.rules`, `firestore.indexes.json` 배포
6. 공개할 페이지의 `published`, `displayPeriod`, `visibility` 검증

## 20. 문서 정책

이 저장소에서는 이 `README.md` 하나만 문서 기준으로 유지합니다.

- 기능 메모
- 운영 가이드
- 마이그레이션 가이드
- 이미지/음악/카카오 설정 안내

위 내용은 모두 이 파일로 통합했습니다.
