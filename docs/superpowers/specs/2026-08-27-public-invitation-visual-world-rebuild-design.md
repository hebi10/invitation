# 공개 초대장 디자인 세계관 및 구조 재편 설계

## 목표

모바일 공개 초대장 12개 테마를 색상 변형 템플릿에서 벗어나, 이벤트 유형별 서사와 정보 구조가 분명한 초대 경험으로 교체한다. 기존 데이터 모델, 공개 URL, Firebase/API, 공유·지도·방명록·음악 같은 기능 계약은 보존한다.

## 범위

- 웨딩 4종, 돌잔치 2종, 생일 2종, 개업 2종, 일반행사 2종의 공개 렌더러·스타일·테마 이름/설명/샘플 메타데이터
- 공개 초대장 관련 파일의 역할 기반 폴더와 파일명 정리
- 빈 이미지, 미구현 RSVP, 불필요한 로더·인트로 제거
- 390px 모바일, 데스크톱, 키보드 접근성, 빈 데이터와 긴 텍스트 회귀 검증

## 범위 밖

- 저장 스키마, 공개 경로, API 응답, Firebase 규칙, 인증/인가 변경
- 관리자·위저드·모바일 네이티브 앱의 정보 구조 변경
- 검증되지 않은 브랜드 문구나 혜택 생성

## 디자인 원칙

공통 기능은 공유하되, 히어로·섹션 순서·구분 방식·빈 상태는 이벤트 유형 전용으로 만든다. 기본 영문 키커, 큰 라운드 카드, 고정 그림자, 장식성 그라데이션, 강제 로더는 사용하지 않는다. 이미지가 없을 때는 빈 프레임 대신 정보로 조판한 대체 화면을 제공한다.

### 웨딩: Letterpress 계열

사진, 이름, 날짜, 여백과 얇은 선을 중심으로 인쇄물 같은 첫 장면을 만든다. 초대 문장, 일정과 장소, 가족 연락처·계좌, 사진, 방명록 순으로 이어진다. 현재 `classic-r`의 절제된 출발점을 발전시키되 공용 Simple 카드 의존은 제거한다.

### 돌잔치·생일: Chapter 계열

아이의 이름·나이·날짜가 만드는 기록형 조판을 첫 장에 둔다. 성장의 한 장면, 파티 일정, 오시는 길, 축하 메시지 순으로 구성한다. 포인트색은 테마별 한 색만 쓰고 꽃·그라데이션 장식은 배제한다.

### 개업: Studio Opening 계열

브랜드명, 한 줄 소개, 공간/서비스, 오픈 혜택, 방문 정보를 순서대로 보여준다. 별도 진입 화면과 `오픈 준비 중` 빈 상태는 제거한다. 카드 대신 정렬된 문장 블록과 브랜드색 한 가지로 위계를 만든다.

### 일반행사: Schedule Edition 계열

행사명·날짜·장소를 포스터처럼 보여주고, 세로 프로그램 타임라인과 실제 참여 방법을 제공한다. RSVP가 실행 가능한 링크·연락 수단과 함께 존재할 때만 노출한다.

## 새 테마 이름과 매핑

기존 키와 공개 경로는 호환성을 위해 유지한다. 사용자에게 보이는 라벨, 설명, 미리보기만 새 세계관에 맞춘다.

| 이벤트 | 기존 키 | 새 사용자 라벨 | 핵심 차별 |
| --- | --- | --- | --- |
| 웨딩 | emotional | Portrait Letter | 사진 중심 여백 |
| 웨딩 | romantic | Garden Note | 식물성 리듬과 편지형 인사말 |
| 웨딩 | simple | Quiet Ceremony | 정보 우선 인쇄물 |
| 웨딩 | classic-r | Letterpress | 고전 활자·얇은 선 |
| 돌잔치 | first-birthday-pink | First Chapter | 성장 기록과 밝은 포인트 |
| 돌잔치 | first-birthday-mint | Dawn Chapter | 차분한 기록과 여백 |
| 생일 | birthday-minimal | Party Notes | 일정 우선 파티 노트 |
| 생일 | birthday-floral | Birthday Story | 사진·메시지 중심 기록 |
| 개업 | opening-natural | Studio Opening | 브랜드 소개서 |
| 개업 | opening-modern | Opening Poster | 대담한 브랜드 포스터 |
| 일반행사 | general-event-elegant | Program Edition | 격식 있는 세로 프로그램 |
| 일반행사 | general-event-vivid | Night Schedule | 야간 프로그램 포스터 |

