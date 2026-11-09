# Invitation 3-A — 웨딩 5종 반응형·접근성·인트로 연결 검증

**날짜:** 2026-11-09 · **기준:** 1-A PR #54 → 1-B PR #55 → 2-A PR #56 → 2-B PR #57 → 3-A PR #58 (별도 QA 브랜치)  
**상태:** Chromium 자동 검증 2계열 통과. 실제 Android/iOS **물리 기기 및 TalkBack/VoiceOver 실기기 확인은 미완료**. 운영 Firebase 배포 없음.

## 1. 검증 대상 분리

| 구분 | 실제 소스 | 검증 내용 | 새 인트로 포함? |
|---|---|---|---|
| 운영 공개 5종 | `https://invite.msgnote.kr/shin-minje-kim-hyunji/{theme}/` | 공개 URL, 8폭·키보드·터치 에뮬레이션·WCAG | **아니요**. 2-A 아직 배포 전 |
| 신규 통합 5종 | PR의 `WeddingBase` + `WeddingIntro` | 5 테마 × 3 인트로 × PC/모바일, 대표사진→표지, 8폭·axe | **예**. 로컬 Next.js 테스트 데이터 |

테마 5종은 `simple`, `classic-r`, `romantic`, `gyeol`, `emotional`입니다. 저장소에 남아 있는 추가 레거시 `vow`는 이번 사용자 지정 5종 QA에 포함하지 않았습니다.

## 2. 운영 공개 청첩장 5종 · 읽기 전용

- 공개 URL 접속·렌더링: **5/5**
- 반응형: 320·360·390·430·600·840·1280·1440px, **40/40**
- axe-core 4.10.3, WCAG 2.0/2.1 A/AA 자동 스캔: **10/10, 위반 0**
- 갤러리 키보드·다이얼로그 포커스·Escape: **5/5**
- 모바일 터치 에뮬레이션: **5/5**
- **자동 판단 미완료**: color-contrast 14개 노드(10개 스캔에 걸쳐) — 실제 사진·그래픽 영역의 수동 대비 검수 필요. 자동 위반 0이라는 사실이 완전한 WCAG 인증을 의미하지 않습니다.
- 실행: https://github.com/hebi10/invitation/actions/runs/42591682403
- 산출물 ZIP: https://drive.google.com/file/d/1_LQ87lj_cqotN8aIs_ssgOFxK-4xQINJ/view

이 검사는 로그인, 방명록 제출, 계좌 데이터 변경, 카카오톡 실제 전송, Google Play 구매, Firebase 쓰기를 실행하지 않습니다.

## 3. 새 인트로 + 실제 웨딩 렌더러의 로컬 통합 QA

- 5개 공개 테마 렌더러 × `light`/`cinema`/`envelope` × 390×844(모바일)/1440×900(PC): **30/30**
- 5종 × 8개 화면 폭 반응형: **40/40**
- axe WCAG 자동 스캔: **30회, 위반 0**
- 커버 사진 DOM, 자연 너비·로딩, 고정 `object-position`(17% 80%) 일치, 사진 잔여 `visibility:hidden` 없음
- 인트로 종료 후 `main[data-design]` 동일 테마 복귀, 다이얼로그·pending 제거, 스크롤 잠금 해제
- 인트로 진행 중 12px 수준의 화면 폭 변경 시 의도치 않은 강제 종료 없음
- **자동 판단 미완료**: 기본형 cover의 color-contrast 4개 노드(4개 스캔에 걸쳐), 수동 검수 필요.
- 실커플 정보가 아닌 로컬 `테스트신랑·테스트신부`와 저장소 샘플 이미지를 사용. 사용자 원본 Firestore/Storage 변경 없음.
- 실행: https://github.com/hebi10/invitation/actions/runs/42591682403
- 산출물 ZIP: https://drive.google.com/file/d/18OLDbU8S3IkiyL4mOT7dNLCbIcAs5Wh1/view
- 인트로 15컷 비교: https://drive.google.com/file/d/1z4JuGQngzZAc0gkME_cFUD2Wu_DfBQC7/view
- 본문 인계 뒤 5종 표지 비교: https://drive.google.com/file/d/1fRk9MC39-g8LrnH8bqt6DTtTnVRLA8Fk/view

**주의:** 신규 인트로 통합 검증에는 원본 공개 URL의 실제 인물 데이터/사진을 사용하지 않았습니다. 운영 서비스에서 새 인트로가 정상이라는 의미가 아닙니다. 이 통합 QA는 실제 서비스와 **동일한 React 테마 렌더러**로 검증한 결과입니다.

## 4. Android 운영 웹 브라우저 QA

- GitHub Actions Android API 35 에뮬레이터에서 **운영 공개 URL 5개를 읽기 전용**으로 열어 URL 접근·웨딩 커플 텍스트·실제 Android 화면 캡처를 확인하는 추가 검사.
- 실행: https://github.com/hebi10/invitation/actions/runs/42592929348
- 최신 성공/실패 결과는 Actions 상태와 `android-manifest.json`으로 확인해야 합니다. Chrome/브라우저 패키지 부재 또는 접근성 계층 표시 실패는 검증 미완료로 구분합니다.
- **실물 휴대전화 테스트가 아님**, AVD에서 웹을 실행하는 테스트입니다. 기존 Android 앱 선택 화면 자체는 2-B에서 API 35 테스트 완료.

## 5. 실제 실기기·접근성 수동 QA 필요 항목

| 미완료 항목 | 필요한 검수 |
|---|---|
| Android 실기기 | Galaxy Fold 접힌/펼친 상태, Chrome/WebView, 터치/뒤로 가기/회전, 인트로 즉시 종료 오류 |
| iPhone 실기기 | Safari, 노치 및 safe area, 200% 글자 확대, 대체 텍스트·키보드 |
| 접근성 스크린리더 | TalkBack/VoiceOver 포커스 전환·인트로 제목·Skip·본문 읽기 순서 |
| 실제 고객 사진 | 가로·세로·고명도 사진 5종에서 Cinema 글자 대비, cover `object-position` 일치 |
| 운영 실제 신규 인트로 | 선행 PR 순차 병합 및 Firebase App Hosting 롤아웃 후 실제 공개 URL 5종의 새 인트로 및 하객용 본문 확인 |
| 안전성 | 고객 실제 저장/재접속·Kakao 앱 수신·외부 지도 호출·실결제는 별도 승인과 실제 환경 필요 |

새로 만든 UI에 대해 **접근성 자동 검사 위반 0건을 확인했지만, 물리 실기기 QA까지 통과했다고 표기하지 않습니다.**

## 6. 배포 경계·후속

- 사용자 확인 없이 운영 `main` 병합, Firebase App Hosting 배포, Google Play 출시/설정 변경 **없음**.
- 3-A PR #58은 Draft 유지; CI와 가상 Android 웹 검사 결과·발견사항을 정리한 뒤 3-B에서 선행 PR을 순차 병합.
- 3-B에서 실제 배포 커밋의 App Hosting 롤아웃 결과와 공개 5종 실웹을 다시 검증해야 합니다.
