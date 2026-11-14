# INTRO-GIF-03-D — 12종 카탈로그·고객 선택·행사 접근 통합

작성: 2026-11-12 · 상태: 구현 코드 작성 완료 / CI·Chromium·실기기 결과 대기 / Draft·미병합

## 기준 자산과 선행 PR

- GitHub: [Invitation 저장소](https://github.com/hebi10/invitation)
- 12종 설계: #105, 정지 시안: #106, 보정본: #107, 검증된 2초 GIF 11종: #108.
- Google Drive 실제 자산: https://drive.google.com/drive/folders/1CGNJ9FTBB06jSorY8iNcUbG2gDYbp7e3
- 기존 `intro-01`: PR #100의 `universal-2s.gif`와 `poster.webp` SHA 불변.
- 새 `intro-02`~`intro-12`: `manifest-03c.json`의 파일명·해시 검증. 각 480×600px·8×250ms·2초·반복 없음.

## 12종 고객 선택 카탈로그

| 그룹 | ID | 이름 | 지원 행사 |
|---|---|---|---|
| 심플 | intro-01 | 미니멀 라인 | 전체 활성 5개 행사 |
| 심플 | intro-02 | 페이드 타이포 | 전체 활성 5개 행사 |
| 심플 | intro-03 | 카드 프레임 | 전체 활성 5개 행사 |
| 감성 | intro-04 | 봉투 열림 | 전체 활성 5개 행사 |
| 감성 | intro-05 | 종이 펼침 | 전체 활성 5개 행사 |
| 감성 | intro-06 | 페이지 넘김 | 전체 활성 5개 행사 |
| 화려 | intro-07 | 플로럴 블룸 | 웨딩 전용 |
| 화려 | intro-08 | 골드 샤인 | 웨딩 전용 |
| 화려 | intro-09 | 커튼 오픈 | 웨딩 전용 |
| 캐릭터 | intro-10 | 신랑신부 손잡기 | 웨딩 전용 |
| 캐릭터 | intro-11 | 웨딩 행진 | 웨딩 전용 |
| 캐릭터 | intro-12 | 커플 인사 | 웨딩 전용 |

- PC 고객 선택 화면: '전체·심플·감성·화려·캐릭터' 필터. 비웨딩은 '전체·심플·감성'만 표시. 그룹별 3개, 전체 12/6개.
- Android 편집 화면: 동일 카탈로그 데이터·행사별 필터·그룹 선택·WebP 포스터·2초 샘플 미리보기.
- '사용 안 함' 선택지는 모든 행사에서 사용 가능. 저장 전 변경과 현재 적용 중 상태 구분.
- 목록에서는 WebP만 노출. GIF는 미리보기 버튼을 누르거나 저장된 하객 공개 인트로에 진입할 때만 재생.
- 비웨딩: 웨딩 전용 ID를 고객 선택 UI에서 숨기고, 미리보기 웹 경로에서 404, 저장 서비스에서는 400으로 거부. 실제 공개 웹에서도 등록되지 않은 조합을 숨김.
- 예전 `introStyle` 네 가지 값과 과거 `introPresetId`는 무단 삭제하지 않음. 기존 값이 이벤트와 일치하지 않으면 편집기에 안내하고 새 선택을 요구.
- 시안 대비 디자인 품질·커플 리깅 완성도는 파일 단위 검증을 넘어 실제 앱·기기 QA에서 별도로 판정.

## 코드 변경 영역

1. `src/lib/invitationIntroCatalog.ts`: 영구 ID 12개, 그룹·허용 이벤트·해시·자산 경로, 행사별 목록/상세 조회·확인용 유효성 검사.
2. `src/components/sections/InvitationIntro/InvitationIntroPicker.tsx` 및 CSS: PC 그룹별 탐색, 미리보기·선택·저장 분리, 기존 반응형 그리드.
3. `src/app/page-wizard/steps/IntroCatalogSettings.tsx`: 이벤트 전달·미지원 저장값 안내·기존 값 보존.
4. `apps/mobile/src/features/manage/components/steps/SettingsEditorStep.tsx`, 화면·타입·공통 모듈: Android 행사별 필터/그룹/선택·저장; 민감 정보를 싣지 않는 샘플 미리보기 URL.
5. `src/app/mobile-gif-intro-preview/page.tsx`: 인트로 ID뿐 아니라 허용 이벤트 검증. `src/lib/publicInvitationIntro.ts`: 공개 하객 렌더러에서 GIF와 이벤트의 일치 조건 추가.
6. `src/lib/invitationPagePersistence.ts`: 유효한 선택만 정규화. 서버 `saveServerInvitationPageConfig`와 웹/고객/Android 저장 API에서 잘못된 행사·GIF 조합을 HTTP 400으로 반환.
7. `getServerEditableInvitationPageConfig`: Android용 서버 편집 응답에 행사 유형을 명시(기존 Firestore 데이터는 무변경).

## 검사 계획과 범위

- 단위 테스트: 등록된 ID 12개, 웨딩 12/비웨딩 6 필터, 파일 SHA-256, 서버 400, 36개 저장→재조회→공개 렌더 조합, 기존 `introStyle`, 모션 감소·불러오기 실패 시 포스터.
- 브라우저: 5개 행사 × 320/390/1440px 선택/취소/저장 15환경, 미리보기 네트워크 최초 요청, 웨딩 전용 404/공개 미표시, 2초 자동 진입 금지, 390px 모션 감소.
- GitHub Actions: `invitation-intro-gif-03d-integration-qa.yml` (read-only), Expo/Next.js TypeScript·Pillow GIF/SHA·회귀 테스트·Chromium 캡처·SHA manifest.
- **CI 결과 미확인**. Android 실제 기기 API29/35/36·TalkBack·Play 설치·인증된 고객 계정 저장 E2E는 후속 QA(03-D-FIX/05) 대상.

## 배포·병합 정책

- 선행 PR #100 → #101 → #102 → #103 → #104 → #105 → #106 → #107 → #108 → 이번 PR 순서로만 최종 QA 후 안전 병합.
- 이 PR은 Draft로 유지. 운영 Firebase App Hosting·Google Play 배포, 고객 Firestore 쓰기, 결제·음악·갤러리 변경 없음.
- 구 9종 브랜치 `feat/intro-gif-03-assets-catalog-20261112`의 번호·바이너리는 새 12종과 충돌해 병합 금지.

## 다음 작업

1. `INTRO-GIF-03-D-QA` — CI·Chromium 15환경·Android API29/35/36 검수·오류 수정.
2. `INTRO-GIF-04` — 레거시 인트로 중복 코드 안전 정리(기존 고객 호환 확인 후).
3. `INTRO-GIF-05` — 12종 고객 선택·공개 URL 전체 E2E, 접근성·성능·비정상 네트워크 통합 QA.
4. `INTRO-GIF-06` — SHA 고정 순차 병합·운영 배포 및 Google Play 응답 확인.
