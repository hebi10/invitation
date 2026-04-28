# 모바일 청첩장 운영 서비스 포트폴리오 정리

## 1. 한 줄 소개
모바일 청첩장의 생성, 공개, 관리자 편집, 운영 관리, 추억 페이지 확장까지 한 흐름으로 다루는 Next.js + Firebase 기반 운영형 서비스입니다.

단순히 예쁜 청첩장 화면을 만드는 프로젝트가 아니라, 관리자가 여러 청첩장을 생성·편집·운영하고 하객이 공개 페이지를 보는 실제 서비스 흐름을 목표로 합니다.

## 2. 서비스가 해결하는 문제
- 청첩장 생성과 수정 과정이 운영자에게 반복 부담이 되는 문제
- 웹 편집 권한을 관리자 전용으로 통제해 운영 실수를 줄여야 하는 문제
- 공개 여부, 비밀번호, 노출 기간, 이미지, 방명록 같은 운영 요소가 흩어지는 문제
- 결혼식 이후 추억 페이지까지 이어지는 경험이 분리되는 문제

## 3. 핵심 사용자
| 사용자 | 주요 행동 | 서비스 가치 |
| --- | --- | --- |
| 하객 | 공개 청첩장 확인, 지도/갤러리/방명록/공유 사용 | 모바일에서 빠르게 필요한 정보를 확인 |
| 고객 | 공개 청첩장 확인, 필요 시 운영자에게 수정 요청 | 공개된 청첩장 정보를 안정적으로 확인 |
| 관리자 | 청첩장 생성, 편집, 공개 상태, 노출 기간, 비밀번호, 이미지 관리 | 여러 페이지를 한 콘솔에서 운영 |

## 4. 전체 흐름
1. 관리자가 `/page-wizard`에서 청첩장 초안을 생성합니다.
2. 위자드가 기본 정보, 일정, 장소, 이미지, 인사말, 계좌, 최종 확인을 단계별로 저장합니다.
3. Firestore는 `events/{eventId}`와 `events/{eventId}/content/current`를 기준으로 공개 상태와 본문을 관리합니다.
4. 하객은 `/{slug}` 또는 `/{slug}/{theme}`에서 공개 청첩장을 봅니다.
5. 관리자는 `/page-editor/{slug}`에서 고객 편집기 화면을 열어 내용을 수정합니다.
6. 관리자는 `/admin`에서 공개 상태, 비밀번호, 노출 기간, 이미지, 방명록을 운영합니다.
7. 결혼식 이후 `/memory/{slug}` 추억 페이지로 경험을 확장할 수 있습니다.

## 5. 화면 요약
| 화면 | 역할 | 강조 포인트 | 추천 캡처 |
| --- | --- | --- | --- |
| `/` | 서비스 진입 화면 | 주요 이동 경로를 단순하게 제시 | `screenshots/01-home.png` |
| `/admin` | 관리자 콘솔 | 운영 요소를 한 화면에서 관리 | `screenshots/02-admin-dashboard.png` |
| `/admin?tab=pages` | 청첩장 목록 관리 | 공개 상태, 테마 링크, 편집 이동 | `screenshots/03-admin-pages-tab.png` |
| `/admin?tab=passwords` | 고객 편집 비밀번호 관리 | 운영자 권한과 고객 편집 권한 분리 | `screenshots/04-admin-passwords-tab.png` |
| `/admin?tab=periods` | 노출 기간 관리 | 공개 여부와 노출 기간을 분리 | `screenshots/05-admin-periods-tab.png` |
| `/page-wizard` | 신규 초안 생성 | 템플릿과 slug 기반 빠른 시작 | `screenshots/06-page-wizard-create.png` |
| `/page-wizard/{slug}` | 관리자 위자드 편집 | 모바일 중심 단계형 입력 흐름 | `screenshots/07-page-wizard-detail.png` |
| `/page-wizard/{slug}/result` | 저장 결과 확인 | 저장 직후 공개 URL과 입력 요약 확인 | `screenshots/08-page-wizard-result.png` |
| `/page-editor` | 관리자 전용 고객 편집 시작 | 관리자만 draft 생성 또는 진입 가능 | `screenshots/09-page-editor-create.png` |
| `/page-editor/{slug}` | 관리자 전용 고객 편집기 | 관리자 권한 확인, 자동 저장, 미리보기 | `screenshots/10-page-editor-detail.png` |
| `/{slug}/emotional` | 감성형 공개 청첩장 | 사진과 분위기 중심 공개 화면 | `screenshots/11-public-emotional.png` |
| `/{slug}/simple` | 심플형 공개 청첩장 | 같은 데이터의 정보 중심 테마 | `screenshots/12-public-simple.png` |
| `/memory/{slug}` | 추억 페이지 | 결혼식 이후 기록 확장 | `screenshots/13-memory-page.png` |

