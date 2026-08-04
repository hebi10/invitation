# Sample Invitation Fallback Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 빈 샘플 청첩장 저장값을 안전한 공통 샘플 값으로 보완하고, 실제 입력값 우선순위를 보존하며, 로맨틱 테마의 빈 데이터 렌더링 오류를 제거한다.

**Architecture:** 등록된 웨딩 샘플 slug만 대상으로 하는 순수 폴백 정책을 `src/lib`에 추가하고 Firestore 읽기 DTO 경계에서 적용한다. 로맨틱 테마의 빈 상태 판단은 별도 순수 모듈로 분리해 React 상태 갱신 전에 렌더링 여부와 유효 탭을 결정한다. 범용 표지 이미지는 로컬 정적 자산으로 두어 외부 Storage 권한과 무관하게 폴백된다.

**Tech Stack:** Next.js 15, React 19, TypeScript, Firebase/Firestore read-through repositories, CSS Modules, GPT Image 2 기반 내장 이미지 생성 기능, Node/tsx 테스트 스크립트

## Global Constraints

- 사용자가 입력한 유효한 값은 샘플 값보다 항상 우선한다.
- `false`와 정상적인 숫자 `0`은 일반 필드에서 빈 값으로 취급하지 않는다.
- 날짜의 `year`, `month`, `day`와 지도 좌표 `0,0`은 샘플 페이지에서 유효하지 않은 값으로 처리한다.
- 폴백은 등록된 샘플 slug의 읽기 경로에만 적용하고 Firestore 문서를 수정하지 않는다.
- 실제 고객 청첩장에는 샘플 예식 정보를 주입하지 않는다.
- 기존 사용자 변경 파일 `src/app/admin/_components/AdminEventList.tsx`를 수정하거나 되돌리지 않는다.
- 기존 수정 상태인 `scripts/run-test-suite.mjs`에는 현재 변경을 보존한 채 새 테스트 ID만 추가한다.
- 새 의존성을 추가하지 않는다.
- 커밋, 푸시, 배포하지 않는다.

---

### Task 1: 샘플 데이터 폴백 정책

**Files:**
- Create: `src/lib/invitationSampleFallback.ts`
- Create: `scripts/test-sample-invitation-fallback.mts`
- Modify: `scripts/run-test-suite.mjs`
- Modify: `src/server/repositories/eventReadThroughDtos.ts:316-348`

**Interfaces:**
- Consumes: `InvitationPageSeed`, `getWeddingPageBySlug(slug)`
- Produces: `mergeInvitationSampleFallback(stored: InvitationPageSeed, sample: InvitationPageSeed): InvitationPageSeed`
- Produces: `isUsableSampleWeddingImage(pageSlug: string, imageUrl: string): boolean`

- [ ] **Step 1: 폴백 우선순위 실패 테스트 작성**

`scripts/test-sample-invitation-fallback.mts`에 다음 동작을 검증한다.

```ts
import assert from 'node:assert/strict';
import { getRequiredWeddingPageBySlug } from '../src/config/weddingPages';
import {
  mergeInvitationSampleFallback,
  isUsableSampleWeddingImage,
} from '../src/lib/invitationSampleFallback';

const sample = getRequiredWeddingPageBySlug('kim-shinlang-na-sinbu');
const stored = structuredClone(sample);
stored.date = '';
stored.venue = '   ';
stored.weddingDateTime = { year: 0, month: 0, day: 0, hour: 0, minute: 0 };
stored.pageData = {
  ...stored.pageData,
  ceremonyTime: '',
  ceremonyAddress: '',
  greetingMessage: '',
  galleryImages: [],
  kakaoMap: { latitude: 0, longitude: 0, level: 3, markerTitle: '' },
  giftInfo: { groomAccounts: [], brideAccounts: [], message: '' },
};
stored.metadata.images.wedding =
  'https://firebasestorage.googleapis.com/v0/b/example/o/wedding-images%2Fother-slug%2Fthum.jpg?alt=media';
stored.features = { ...stored.features, showMusic: false, showGuestbook: false };

const merged = mergeInvitationSampleFallback(stored, sample);
assert.equal(merged.date, sample.date);
assert.equal(merged.venue, sample.venue);
assert.deepEqual(merged.weddingDateTime, sample.weddingDateTime);
assert.equal(merged.pageData?.ceremonyAddress, sample.pageData?.ceremonyAddress);
assert.equal(merged.pageData?.greetingMessage, sample.pageData?.greetingMessage);
assert.deepEqual(merged.pageData?.giftInfo, sample.pageData?.giftInfo);
assert.equal(merged.features?.showMusic, false);
assert.equal(merged.features?.showGuestbook, false);
assert.equal(isUsableSampleWeddingImage(sample.slug, stored.metadata.images.wedding), false);

const personalized = mergeInvitationSampleFallback(
  {
    ...stored,
    date: '2027년 5월 9일',
    venue: '사용자 웨딩홀',
    weddingDateTime: { year: 2027, month: 4, day: 9, hour: 13, minute: 30 },
    pageData: {
      ...sample.pageData,
      ceremonyAddress: '사용자 입력 주소',
      greetingMessage: '사용자 입력 인사말',
      galleryImages: ['/images/user-photo.jpg'],
    },
  },
  sample
);
assert.equal(personalized.venue, '사용자 웨딩홀');
assert.equal(personalized.pageData?.ceremonyAddress, '사용자 입력 주소');
assert.deepEqual(personalized.pageData?.galleryImages, ['/images/user-photo.jpg']);
```

