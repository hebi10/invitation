---
target: 전반적인 프로젝트
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
timestamp: 2026-08-13T01-16-54Z
slug: src-app-admin-adminpageclient-tsx
---
# Invitation 프로젝트 전반 평가

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3 | 로딩·변경·toast는 충실하나 카운트 필터의 적용 상태가 불명확 |
| 2 | Match System / Real World | 3 | 운영 용어는 자연스럽지만 상품 등급과 연결 정책 설명이 부족 |
| 3 | User Control and Freedom | 3 | 닫기·초기화·확인은 있으나 상태 변경 undo가 없음 |
| 4 | Consistency and Standards | 3 | 전반적으로 일관되나 일부 그라디언트·직접 색상 지정이 디자인 원칙과 충돌 |
| 5 | Error Prevention | 3 | 위험 작업 확인은 좋지만 비원자적 삭제의 부분 실패 복구가 약함 |
| 6 | Recognition Rather Than Recall | 3 | 주요 상태는 노출되나 상세 탭 간 핵심 맥락 유지가 제한적 |
| 7 | Flexibility and Efficiency | 1 | 일괄 처리와 키보드 가속 수단 부재 |
| 8 | Aesthetic and Minimalist Design | 3 | 절제되어 있으나 상단 카운트·필터·액션이 동시에 경쟁 |
| 9 | Error Recovery | 3 | 오류 문구와 재시도는 있으나 부분 실패의 다음 행동이 불충분 |
| 10 | Help and Documentation | 1 | 고위험 작업·등급·고객 연결에 대한 화면 내 도움 부족 |
| **Total** | | **26/40** | **Acceptable** |

## Design Specificity Verdict

정보 구조는 이벤트 유형, 공개 상태, 고객 연결, 상품 등급, 테마, 노출 기간을 중심으로 이 서비스에 맞게 설계되어 있다. 반면 시스템 고딕, 흰 표면, 차콜 액션, 표·필터·측면 상세 패널은 범용 SaaS 운영 도구에도 그대로 적용될 수 있다. 초대장 운영만의 식별성은 행사일, 공개 만료, 고객 연결 위험을 한눈에 읽는 고유한 상태 문법에서 더 강화할 수 있다.

자동 탐지는 `src/app/admin/AdminPageClient.tsx`에서 0건을 반환했다. 다만 조합된 하위 컴포넌트와 CSS는 단일 파일 탐지 범위 밖이다. 소스 검토에서는 `src/app/admin/page.module.css`의 일부 그라디언트와 직접 지정 위험색이 DESIGN.md의 웜 그래파이트·평면 원칙과 충돌했다. 브라우저의 변경 API가 읽기 전용이라 시각 오버레이는 주입하지 못했다.

## Overall Impression

포트폴리오 범위를 넘어 실제 운영을 고려한 구조다. 인증·권한·저장소 경계·정책 테스트는 강하고, 가장 큰 기회는 관리자 데이터 접근을 규모에 맞게 바꾸고 반복 운영을 일괄 처리로 단축하며 고위험 삭제를 복구 가능한 작업으로 만드는 것이다.

## What's Working

- 검색 → 상태 확인 → 상세 조치의 관리자 정보 구조가 직접적이다.
- 위험 작업을 분리하고 확인, 진행 라벨, toast, focus trap, `aria-live`를 결합했다.
- 서버 API 인증, repository 경계, deny-by-default 규칙, 소유권 초대와 결제 멱등성 등 보안·데이터 설계가 탄탄하다.

## Priority Issues

### P1 — 관리자 전체 스캔과 N+1 조회

이벤트, 댓글, 고객 목록이 전체 데이터를 읽고 클라이언트에서 페이지를 나누는 경로가 있다. 데이터가 늘면 지연과 Firestore/Auth 비용이 빠르게 증가한다. API에 cursor, pageSize, filter, sort를 전달하고 서버 쿼리와 인덱스로 페이지네이션하며, 목록 표시 필드는 summary에 비정규화한다. 댓글은 collection-group 쿼리를 검토한다.

Suggested command: `$impeccable optimize`

### P1 — 완전 삭제의 비원자적 다단계 처리

서브컬렉션과 참조를 여러 batch로 삭제하므로 중간 실패 시 orphan 또는 부분 삭제가 남을 수 있다. `deletionState=pending`으로 공개·편집을 먼저 차단하고 작업 ID, 단계 checkpoint, audit를 저장하는 멱등성 서버 작업으로 전환한다. UI에는 진행, 부분 실패, 재시도 상태를 표시한다.

Suggested command: `$impeccable harden`

### P1 — 대량 운영 효율성과 키보드 가속 부재

목록이 단건 상세 진입 중심이라 수십 건의 공개 상태나 연결 상태를 한 건씩 처리해야 한다. 체크박스 선택과 안전한 batch action bar를 추가하고, 위험 bulk 작업은 대상 수와 목록을 확인시킨다.

Suggested command: `$impeccable shape`

### P1 — tablist 키보드 규약 불완전

`role=tab`과 선택 상태는 있으나 roving tabindex와 ArrowLeft/Right, Home/End 처리가 없다. 키보드·스크린리더 사용자는 탭을 비효율적으로 순회한다. 활성 탭만 `tabIndex=0`으로 두고 표준 키 조작을 구현한다.

Suggested command: `$impeccable audit`

### P2 — 필터·상태·도움말의 인지 부하

카운트 4개, 필터 5개, 상단 액션과 최대 6개 상세 탭이 동시에 노출된다. 검색과 핵심 상태를 1차로 두고 유형·소유권·정렬은 고급 필터로 접는다. 적용 필터 chip과 개수를 표시하고, 등급·연결 링크·공개 기간의 관계를 결정 지점에서 설명한다.

Suggested command: `$impeccable distill`

## Persona Red Flags

- **Alex(파워 유저):** batch action, 단축키, 최근 작업 목록이 없어 다건 처리가 느리다.
- **Sam(키보드·스크린리더):** dialog와 live region은 좋지만 tablist 화살표 조작과 카운트 필터의 `aria-pressed`가 빠져 있다. 인증된 관리자 화면의 200% 확대는 미검증이다.
- **Riley(스트레스 테스터):** 부분 실패, 동시 수정, 긴 이름, 수천 건 데이터의 E2E 근거가 부족하고 완전 삭제의 중간 실패가 특히 위험하다.

## Minor Observations

- 로그인 카드에서 “관리자 로그인” 제목이 중복된다.
- `Admin Access`만 영문이라 한국어 운영 화면과 톤이 다르다.
- 고객 페이지가 새 탭으로 열리는 사실을 문구에서 알리지 않는다.
- 공개 홈의 모바일 브랜드 링크 높이는 약 23.8px로 44px 터치 목표에 미달했다.
- 실제 UI 동작을 검증하는 Playwright/RTL 계열 테스트가 없고 일부 테스트는 소스 문자열 존재 확인에 머문다.

## Questions to Consider

- 이 콘솔의 핵심 성공 지표는 “한 건을 10초 안에 찾기”인가, “오늘 조치가 필요한 건을 모두 처리하기”인가?
- 첫 화면이 전체 현황보다 만료 임박, 고객 미연결, 최근 방명록 같은 작업 큐를 우선해야 하는가?
- 완전 삭제는 즉시 완료보다 복구 가능한 비동기 작업으로 보이는 편이 운영자에게 더 신뢰를 주지 않는가?
