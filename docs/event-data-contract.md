# 이벤트 데이터 계약서

## 목적
- `events` 구조의 필수/nullable/optional 정책을 고정한다.
- 서비스, 마이그레이션, QA, 신규 개발이 같은 저장 기준을 보도록 만든다.
- 레거시 제거 전까지 어떤 컬렉션을 건드리면 안 되는지 명시한다.

## nullable / optional 정책

### 기본 원칙
- 최종 Firestore 문서에서는 optional보다 explicit null을 우선한다.
- 문서 shape가 자주 흔들리면 조회/검증/마이그레이션이 어려워지므로, 핵심 필드는 가능한 한 항상 존재해야 한다.
- "없을 수 있음"은 두 가지로만 구분한다.
  - 필수지만 값이 없을 수 있음: `null`
  - 진짜 확장용 비핵심 필드: 생략 가능

### 필수 필드
- `events/{eventId}`
  - `slug`
  - `eventType`
  - `status`
  - `title`
  - `defaultTheme`
  - `supportedVariants`
  - `hasCustomConfig`
  - `visibility`
  - `stats`
  - `createdAt`
  - `updatedAt`
  - `version`
- `eventSecrets/{eventId}`
  - `passwordHash`
  - `passwordVersion`
  - `updatedAt`
- `eventSlugIndex/{slug}`
  - `eventId`
  - `status`
  - `updatedAt`

### nullable 필드
- `visibility.displayStartAt`
- `visibility.displayEndAt`
- `billingFulfillments.fulfilledAt`
- `events/{eventId}/comments/{commentId}`의 복구/삭제 시각 필드
- `events/{eventId}/linkTokens/{tokenId}`의 사용/폐기 시각 필드

### optional 허용 필드
- `events/{eventId}/content/current.customSections`
- `events/{eventId}/content/current.pageData` 내부의 theme 확장 필드
- `events/{eventId}/auditLogs/{logId}.payload` 내부 확장 필드

## 공통 타입 정의

```ts
type EventStatus = 'draft' | 'active' | 'archived' | 'deleted';
type EventType = 'wedding' | 'birthday' | 'seventieth' | 'etc';
type CommentStatus = 'public' | 'hidden' | 'pending_delete';
type SlugIndexStatus = 'active' | 'redirect' | 'revoked';
type BillingStatus = 'processing' | 'fulfilled' | 'failed';

interface EventSummaryDoc {
  slug: string;
  eventType: EventType;
  status: EventStatus;
  title: string;
  defaultTheme: string;
  supportedVariants: string[];
  hasCustomConfig: boolean;
  visibility: {
    published: boolean;
    displayStartAt: Timestamp | null;
    displayEndAt: Timestamp | null;
  };
  stats: {
    commentCount: number;
    ticketBalance: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number;
}

interface EventContentDoc {
  greeting: Record<string, unknown> | null;
  ceremony: Record<string, unknown> | null;
  reception: Record<string, unknown> | null;
  gallery: Record<string, unknown> | null;
  contact: Record<string, unknown> | null;
  location: Record<string, unknown> | null;
  customSections?: Array<Record<string, unknown>>;
  pageData: Record<string, unknown>;
  schemaVersion: number;
  updatedAt: Timestamp;
}

interface EventCommentDoc {
  author: string;
  message: string;
  createdAt: Timestamp;
  status: CommentStatus;
}

interface EventLinkTokenDoc {
  tokenHash: string;
  expiresAt: Timestamp;
  createdAt: Timestamp;
}

interface EventAuditLogDoc {
  type: string;
  actor: Record<string, unknown>;
  payload: Record<string, unknown>;
  createdAt: Timestamp;
}

interface EventSecretDoc {
  passwordHash: string;
  passwordVersion: number;
  updatedAt: Timestamp;
}

interface EventSlugIndexDoc {
  eventId: string;
  status: SlugIndexStatus;
  updatedAt: Timestamp;
}

interface BillingFulfillmentDoc {
  eventId: string | null;
  productType: string;
  status: BillingStatus;
  provider: string;
  fulfilledAt: Timestamp | null;
  createdAt: Timestamp;
}
```

## 마이그레이션 대상 컬렉션 목록
- `invitation-page-configs`
- `invitation-page-registry`
- `display-periods`
- `client-passwords`
- `guestbooks/{pageSlug}/comments`
- `page-ticket-balances`
- `mobile-client-editor-link-tokens`
- `mobile-client-editor-audit-logs`
- `mobile-billing-fulfillments`

## 제거 금지 컬렉션 목록
- `memory-pages`
  - 이벤트 도메인과 별도다.
- `admin-users`
  - 관리자 인증 기준 데이터다.
- `invitation-page-configs`
- `invitation-page-registry`
- `display-periods`
- `client-passwords`
- `guestbooks`
- `page-ticket-balances`
- `mobile-client-editor-link-tokens`
- `mobile-client-editor-audit-logs`
- `mobile-billing-fulfillments`

위 컬렉션은 다음 조건 전까지 삭제 금지다.
- backfill 완료
- read-through 검증 완료
- write-through partial failure 정리 완료
- `event-only` 컷오버 완료
- 운영 QA 완료

## source of truth 원칙
- 마이그레이션 기간:
  - 읽기: `events` 우선, legacy fallback 허용
  - 쓰기: legacy + event 병행 허용
- 최종 상태:
  - 읽기: `events`만 사용
  - 쓰기: `events`만 사용
  - 신규 기능: legacy 컬렉션 접근 금지

## 신규 기능 개발 규칙
- 신규 기능은 레거시 컬렉션명을 직접 참조하면 안 된다.
- 신규 기능에서 event type을 판단할 때는 `src/lib/eventTypes.ts`를 기준으로 한다.
- 신규 기능에서 slug 조회가 필요하면 `eventSlugIndex`를 기준으로 설계한다.
- 본문 원본은 `events/{eventId}/content/current`만 기준으로 본다.
- 민감 정보는 `eventSecrets`로 분리한다.