- [ ] **Step 2: 테스트를 실행해 올바르게 실패하는지 확인**

Run: `npx tsx --conditions react-server scripts/test-sample-invitation-fallback.mts`

Expected: `src/lib/invitationSampleFallback` 모듈이 없어서 실패한다.

- [ ] **Step 3: 최소 폴백 구현 작성**

`src/lib/invitationSampleFallback.ts`에서 다음 규칙을 순수 함수로 구현한다.

```ts
export function mergeInvitationSampleFallback(
  stored: InvitationPageSeed,
  sample: InvitationPageSeed
): InvitationPageSeed;

export function isUsableSampleWeddingImage(
  pageSlug: string,
  imageUrl: string
): boolean;
```

- 공백 문자열은 샘플 문자열로 보완한다.
- 날짜의 `year`, `month`, `day`가 유효 범위를 벗어나면 날짜 객체 전체를 샘플로 보완한다.
- `hour`, `minute`은 유효한 날짜에서 각각 `0-23`, `0-59`를 허용한다.
- `pageData`, `couple`, `metadata`는 필드별로 병합한다.
- 빈 배열은 샘플 배열로 보완하고 항목이 하나라도 있으면 저장 배열을 유지한다.
- 저장된 boolean과 상품 기능 플래그는 그대로 유지한다.
- 로컬 `/images/` URL은 유효하다.
- Firebase `wedding-images` URL은 인코딩된 경로에 현재 slug가 포함될 때만 유효하다.

- [ ] **Step 4: Firestore 읽기 경계에 폴백 연결**

`buildInvitationPageConfigRecordFromEventContent`에서 기존 `normalizeInvitationConfigSeed` 결과를 만든 다음, `getWeddingPageBySlug(eventSummary.slug)`가 존재할 때만 `mergeInvitationSampleFallback(config, sample)`을 호출한다. 샘플이 없는 slug는 기존 `config`를 그대로 반환한다.

- [ ] **Step 5: 테스트 레지스트리에 추가하고 통과 확인**

`scripts/run-test-suite.mjs`의 `core` 배열에 `test-sample-invitation-fallback`을 추가한다.

Run: `node scripts/run-test-suite.mjs test-sample-invitation-fallback`

Expected: PASS, 사용자 값 보존과 빈 값 보완 assertion이 모두 통과한다.

---

### Task 2: 공통 샘플 웨딩 이미지

**Files:**
- Create: `public/images/sample-wedding-romantic.png`
- Create: `src/config/sampleInvitationDefaults.ts`
- Modify: `src/config/pages/shin-minje-kim-hyunji.ts:65-73`
- Modify: `scripts/test-sample-invitation-fallback.mts`

**Interfaces:**
- Produces: `DEFAULT_SAMPLE_WEDDING_IMAGE_URL = '/images/sample-wedding-romantic.png'`
- Consumed by: 등록된 샘플 시드의 `metadata.images.wedding`

- [ ] **Step 1: 로컬 이미지 계약 실패 테스트 추가**

