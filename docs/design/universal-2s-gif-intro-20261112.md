# Invitation — 공통 2초 GIF 인트로·기존 인트로 전면 교체 계획

- 작성일: 2026-11-12
- 문서 상태: **기획/구현 전**. 이 파일만으로 기존 인트로가 제거되거나 운영에 배포되지 않음
- 근거: Google Drive의 Quiet Invitation 1-A, UI-07-B 및 5종 UI-R00~R09 기획; GitHub 코드·PR #96 최종 QA
- 목표: **약 2초 동안 중립적인 GIF 1개 노출 → 자동으로 본문 진입**. 특정 청첩장 테마에 종속되지 않고 전 종류가 동일한 엔진을 사용

## 1. 적용 대상
- 웨딩 기본형(simple), 모던형(classic-r), 포토형(romantic), 클래식형(gyeol), 내추럴형(emotional) **5종 모두**, 등록된 웨딩 vow와 후속 웨딩 테마
- 현재 활성 이벤트: wedding, first-birthday, birthday, general-event, opening. 미활성 seventieth/etc는 현재 노출하지 않되 미래 확장 가능
- PC/모바일 공개 화면, PC 제작·미리보기, Android 편집·미리보기 공통 규격. 상품 등급/디자인/고객 계정에 따라 인트로 이용 권한을 제한하지 않음

## 2. 공용 GIF 콘셉트 — 초대의 문
- **정체성**: 웨딩·돌잔치·생일·개업·행사에 모두 어울리는 단정한 무채색 모션. 단색 화이트/연회색 바탕, 차콜 글자 **초대합니다**, 가는 수평선 한 개
- **제외**: 반지·하트·신랑/신부 이미지·꽃·아기·특정 매장 로고·샘플 인물 사진·3D·그라데이션·반짝임·box-shadow·장식적인 전환
- GIF 1종(무음), 동일 정지 포스터 PNG/WebP. 최대 너비 480px, 320~1440px 화면 대응. 원본 가로세로·fps·용량은 실제 생성 후 로딩·네트워크 QA에서 확정
- **타임라인**: 0~0.30초 문구 표시 → 0.30~0.85초 수평선 단일 변화 → 0.85~1.60초 정지·읽기 → 1.60~2.00초 종료, 2,000ms 경과 시 오버레이 해제
- GIF는 반복/재생 완료 이벤트가 없는 파일 형식이므로 GIF 끝남을 기다리지 않고 단일 2,000ms 종료 타이머 사용. 이미지 로딩 실패·저속 환경에서 오버레이가 영구 대기하면 안 됨

## 3. 진입·접근성 정책
- 새로 진입한 탭에서 행사 slug당 최초 1회 재생, 동일 탭 재진입은 기존 정책대로 생략. URL 해시로 들어오면 인트로를 건너뛰고 목적 섹션으로 접근. PC/Android 미리보기는 명시적 재생 허용
- **건너뛰기**: 시작부터 보이는 48px 이상 터치/키보드 버튼, 즉시 본문 접근. Escape/뒤로가기/언마운트 시 타이머·포커스·스크롤 잠금 정리
- prefers-reduced-motion: reduce에서는 움직이는 GIF 재생 금지; 정적 포스터 또는 즉시 본문 진입. 시각 인트로 문구는 스크린리더 중복 낭독 방지
- 공개 불가/만료/오류 페이지 앞에 인트로를 띄우지 않음. 이미지 없음·404·느린 네트워크·JS 실패에서도 본문 진입 보장
- 음악 자동재생, 지도, 전화/SMS, 갤러리, Firebase 계좌/댓글, 결제 및 공유 링크·접근 권한은 변경하지 않음

## 4. 저장값 전환 — 고객 데이터 무손실
- 기존 저장 옵션: none / light / cinema / envelope
- 기존 **light / cinema / envelope → 새 공용 gif** 렌더링으로 호환 매핑. 기존 none은 사용자 의사대로 **인트로 미사용** 유지. 별도의 운영 Firestore 일괄 업데이트 금지
- 신설 정책/편집 UI는 gif / none 2가지로 단순화. 신규 제작 기본값은 gif 제안, 기존 사용자에게 none을 강제 해제하지 않음
- PC 관리자·제작 화면과 Android 편집기에서 구형 3종 선택·각기 다른 미리보기 UI 제거. 새 GIF 1종 미리보기와 사용/미사용 토글만 남김
- 이전 저장 값의 읽기·쓰기, PC/모바일 왕복 수정·복구, 이벤트 타입별 기본값을 QA로 검증할 때까지 기존 저장 데이터·타입을 삭제하지 않음

