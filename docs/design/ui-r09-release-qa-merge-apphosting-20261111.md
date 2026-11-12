# UI-R09 — Invitation 최종 QA·순차 병합·Firebase App Hosting 배포 게이트

검증 기준일: 2026-11-11. 이 문서는 배포 완료 증빙이 아닌 출시 인수 절차다.

## 현재 PR 체인
#83 (UI-R00, main) → #84 (UI-R01) → #85 (UI-R02) → #86 (UI-R03) → #87 (UI-R04) → #88 (UI-R05) → #89 (UI-R06) → #90 (UI-R07) → #91 (UI-R08).

2026-11-11 확인 시 PR #83~#91은 전부 Draft/open/미병합 상태이고 main 최신 커밋은 87df75244845dad3b52b8517167af675b072b6ef. 스택 PR은 선행 branch를 base로 하므로 직접 main에 각각 squash merge 하면 안 된다.

## 최초 QA 조사 결과
- #83 최신 baseline UI-R00 캡처와 CI completed/success; artifact 13842833823.
- #84 CI 및 조회한 기능 QA 통과.
- #85~#89 일부 회귀: simple summaryDescription 대비 4.34:1 (4.5:1 미달), classic-r .ics 액션 72px 미달, classic-r 표지 영어 라벨 12px (13px 미달).
- #90 UI-07-E 음악 QA 실패: 320px에서 top safe area 12px 미달.
- #91 QA 브랜치 수정: simple contact 부가설명 더 어두운 색, classic-r ICS/인라인 달력 최소 72px, classic-r label 14px, 모바일 음악 버튼 상단 최소 12px. 테스트 기준을 낮추지 않음.

## 반드시 통과해야 할 자동 검증
1. #91 HEAD에서 전체 CI(ESLint/TypeScript/unit/build/Firebase emulator) 성공.
2. UI-07-A-07 60/60, UI-07-C 40/40, P2 웹 20/20.
3. UI-07-E 음악 safe area/오류/재시도 테스트, UI-07-B Light/Cinema/Envelope intro QA, UI-07-F Chromium 60/60과 Android API35 11/11 (해당 워크플로의 시나리오/판정 확인).
4. 동일 가상 데이터 5종 전체 화면 PNG·manifest·원본 SHA256 보관; 320/360/390/430/768/1440px·200% 확대 및 5종 인트로/마무리 점검.
5. 모든 필수 CI 결과가 completed/success이고 오류 화면/가로 넘침/명도 대비·터치 실패가 없어야 함. 자동 캡처는 운영 URL·실기기/실음원 검증의 대체가 아님.

## 안전 병합 및 운영 확인
- 선행 PR을 순서대로 처리하고, 병합할 때마다 그 PR의 최신 head SHA, base, 필수 CI, 캡처 증거, 충돌을 재확인.
- PR #91의 수정 사항이 최종 main에 남아있는지 diff 확인. PR 체인의 base가 선행 병합 후 변경되므로 적절히 리베이스/타깃 변경하되 중복 커밋 방지.
- 병합 후 main의 새 SHA에서 별도 push CI와 Firebase emulators 성공을 확인.
- README 기준 웹 런타임은 Firebase **App Hosting**으로 배포됨. `npm run deploy:firebase`는 Firestore/Storage rules 전용이며 웹 롤아웃을 수행하지 않음. rules를 웹 UI 작업과 함께 배포하지 말 것.
- Firebase Console의 해당 App Hosting 백엔드에 연결된 브랜치가 main인지 확인하고, 새 SHA 빌드 및 Rollout 성공·운영 URL의 실제 초기/전체 청첩장 화면을 확인한 뒤에만 배포 완료 판정.
- Google Play 내부/비공개 테스트 배포는 이 웹 배포 범위에서 별도이며 자동 시행하지 않음.
- 실기기/실지도/실음원/Play 실제 결제·Firebase 운영 데이터 테스트는 별도 승인·격리된 QA로만 검증; 실제 고객 데이터 변경 금지.

## 현재 판정
코드상 발견된 회귀에 대한 수정은 PR #91 브랜치에 반영. #91 수정 후 전체 CI 성공, main 병합, App Hosting rollout 성공 및 실제 공개 URL 반영은 확인되지 않았으므로 모두 **미완료** 상태다.