```ts
import fs from 'node:fs';
import { DEFAULT_SAMPLE_WEDDING_IMAGE_URL } from '../src/config/sampleInvitationDefaults';

assert.equal(DEFAULT_SAMPLE_WEDDING_IMAGE_URL, '/images/sample-wedding-romantic.png');
assert.equal(
  fs.existsSync(`public${DEFAULT_SAMPLE_WEDDING_IMAGE_URL}`),
  true,
  '공통 샘플 웨딩 이미지가 public/images에 있어야 합니다.'
);
assert.equal(sample.metadata.images.wedding, DEFAULT_SAMPLE_WEDDING_IMAGE_URL);
```

- [ ] **Step 2: 테스트를 실행해 이미지와 상수가 없어 실패하는지 확인**

Run: `npx tsx --conditions react-server scripts/test-sample-invitation-fallback.mts`

Expected: `sampleInvitationDefaults` 모듈 또는 이미지 파일이 없어 실패한다.

- [ ] **Step 3: GPT Image 2 기반 이미지 생성 기능으로 이미지 생성**

Built-in image generation prompt:

```text
Use case: photorealistic-natural
Asset type: vertical mobile wedding invitation cover image
Primary request: create a timeless romantic outdoor wedding ceremony scene that can be reused as generic sample content
Scene/backdrop: elegant ivory floral arch in a quiet garden, soft greenery, sheer fabric, no people
Style/medium: high-end editorial wedding photography, photorealistic
Composition/framing: portrait composition, centered ceremony arch, generous clean negative space, suitable for text overlay
Lighting/mood: soft warm natural morning light, calm and refined
Color palette: ivory, pale blush pink, muted sage green
Constraints: no people, no readable text, no logo, no watermark, no brand marks
Avoid: excessive decorations, saturated colors, fantasy effects, visible signage
```

생성 결과를 시각적으로 확인한 뒤 프로젝트 자산 `public/images/sample-wedding-romantic.png`로 복사한다. 기존 파일을 덮어쓰지 않는다.

- [ ] **Step 4: 공통 상수와 샘플 시드 연결**

`src/config/sampleInvitationDefaults.ts`:

```ts
export const DEFAULT_SAMPLE_WEDDING_IMAGE_URL =
  '/images/sample-wedding-romantic.png';
```

`shin-minje-kim-hyunji.ts`의 `metadata.images.wedding`은 위 상수를 사용한다.

- [ ] **Step 5: 이미지 계약 테스트 통과 확인**

Run: `node scripts/run-test-suite.mjs test-sample-invitation-fallback`

Expected: PASS, 로컬 이미지 파일과 샘플 시드 URL이 확인된다.

---

### Task 3: 로맨틱 테마 빈 상태 안정화

**Files:**
- Create: `src/app/_components/themeRenderers/romanticState.ts`
- Create: `scripts/test-romantic-empty-state.mts`
- Modify: `src/app/_components/themeRenderers/romantic.tsx:561-612, 1189-1295`
- Modify: `scripts/run-test-suite.mjs`

**Interfaces:**
- Produces: `resolveRomanticInfoTab(input): RomanticInfoTab | null`
- Produces: `shouldRenderRomanticGallery(images: readonly string[], imagesLoading: boolean): boolean`
- Produces: `shouldRenderRomanticLocation(input): boolean`

- [ ] **Step 1: 빈 상태 실패 테스트 작성**

```ts
import assert from 'node:assert/strict';
import {
  resolveRomanticInfoTab,
  shouldRenderRomanticGallery,
  shouldRenderRomanticLocation,
} from '../src/app/_components/themeRenderers/romanticState';

assert.equal(
  resolveRomanticInfoTab({
    activeTab: 'detail',
    hasSummary: false,
    hasScheduleDetail: false,
    hasGuide: false,
  }),
  null
);
assert.equal(
  resolveRomanticInfoTab({
    activeTab: 'summary',
    hasSummary: true,
    hasScheduleDetail: false,
    hasGuide: false,
  }),
  'summary'
);
assert.equal(shouldRenderRomanticGallery([], false), false);
assert.equal(shouldRenderRomanticGallery([], true), true);
assert.equal(
  shouldRenderRomanticLocation({
    venue: '',
    address: '',
    description: '',
    contact: '',
    latitude: 0,
    longitude: 0,
  }),
  false
);
```

- [ ] **Step 2: 테스트를 실행해 모듈 부재로 실패하는지 확인**

Run: `npx tsx --conditions react-server scripts/test-romantic-empty-state.mts`

Expected: `romanticState` 모듈이 없어서 실패한다.

- [ ] **Step 3: 순수 상태 정책 최소 구현**

