# 모바일 청첩장 연동 정책

## 목적
- Expo 모바일 앱, Next API, Firebase 저장소가 같은 기준으로 청첩장 연동을 처리하도록 정책을 고정한다.
- 로그인 UX, 생성 규칙, 권한 모델, 고위험 작업 보호, 1회용 연동 링크를 구현할 때 공통 기준으로 사용한다.

## 사용자 노출 용어
- 사용자 문구는 `청첩장 연동`, `청첩장 링크 또는 주소`, `연동 비밀번호`로 통일한다.
- `slug`, `pageSlug`, `slugBase`는 개발 내부 용어로만 사용한다.
- 로그인과 운영 화면에서는 raw slug를 기본값으로 노출하지 않는다.

## 로그인과 생성 기준
- 로그인 입력은 `청첩장 링크 또는 주소`를 기준으로 한다.
- 전체 URL을 붙여넣어도 내부에서 slug를 추출해 연동한다.
- 청첩장 생성은 `자동 주소 제안 + 선택 수정`을 기본으로 한다.
- 최종 unique slug는 서버가 확정한다.
- 주소 규칙, 예약어, 중복 판단은 프론트와 서버가 같은 기준을 사용한다.

## 모바일 세션과 권한
- 모바일 관리 기능은 서버 세션 기준으로만 검증한다.
- `pageSlug` 파라미터만으로 권한을 판단하지 않는다.
- owner session 기본 capability는 아래 기준으로 운영한다.
  - `canViewDashboard`
  - `canEditInvitation`
  - `canManageGuestbook`
  - `canUploadImages`
  - `canManagePublication`
  - `canManageDisplayPeriod`
  - `canManageTickets`
  - `canIssueLinkToken`
- 클라이언트는 capability를 버튼 노출 제어에만 사용하고, 최종 허용 여부는 서버가 결정한다.

## 방명록 운영 정책
- 방명록 관리에는 매번 추가 인증을 요구하지 않는다.
- owner session이면 `공개`, `숨김`, `삭제 예정`, `복구`를 수행할 수 있다.
- 삭제는 소프트 삭제를 우선으로 하며, `pending_delete` 댓글은 30일 보관 후 정리한다.
- 하객 화면에는 `hidden`, `pending_delete` 댓글을 노출하지 않는다.

## 고위험 작업 보호
- 모든 작업에 재인증을 요구하지 않는다.
- 아래 작업은 최근 인증과 감사 로그를 포함한 고위험 보호를 적용한다.
  - 비공개 청첩장의 공개 전환
  - 티켓 차감이 발생하는 디자인 변경
  - 디자인 추가 구매
  - 노출 기간 연장 또는 유료 노출 기간 변경
  - 티켓 이동
  - 앱 연동 링크 발급 및 폐기
  - 향후 추가될 비밀번호 변경, 청첩장 삭제, 방명록 전체 삭제
- 보호 방식은 아래 순서를 따른다.
  - 확인 모달 노출
  - 필요 시 연동 비밀번호 재입력
  - 10분 TTL의 step-up 세션 발급
  - 기존 mutation rate limit + 재인증 전용 rate limit 적용
  - 서버 audit log 기록

## 1회용 앱 연동 링크 정책
- 앱 연동 링크는 `mobile-login` 목적의 1회용 토큰으로 발급한다.
- 저장소에는 raw token을 남기지 않고 `tokenHash`만 저장한다.
- 기본 정책은 아래와 같다.
  - 유효시간 15분
  - 1회 사용 후 즉시 `usedAt` 기록
  - 새 링크 발급 시 기존 활성 링크 자동 폐기
  - 수동 폐기 시 `revokedAt` 기록
  - 비밀번호 버전이 바뀌면 기존 링크는 자동 무효화
- 반환 링크는 아래 두 종류를 제공한다.
  - 앱 스킴: `mobileinvitation://login?...`
  - 웹 fallback: `https://msgnote.kr/app/login?...`

## 현재 구현 기준
- 모바일 로그인은 URL 또는 slug 입력을 이미 지원한다.
  - `apps/mobile/src/components/LoginCard.tsx`
- 모바일 owner session은 서버에서 `pageSlug`, `passwordVersion`, 만료 시간을 검증한다.
  - `src/server/clientEditorSessionAuth.ts`
- 고위험 재인증은 전용 verify API와 step-up 토큰으로 처리한다.
  - `src/app/api/mobile/client-editor/high-risk/verify/route.ts`
  - `src/server/mobileClientEditorHighRisk.ts`
- 앱 연동 링크는 발급, 교환, 폐기 API와 Firestore 컬렉션으로 관리한다.
  - `src/app/api/mobile/client-editor/link-tokens/route.ts`
  - `src/app/api/mobile/client-editor/link-tokens/exchange/route.ts`
  - `src/server/mobileClientEditorLinkToken.ts`
- 앱은 `login?linkToken=...` 딥링크를 받으면 로그인 화면에서 자동 교환을 시도한다.
  - `apps/mobile/src/lib/appDeepLink.ts`
  - `apps/mobile/src/app/login.tsx`

## 후속 작업
- 앱 연동 링크의 사용 이력 조회 UI가 필요하면 운영 화면에 최근 발급 상태를 추가한다.
- 앱 미설치 사용자를 위한 설치 안내 분기나 스토어 이동 문구는 fallback 페이지에서 확장할 수 있다.
- 모바일 비밀번호 변경, 청첩장 삭제, 방명록 전체 삭제 API가 추가되면 같은 high-risk helper를 재사용한다.
