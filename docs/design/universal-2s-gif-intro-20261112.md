# Invitation — 고객 선택형 GIF 인트로 약 10종 전환 기획 (개정)

- 작성/개정: 2026-11-12 · 상태: 설계 개정 / 실 코드 선택·배포 미구현
- 근거: 사용자 명시 요구 — **고객(초대장 제작자)이 약 10개 GIF를 직접 보고 선택**. 모든 고객에게 동일 GIF를 강제로 적용하는 이전 안은 폐기
- 참고: Google Drive 「Invitation 1-A 공통 인트로 디자인 시스템」, 「2-B PC·Android 인트로 설정·미리보기·저장 QA」와 저장소 `main` 실제 코드
- 관련: [인트로 1번 자산 PR #100](https://github.com/hebi10/invitation/pull/100), [추적 이슈 #98](https://github.com/hebi10/invitation/issues/98)

## 0. 요구사항 재정의 — 서로 다른 세 가지 동작
1. **제작자의 선택**: 고객은 전체 GIF 목록(초기 약 10종)의 정지 썸네일을 보고 한 개를 명시적으로 선택하거나 ‘사용하지 않음’을 선택. 기본으로 하나를 강제 선택하지 않음
2. **제작자의 미리보기**: ‘미리보기’ 버튼에서 선택한 GIF의 전체 2초 애니메이션을 확인. 10개를 동시에 재생하지 않음. 미리보기는 절대 저장/공개하지 않으며 반복 보기 제공
3. **하객의 공개 페이지 진입**: 선택된 인트로가 공개 URL에서 표시되는 별도 책임. GIF 자체 재생 시간은 약 2초지만 **2초 후 자동 본문 이동은 선택 UI 요구사항과 별개**. 앞선 강제 자동 진입 규격은 승인된 구현 조건으로 취급하지 않으며, 기존 건너뛰기/접근성/입장 경로 정책을 우선 보존

## 1. 실제 프로젝트 구조·문제
- PC 웨딩 제작: `src/app/page-wizard/steps/IntroSettings.tsx`에서 `none | light | cinema | envelope` 라디오 선택/연출 보기. 선택은 `formState.introStyle`, 저장·읽기는 `pageWizardEditorUtils.ts`·`invitationPagePersistence.ts`
- PC 미리보기: `WeddingWizardPreview.tsx` ↔ 같은 출처 iframe `WizardPreviewClient.tsx`, 저장 전 임시 선택 전달. 이벤트 타입별 wizard는 `pageWizardData.ts`에 별도 단계가 있음
- **선택 UI 웨딩 제한**: `PageWizardClient.tsx` music 단계에서 `eventType === 'wedding'`인 경우에만 `IntroSettings` 렌더링. opening/general-event는 music 단계 자체가 없으며, 다른 타입의 선택 단계도 확인이 필요
- Android 편집: `SettingsEditorStep.tsx`의 4종 선택 → `useInvitationForm.setIntroStyle` → `buildConfigFromForm` → 저장. `buildWeddingIntroSamplePreviewUrl`로 **style만 전달**한 공개 샘플 WebBrowser 미리보기. 현 관리 폼은 신랑·신부 필드를 중심으로 설계됨
- 공통 타입: `InvitationPage/Seed`, `MobileInvitationSeed`에 `introStyle?: WeddingIntroStyle`. normalize 함수는 열거되지 않은 신규 문자열을 `none`으로 바꿔버리므로 **10종 ID를 그냥 기존 필드에 넣으면 데이터가 유실됨**
- 웨딩 공개: `EventInvitationPage.tsx`는 스타일 값에 따라 단일 `WeddingIntro.tsx`를 렌더. `sessionStorage` 세션·해시 앵커·건너뛰기·reduced-motion 처리 존재
- 개업: `opening/themeRenderers/shared.tsx` 자체 ‘초대장 열기’ 인트로. 일반 행사: `generalEvent/themeRenderers/shared.tsx` 자체 1,800ms 자동 오버레이. 이 상태에서 GIF 오버레이만 추가하면 **중복 인트로** 발생
- 활성 이벤트: `wedding`, `first-birthday`, `birthday`, `general-event`, `opening`; `seventieth`/`etc`는 비활성. 웨딩 `vow` 포함 모든 지원 테마가 디자인·이벤트 타입과 상관없이 **같은 카탈로그를 선택**할 수 있도록 확장
- **타입별 실제 렌더러 분리 확인**: `eventPageRendererRegistry.tsx`에서 웨딩/돌잔치/생일/일반 행사/개업을 개별 렌더러로 등록. 돌잔치는 `FirstBirthdayInvitationPage.tsx`, 생일은 `BirthdayInvitationPage.tsx`가 공개 UI를 그리며 웨딩 `EventInvitationPage` 인트로 JSX를 자동 공유하지 않음. 따라서 웨딩 한 파일만 수정해서는 모든 종류에 적용되지 않음
- 상품/판매: `INVITATION_THEME_SALES_POLICY_REGISTRY`에서 웨딩 외 일부 테마는 현재 구매 불가. **인트로 선택 자유와 기존 상품/공개 권한을 혼동하지 않음**. 새 옵션으로 유료 상품 구매 가능 여부가 달라져서는 안 됨

## 2. 인트로 카탈로그 구성
- **초기 약 10종**을 고정 개수 UI가 아닌 데이터 기반 목록으로 관리(추후 12·20종 확장 가능). 첫 번째 `intro-01`은 제작된 중립 타이포·수평선 GIF를 등록할 수 있는 후보이며 **디자인 1종일 뿐 필수 기본값이 아님**
- 확정된 실제 파일은 현재 **1종**: 자산 PR #100의 `public/assets/invitation-intro/universal-2s.gif`, `poster.webp`, `manifest.json` (480×600·8프레임×250ms). 나머지 9종은 미제작·미검증, 선택 화면에서 예약 슬롯·가짜 미리보기 노출 금지
- 제안하는 다른 9종 시각 콘셉트(확정 자산 아님): 타이포 슬라이드, 한 장 펼침, 평면 봉투 열기, 창문 열림, 레이어 패널, 포토 프레임 등장, 잉크 라인, 페이지 넘김, 정돈된 모서리 조합. 하트/결혼 반지/아이 사진/고객 이름이 필수인 전용 장면은 일반용 옵션으로 강제하지 않음
- 항목 필드: `id`, `label`, `description`, `gifSrc`, `posterSrc`, `durationMs`, `active`, `sortOrder`, `sha256`. 모든 활성 이벤트 타입에서 선택 가능. GIF 키는 번역/표시명과 독립된 **영구 ID** 사용
- 프리뷰 화면에서 10장 GIF 동시 다운로드·자동 재생 금지. 리스트에는 소용량 WebP **포스터 썸네일만** 로드하고 ‘재생’/‘자세히 보기’ 시 선택한 GIF 하나만 재생. 화면 이동·다시 보기에는 이미지 캐싱을 활용
- 파일명/폴더는 미래에 `public/assets/invitation-intro/intro-01/...` 형태로 확장. PR #100의 기존 `universal-2s.gif` 경로는 첫 항목의 초기 자산으로 호환해 참조하고, 실제 배포 전 파일 변경 시 manifest/SHA를 갱신

## 3. PC 고객 선택 UI
- 위치: 기존 웨딩 `첫 화면 연출`을 **`인트로 선택`**으로 교체. 다른 활성 이벤트 타입의 제작/편집 흐름에도 별도 공통 단계 또는 기존 ‘설정’ 탭에 같은 선택 UI 노출 (웨딩만 렌더링하는 현재 조건 해제 필요)
- 390px 화면은 2열 포스터 카드, 충분히 넓은 PC는 3열 정도의 카드 갤러리. 카드: 정지 썸네일, 짧은 이름, 재생 시간, ‘미리보기’와 선택 상태. 카드 전체 누름은 선택, 미리보기는 저장된 선택을 변경하지 않음
- 현재 설정/저장되지 않은 변경/저장 완료를 분리. ‘현재 적용 중’ 1개, 미저장 선택 중 1개만 표시하며, 기존 페이지 저장 버튼으로 확정. 저장 취소 시 복원
- `사용 안 함`은 항상 선택 가능. 고객 이름/사진, 테마 초점/오버레이·음악·개별 이미지 등과 인트로 ID 연결 금지. 화면낭독기에서는 radio/group/현재 상태, 버튼은 최소 44–48px
- PC 미리보기의 iframe 통신 메시지는 기존 `wedding-wizard-preview:update` 패턴을 유지. 웨딩 외 타입에는 해당 웨딩 전용 iframe을 재사용한다고 가정하지 않고 타입별 공통 GIF 미리보기를 별도 제공

## 4. Android 고객 선택 UI
- 기존 `SettingsEditorStep.tsx` 인트로 Disclosure를 카드 갤러리로 전환. 2열 썸네일 + ‘재생’/‘이 인트로 선택’ + 현재 선택 ID·저장 상태 표기. 사진·음악/다른 설정과 스타일 일치
- 기존 `useInvitationForm`의 dirty-state 및 동일 값 재선택 시 불필요한 dirty 방지 정책 유지
- `apps/mobile/src/lib/weddingIntroPreview.ts` URL에는 **카탈로그 ID만** 전달하고 고객 draft, 인증 토큰, 개인정보, 사진 URL은 넣지 않음. 실제 사용 환경은 웹 기반 미리보기(Expo WebBrowser)로 동일 구성 재생
- Android 앱 버전이 옛 설정값만 이해할 경우 신규 GIF 설정을 덮어쓸 위험이 있으므로 서버 정규화·구버전 앱 왕복 저장 검증 후 출시. PC와 앱 모두 같은 데이터/자산을 읽을 것
- Android에서 웨딩 외 이벤트 편집이 어디까지 가능한지는 별도 API/권한 실제 동작 검증 전 완료로 주장하지 않음

## 5. 안정적인 데이터 스키마(제안)
- 신규 공통 필드 **`introPresetId?: 'none' | 'intro-01' | ...`** (선택형). 기존 `introStyle`은 레거시 데이터 읽기용으로 남겨 신규 필드가 저장되지 않은 고객의 선택을 보존
- 우선순위: ① `introPresetId`가 명시적으로 저장됐으면 그것 사용(값이 `none`이면 미사용), ② 없으면 기존 `introStyle` 동작 유지/호환, ③ 둘 다 없으면 인트로 미사용. 신규 고객에게 임의로 첫 번째 GIF 강제 적용하지 않음
- `introPresetId`는 검증된 카탈로그 ID만 허용. 알 수 없는/삭제된 ID는 잘못된 URL 요청·오류 오버레이 대신 안전한 ‘사용 안 함’ 또는 기존 레거시 설정으로 폴백. 해당 상태를 편집 화면에서 안내
- 기존 `introStyle=light/cinema/envelope` 고객은 데이터 일괄 덮어쓰기 또는 모두 `intro-01`로 강제 전환 금지. 구형 렌더러 제거 시점에는 고객 영향·대체 선택 정책을 별도 검증/승인해야 함
- 영속 레코드: `src/types/invitationPage.ts`, `src/lib/invitationPagePersistence.ts`, PC 폼 정규화/저장, Android `MobileInvitationSeed`/`ManageFormState`/`buildConfigFromForm`, 서버 데이터 검증/읽기/쓰기 순서대로 확장
- GIF ID는 고객이 사용한 초대장의 속성이지 **초대장 테마 자체의 속성이나 상품 등급의 속성이 아님**. 관리자/프리뷰/실제 공개 URL 모두 동일 ID 참조

## 6. 공개 페이지 인트로 표시(별도 구현)
- 새로운 공통 `InvitationIntro`는 위의 **고객이 저장한 `introPresetId`**로만 하나의 GIF를 선택해 표시. 선택하지 않았으면 아무 GIF도 자동 선택/출력하지 않음
- GIF 길이는 약 2초. **GIF가 재생 완료되면 무조건 본문으로 자동 이동**하는 것은 이번 고객 선택 요구사항에서 도출되지 않으므로 강제 타이머 연결 코드를 구현하지 않음. 본문 연결 규칙은 이전 ‘약 2초 보여주고 이동’ 요청과 사용자의 현재 ‘자동 진입이 아니다’ 정정을 나누어 다음 단계에서 명확히 검증할 것
- 기존 `sessionStorage`/slug, 해시 딥링크, 즉시 건너뛰기, reduced-motion(움직이는 GIF 억제/포스터), 이미지 로딩 실패·접근 불가·만료 초대장, 키보드/포커스 복구 정책을 안전하게 승계
- 웨딩은 `EventInvitationPage`, 개업/일반 행사는 독립 인트로와의 **이중 표시를 해소한 뒤** 공통 진입 계층으로 이동. 돌잔치/생일도 실제 렌더러와 함께 검증
- 공개 본문/배경음악·계좌·결제·SNS 공유·지도·방명록·고객 이미지 URL/초점·기존 공개 기간/권한 유지

## 7. 단계별 GitHub 작업(개정)
- `INTRO-GIF-00` [현재] 실제 코드/Drive 전체 인트로 선택·저장·타입별 노출 분석 및 기획 수정
- `INTRO-GIF-01` [자산 1종 완료] `intro-01` 후보 GIF/WebP 제작·자산 GitHub Draft PR #100. 약 9종의 추가 후보는 개별 제작/승인 예정
- `INTRO-GIF-02-A` **공통 GIF 카탈로그 10종 규격 + ID 레지스트리 + 정지 포스터 목록 + 선택 UI 정보 구조** (자동 본문 전환 구현 아님)
- `INTRO-GIF-02-B` **PC 이벤트 타입별 고객 선택/미리보기/저장·취소 UI** (웨딩 외 선택 화면 연결 포함)
- `INTRO-GIF-02-C` **Android 고객 선택/미리보기/저장·복원 UI**, 구버전 동기화 보호
- `INTRO-GIF-02-D` **공개 렌더러 단일 카탈로그 연결** 및 기존 행사별 인트로와 충돌 제거. 재생 후 본문 전환 정책은 분리 검증
- `INTRO-GIF-03` 나머지 GIF 약 9종 제작·시안 검수·용량/SHA·카탈로그 등록. 빈 항목을 미리 보여주지 않음
- `INTRO-GIF-04` 구형 light/cinema/envelope·개업/일반 행사 인트로의 레거시 UI/코드 삭제 및 읽기 호환성 마이그레이션(새 선택 UI 정상 출시 후)
- `INTRO-GIF-05` 10개 GIF 전환·PC/Android/모든 활성 이벤트 타입·기존 고객 계정/세션/딥링크/접근성/200% 텍스트·오류·보안 QA
- `INTRO-GIF-06` CI·Android 에뮬레이터/물리 기기 및 공개 URL 검수 → 안전 병합 → Firebase App Hosting/Google Play 개별 배포 확인

## 8. 기존 PR·문서 상태 및 중단 지침
- PR #97은 이 설계 변경을 담은 **기획 Draft PR**. 이 문서 수정만으로 선택 기능 구현 완료를 의미하지 않음
- PR #100은 **첫 번째 GIF 자산 1종 + 포스터**만 담은 Draft PR. 기존 명칭 `universal-2s`는 과거 단일 GIF 공통 적용 계획의 파일명일 뿐, 다른 인트로를 사용할 수 없게 만드는 강제 규칙이 아님
- Issue #98은 이전 ‘gif/none 2선택·자동 2초 진입·고객에게 공통 GIF 강제’ 계획을 폐기하고 **약 10종 중 고객 직접 선택**으로 관리 항목 변경
- 실제 자산 신규 9종은 아직 미제작·미검증. GIF 선택 화면·실제 공개 화면·Firebase/Play에는 이번 설계 수정이 반영되지 않음

## 9. 인수 기준
- 10개(실제 존재하는 범위)의 썸네일을 보고 단일 선택, 미리보기 반복 확인, ‘사용 안 함’ 선택, 저장 전/후 상태 분리, 새로고침·PC/Android 왕복 동일 ID
- 모든 현재 활성 이벤트 타입에서 동일한 선택 방법, 기존 이벤트별 권한/결제 상품 규칙을 우회하지 않음
- 신규 인트로 강제 기본값 없음, 예전 고객 정보·인트로 선택·공개 URL·음악·사진·계좌·방명록/대금 정보 무손실
- 선택 GIF를 표시하는 실제 공개 UI와, GIF 재생 2초/본문 전환 정책이 서로 구별되어 테스트 가능
- 모든 주요 CI 통과 후에만 레거시 삭제/운영 배포를 실행; **현재는 기획 정정 단계**