`resolveRomanticInfoTab`은 사용 가능한 탭이 하나도 없으면 `null`, 현재 탭이 유효하면 현재 탭, 아니면 `summary → detail → guide` 순서의 첫 유효 탭을 반환한다. 갤러리는 로딩 중이거나 이미지가 있을 때만 렌더링하고, 위치는 텍스트 행 또는 유효한 좌표가 있을 때만 렌더링한다.

- [ ] **Step 4: 로맨틱 렌더러에 정책 적용**

- `RomanticScheduleSection`은 데이터 존재 여부만 계산하는 wrapper로 유지하고, 유효 탭이 없으면 hook을 사용하지 않는 `null` 경로를 반환한다. 유효 탭이 있을 때만 새 내부 컴포넌트 `RomanticScheduleContent`를 렌더링하며, `useState`와 `useEffect`는 이 내부 컴포넌트에 둔다.
- effect에서는 `resolvedTab !== activeTab`일 때만 `setActiveTab(resolvedTab)`을 호출한다.
- 갤러리 섹션은 `shouldRenderRomanticGallery`가 `false`면 섹션 전체를 반환하지 않는다.
- 위치 섹션은 `shouldRenderRomanticLocation`이 `false`면 섹션 전체를 반환하지 않는다.

- [ ] **Step 5: 테스트 레지스트리 추가 및 통과 확인**

`scripts/run-test-suite.mjs`의 `core` 배열에 `test-romantic-empty-state`를 추가한다.

Run: `node scripts/run-test-suite.mjs test-romantic-empty-state`

Expected: PASS, 빈 데이터에서 유효 탭이 없고 빈 섹션이 숨겨진다.

---

### Task 4: 통합 검증과 브라우저 QA

**Files:**
- Verify: `src/lib/invitationSampleFallback.ts`
- Verify: `src/server/repositories/eventReadThroughDtos.ts`
- Verify: `src/app/_components/themeRenderers/romantic.tsx`
- Verify: `public/images/sample-wedding-romantic.png`

**Interfaces:**
- Consumes: Tasks 1-3의 폴백 정책, 이미지 상수, 로맨틱 상태 정책
- Produces: 공개 로맨틱 샘플 페이지의 정상 렌더링 근거

- [ ] **Step 1: 관련 테스트 실행**

Run: `node scripts/run-test-suite.mjs test-sample-invitation-fallback`

Expected: PASS.

Run: `node scripts/run-test-suite.mjs test-romantic-empty-state`

Expected: PASS.

- [ ] **Step 2: 정적 검증 실행**

Run: `npx eslint src/lib/invitationSampleFallback.ts src/server/repositories/eventReadThroughDtos.ts src/app/_components/themeRenderers/romantic.tsx src/app/_components/themeRenderers/romanticState.ts src/config/sampleInvitationDefaults.ts src/config/pages/shin-minje-kim-hyunji.ts scripts/test-sample-invitation-fallback.mts scripts/test-romantic-empty-state.mts`

Expected: exit 0.

Run: `npm run typecheck:web`

Expected: exit 0.

- [ ] **Step 3: 전체 로컬 테스트 실행**

Run: `npm test`

Expected: 모든 core, security, architecture 테스트가 통과하고 exit 0.

- [ ] **Step 4: 모바일 브라우저 확인**

`http://localhost:3000/kim-shinlang-na-sinbu/romantic/`을 390×844 화면으로 연다.

확인 항목:

- 날짜가 `2026년 4월 14일`, 시간이 `오후 3:00`으로 표시된다.
- 생성한 표지 이미지의 `naturalWidth`와 `naturalHeight`가 0보다 크다.
- 인사말, 예식 안내, 위치, 계좌 정보가 샘플 값으로 표시된다.
- 가로 오버플로가 없다.
- 콘솔에 `Maximum update depth exceeded`가 없다.
- 하단 카카오 공유 버튼이 푸터와 겹치지 않는다.

- [ ] **Step 5: 데스크톱 브라우저 확인**

기본 데스크톱 viewport에서 500px 청첩장 본문이 중앙 정렬되고, 생성 이미지와 모든 데이터 섹션이 표시되는지 확인한다.

- [ ] **Step 6: 실제 입력값 우선순위 최종 확인**

자동 테스트의 personalized fixture가 샘플값보다 우선함을 다시 확인한다. 운영 데이터 쓰기나 실제 사용자 데이터 수정은 수행하지 않는다.