## 6. 기술 구조
| 영역 | 구현 기준 |
| --- | --- |
| 프론트엔드 | Next.js App Router, React, TypeScript |
| 모바일 앱 | `apps/mobile` Expo 프로젝트 |
| 데이터 | Firestore `events`, `eventSlugIndex`, `eventSecrets`, `billingFulfillments`, `rateLimits` |
| 파일 | Firebase Storage, 공개 읽기는 Firestore 공개 상태와 연동 |
| 권한 | 웹 편집은 관리자 전용, 모바일 고객 흐름과 공개 방문자는 API와 rules에서 분리 |
| 운영 방어 | 서버 repository 경계, Firestore 기반 rate limit, RevenueCat 서버 키 검증 |

## 7. 데이터 흐름
### 공개 청첩장
`slug`가 `eventSlugIndex/{slug}`에서 `eventId`로 해석되고, 공개 상태와 표시 기간을 통과하면 `events/{eventId}`와 `content/current`를 렌더링합니다.

### 관리자 편집 저장
웹 편집기는 관리자 권한 확인 후 저장하고, 서버는 repository 계층을 통해 Firestore에 기록합니다. 직접 Firestore 접근은 경계 테스트에서 차단합니다.

### 이미지 업로드
편집기에서 Storage에 업로드한 뒤 URL과 메타데이터를 청첩장 설정에 연결합니다. 공개 파일 읽기는 공개 이벤트 상태와 연결됩니다.

## 8. 보여줄 수 있는 강점
- 랜딩 페이지가 아니라 생성, 편집, 공개, 운영, 사후 페이지까지 이어지는 서비스 구조
- 웹 편집을 관리자 전용으로 제한하고 모바일 고객 흐름과 분리한 운영 모델
- 공개 상태와 표시 기간을 함께 다루는 실제 운영 정책
- 테마 렌더러와 이벤트 타입을 확장할 수 있는 구조
- repository 경계와 QA 스크립트로 데이터 접근 원칙을 검증하는 흐름

## 9. 면접 설명 예시
> 모바일 청첩장을 단순히 보여주는 화면이 아니라, 관리자가 생성·편집·운영하고 하객이 확인하는 운영형 서비스로 만들었습니다. Firestore의 이벤트 도메인을 source of truth로 두고, 공개 URL은 slug index로 해석하며, 권한이 필요한 작업은 API와 repository 계층을 거치도록 정리했습니다.

기술 포인트를 설명할 때는 다음 순서가 좋습니다.
1. 왜 운영형 구조가 필요한지 설명합니다.
2. 관리자, 모바일 고객 흐름, 하객의 권한과 화면을 분리한 이유를 설명합니다.
3. Firestore 이벤트 도메인과 repository 경계로 안정성을 확보한 방식을 설명합니다.
4. 테마와 추억 페이지로 확장 가능한 구조를 설명합니다.

## 10. 캡처 우선순위
1. 공개 청첩장 감성형
2. 관리자 전용 고객 편집기
3. 관리자 대시보드
4. 위자드 편집 화면
5. 노출 기간 또는 비밀번호 관리 탭
6. 추억 페이지

## 11. 참고 문서
- 이벤트 도메인 현재 기준: `event-domain-current-state.md`
- 운영 모니터링: `event-rollout-monitoring.md`
- 서비스와 저장소 경계: `service-repository-boundary.md`
- 보안 정리와 검증: `security-hardening-checklist.md`