## 5. 코드 영향 조사(현재 실소스 기반)
- 웨딩 공개: src/app/_components/EventInvitationPage.tsx — 기존 WeddingIntro 렌더링
- 구형 3종 모션: src/components/sections/WeddingIntro/WeddingIntro.tsx, WeddingIntro.module.css, QuietInvitationTokens.module.css; GSAP 구형 연결
- 상태: src/lib/weddingIntro.ts, src/types/invitationPage.ts, src/lib/invitationPagePersistence.ts, apps/mobile/src/lib/weddingIntro.ts
- PC: src/app/page-wizard/steps/IntroSettings.tsx, src/app/wizard-preview/WizardPreviewClient.tsx, src/app/mobile-intro-preview/IntroPreviewClient.tsx
- Android: apps/mobile/src/features/manage/components/steps/SettingsEditorStep.tsx, apps/mobile/src/lib/weddingIntroPreview.ts 및 관리 폼
- 샘플/QA: src/app/sample-invitation/SampleInvitation.tsx, scripts/qa-invitation-ui07-f-browser.py 및 구형 인트로 관련 CI/스크린샷
- 개업 별도 인트로: src/app/_components/opening/themeRenderers/shared.tsx
- 일반 행사 별도 인트로: src/app/_components/generalEvent/themeRenderers/shared.tsx — 현재 1800ms 타이머
- 새 엔진 위치 제안: src/components/sections/InvitationIntro/UniversalInvitationIntro.tsx, src/lib/invitationIntro.ts, public/assets/invitation-intro/universal-2s.gif 및 poster.webp
- 기존 이벤트별 렌더러마다 GIF를 중복 작성하지 않고 **공개 라우트 공통 진입 계층**에서 단일 오버레이 적용. 이벤트 타입별 기존 인트로가 2개 겹쳐 나타나지 않도록 검증

## 6. GitHub 단계
1. INTRO-GIF-00: 전체 이벤트 타입·PC·Android·운영 저장 필드의 기존 인트로 참조 인벤토리/백업 및 5종 기준선 캡처
2. INTRO-GIF-01: 무채색 공통 GIF/정지 포스터 제작·압축·출처/해시·모바일 실측. **현재 자산 제작 전**
3. INTRO-GIF-02: 공통 2,000ms 게이트 + session/hash/skip/reduced-motion/fail-open 계약 구현, 모든 활성 이벤트 라우트 연결
4. INTRO-GIF-03: PC·Android 편집/미리보기 UI를 공통 gif/none으로 통합, 구형 설정값 호환 및 저장 왕복 QA
5. INTRO-GIF-04: 새 엔진이 실제 작동한 뒤 **구형 light/cinema/envelope 및 개업·일반 행사 독립 인트로 코드/스타일/테스트 제거**. 임시로 무음·빈 화면이 노출되도록 구형 파일 먼저 삭제하는 방식 금지
6. INTRO-GIF-05: 5종 웨딩+vow+돌잔치/생일/개업/일반 행사 × 320/360/390/430/768/1440, GIF 2초 실측, 첫 재생·재방문·딥링크·스킵·미리보기·글자확대·접근성·이미지 실패·장문 정보·음악/결제/지도 기능 회귀, Android 물리 기기
7. INTRO-GIF-06: 전체 CI/기기 테스트, PR 병합, main 빌드·Firebase App Hosting 롤아웃, 공개 URL 전 종류 확인, Android Play 테스트 빌드 별도 검증

## 7. UI-R09 선행 PR 병합 상태
- #83 기준선 및 #84 공통 디자인은 main에 안전 병합 완료(2026-11-12). main은 3361efd1
- #85는 a07-fictional-responsive-accessibility 실패를 확인하여 Draft·미병합으로 보류. #86~#90에도 과거 개별 CI 실패. 최종 #96 14/14 green이 중간 PR의 CI 실패를 자동으로 소멸시키지 않음
- 단계별 릴리스가 위험하면 #96의 검증된 누적 HEAD를 사용한 새 main 대상 통합 PR을 만들어 모든 CI·브랜치 정책을 재확인하는 **별도 경로**를 검토. 개별 PR을 합친 척하지 않음

## 완료 정의
- 모든 판매·등록 초대장에 공통 인트로 사용 가능, 구형 개별 인트로가 사용자에게 더 이상 노출되지 않음
- 정확한 2초 자동 진입/건너뛰기/고장 시 본문 접근, PC·Android의 gif/none 선택값 호환, 고객 데이터 변경 없음
- 최종 코드·실제 GIF 파일·종단 간 CI·기기·운영 배포 확인 전에는 구현/삭제 완료로 보고하지 않음