## 파일 구조

공개 초대장 전용 코드는 `src/app/_components/public-invitations/` 아래에 배치한다. 이벤트 유형별 폴더는 전용 페이지·뷰 모델·스타일만 가지며, 지도·연락처·갤러리·방명록·이미지 대체 조판처럼 기능적인 조각은 `shared/`에 둔다.

```text
src/app/_components/public-invitations/
  shared/
    actions/
    media/
    sections/
    models/
  wedding/
    portrait-letter/
    garden-note/
    quiet-ceremony/
    letterpress/
  first-birthday/
    first-chapter/
    dawn-chapter/
  birthday/
    party-notes/
    birthday-story/
  opening/
    studio-opening/
    opening-poster/
  general-event/
    program-edition/
    night-schedule/
```

각 테마 폴더에는 `Page.tsx`, `styles.module.css`, 필요할 때만 `content.ts` 또는 `viewModel.ts`를 둔다. 역할이 드러나지 않는 `shared.tsx`는 `WeddingScheduleSection.tsx`, `OpeningBenefitsSection.tsx`, `ProgramTimelineSection.tsx`처럼 책임 기반 이름으로 교체한다. 기존 라우트 경계(`eventPageRendererRegistry.tsx`)는 새 공개 초대장 렌더러를 가리키되, 라우트 및 theme key 정규화 계약은 변경하지 않는다.

## 구현 순서

1. 현재 공개 초대장 파일을 새 책임 기반 폴더로 옮기고 import/registry만 연결한다. 이 단계에서는 화면 결과를 의도적으로 바꾸지 않는다.
2. 대표 테마 4종(웨딩 Letterpress, 돌잔치 First Chapter, 개업 Studio Opening, 일반행사 Program Edition)을 전용 정보 구조·빈 상태·접근성 기준으로 구현한다.
3. 대표 테마에서 확립한 유형별 공유 기능을 이용해 나머지 8종을 독립된 분위기와 섹션 구성으로 확장한다.
4. 레지스트리 라벨·설명·샘플 URL 메타데이터를 새 명칭으로 업데이트하고, 웹/모바일 가이드의 파생 사용을 검증한다.

## 데이터와 상태 처리

- 사진이 있으면 테마가 정한 비율로 노출하고, 없으면 이벤트 이름·날짜·장소로 만든 대체 조판을 사용한다.
- 빈 선택 정보(혜택, 브랜드 소개, 프로그램, RSVP)는 안내 문구로 채우지 않고 해당 섹션을 숨긴다.
- 지도·연락처·계좌·방명록은 데이터가 있을 때만 렌더링하며 현재의 접근 가능한 동작을 유지한다.
- 로더는 데이터 준비에만 연결하고, 정해진 최소 노출 시간이나 자동 인트로를 두지 않는다.

## 접근성과 반응형

- 모바일 390px에서 가로 넘침 없이 한 손으로 핵심 행동을 누를 수 있게 한다.
- 모든 버튼과 링크는 44px 이상 터치 영역과 `:focus-visible`을 가진다.
- 정보 순서는 시각적 순서와 DOM 순서를 일치시킨다.
- 색만으로 상태를 구분하지 않으며, 어두운 테마의 보조 텍스트는 WCAG AA 대비를 충족한다.
- 감소 모션 환경에서는 전환·장식 애니메이션을 제거하거나 즉시 완료한다.

## 검증

- 새 구조 및 테마 라벨·레지스트리에 대한 계약 테스트를 먼저 추가한다.
- 관련 이벤트 렌더링 테스트, `npm run lint:web`, `npm run typecheck:web`를 실행한다.
- 수정 후 Impeccable detector를 공개 초대장 대상에 한 번 실행하고 실제 문제와 테마 예외를 분류한다.
- 대표 4종과 각 유형의 나머지 테마를 390×844 모바일 및 데스크톱에서 확인한다. 빈 이미지·빈 RSVP·긴 이름·키보드 탭·콘솔 오류를 함께 점검한다.

## 성공 기준

- 12개 테마가 색만 다른 공통 셸이 아니라, 이벤트 유형과 테마별로 다른 첫 장면 및 정보 리듬을 제공한다.
- 모든 공개 경로와 기존 theme key가 계속 작동한다.
- 공개 화면에 미구현 기능, 업로드 누락처럼 보이는 빈 상태, 강제 대기 화면이 남지 않는다.
- 파일명과 폴더만 보고 공개 초대장 컴포넌트의 역할과 소유 유형을 알 수 있다.
