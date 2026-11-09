# Invitation 1-A — Quiet Invitation 공통 인트로 디자인 시스템

작성: 2026-11-09 · 상태: **디자인 시스템·코드 토큰 확정 / 실제 인트로 교체 전**

기준 저장소: https://github.com/hebi10/invitation · 기준 `main` `d002d11040265ee94f11b9e9d60169a8592b1d7a`
0-A 실제 프레임 검증: https://github.com/hebi10/invitation/actions/runs/42576716006
0-A 상세 분석: https://github.com/hebi10/invitation/blob/audit/invitation-intro-0a-20261109/docs/qa/invitation-intro-0a-baseline.md
0-A Drive 원본: https://drive.google.com/file/d/1TNsgYUck68fo3CJPQQYXzGtQR3mMZRqg/view
유일한 스타일 토큰 파일: `src/components/sections/WeddingIntro/QuietInvitationTokens.module.css`

## 1. 목표 및 범위

**Quiet Invitation**: 웨딩 인쇄물과 화보의 정보 위계·종이 여백·절제된 등장과 퇴장만으로 초대를 전달합니다. 화면당 주요 움직임은 1개를 원칙으로 합니다.

- 대상: 기존 `none | light | cinema | envelope` 중 3개 애니메이션의 공통 디자인 시스템. `none`은 즉시 본문 표지 노출을 유지합니다.
- PC 관리자 편집기와 Android의 7단계 설정 UI에서 저장한 `introStyle`은 공통 Next.js 공개 웹 인트로에 전달됩니다. 따라서 **하객용 인트로 렌더러는 하나**입니다.
- 이 단계에서는 토큰·컴포지션·모션·접근성 기준만 명세합니다. 기존 `WeddingIntro.tsx`, 기존 스타일, 공개 페이지, Firebase 데이터 및 배포는 변경하지 않습니다.
- 기존 사용자 설정 키·세션 정책·프리뷰 URL·테마·고객 이미지 URL과 초점·공개 URL·결제 상품·노출 기간은 그대로 둡니다.

## 2. 컬러 시스템 (기본·라이트·사진형)

| 역할 | 변수 | 색상 | 용도 |
| --- | --- | --- | --- |
| Main paper | `--qi-paper` | `#FAF9F6` | Light 표면 / 밝은 PC 측면 |
| Soft paper | `--qi-paper-soft` | `#F3EEE5` | Envelope 표면 |
| Elevated paper | `--qi-paper-card` | `#FFFDF8` | Envelope 카드 |
| Ink | `--qi-ink` | `#282725` | 이름·메인 문구 |
| Muted ink | `--qi-ink-muted` | `#66635E` | 날짜·설명 |
| Warm ink | `--qi-ink-accent` | `#6B5842` | 작은 인쇄 포인트(상태색 아님) |
| Rule | `--qi-line` | `#D8D2C8` | 필요 시 1px 전체 경계 |
| Focus | `--qi-focus` | `#524D44` | 키보드 포커스 |
| Photo backdrop | `--qi-photo-surface` | `#1D1F1D` | Cinema 이미지 로딩/빈 사진 대체 |
| Photo text | `--qi-photo-ink` | `#FFFCF7` | Cinema 이름 |
| Photo secondary | `--qi-photo-muted` | `#E8E1D7` | Cinema 날짜 |
| Photo scrim | `--qi-photo-overlay` | `rgba(20,20,18,.64)` | 사진 위 글자가 실제로 겹칠 때만 대비 보장 |

정적 배경의 대비 측정: Paper/Ink **14.17:1**, Paper/Muted **5.68:1**, Paper/Warm **6.43:1**, Photo backdrop/Photo text **16.21:1**, Photo backdrop/Photo secondary **12.78:1**. 사진 위 글자 대비는 실제 사진의 위치·밝기에 따라 달라지므로 별도 수동 QA가 필요합니다.

장식성 그라디언트·반짝이는 금색·과장된 3D·카드 그림자·불필요한 원형 버튼을 새로 넣지 않습니다. 단색·여백·가느다란 경계 중심입니다. 기존 공개 청첩장 5종의 개별 팔레트는 변경하지 않으며 인트로 종료 후 각 테마의 실제 표지로 바로 연결합니다.

## 3. 타이포그래피

새 폰트 추가 없이 현재 프로젝트에 포함된 `Wedding Myeongjo` 및 `Wedding SUIT` 활용.

| 역할 | 크기/행간 | 스타일 |
| --- | --- | --- |
| 두 사람의 이름 | `clamp(26px, 6vw, 32px)`, 행간 1.55 | Wedding Myeongjo, weight 400~500 |
| 주 메시지 | 15px, 행간 1.75~1.9 | Wedding Myeongjo |
| 날짜·장소 | 13px, 행간 1.7 | Wedding SUIT |
| 버튼·건너뛰기 | 14px, 행간 1.5 | Wedding SUIT, weight 500 |
| PC 중앙 인트로 | 최대 480px | 텍스트 콘텐츠 최대 328px |

이름이 길어도 한 글자씩 쪼개지지 않도록 `word-break: keep-all`과 정돈된 줄바꿈을 사용합니다. 기본형·포토형·클래식형·내추럴형은 명조로 연결하고 모던형(`classic-r`)의 본문 정체성을 따라 인트로 이름 서체만 SUIT 고딕으로 예외 적용할 수 있도록 구성합니다. 사용자 데이터는 문구로 대체하거나 가공하지 않습니다.

## 4. 레이아웃·반응형

- 중앙 인트로 스테이지 `max-width: 480px`, `min-height: 100dvh` 기반. PC 1440px의 양측 배경은 같은 톤의 확장 캔버스로 연결하고 검정 띠·강한 액자 효과를 만들지 않습니다.
- 320~359px의 좌우 간격 20px, 360px 이상 24px. 내부 요소 간격은 8 / 12 / 16 / 24 / 32 / 48px 6단계.
- Light: 이름→짧은 메시지→날짜 순의 단일 중앙 정렬. 추후 1-B에서 실제 샘플 캡처와 1:1 비교.
- Cinema: 고객 대표 사진 중심, 이름과 날짜를 함께 읽을 수 있는 한 개 조판 영역. 사진이 없을 때는 밝기 변화가 없는 텍스트용 배경으로 대체.
- Envelope: 접힘·봉투의 입체 묘사는 제거, 차분한 평면 카드 / 편지 형태와 탭 하나만 남김. 정지 상태에서 본문 접근 버튼과 건너뛰기는 항상 보임.
- 터치·키보드 행동 영역 **최소 48×48px**, 노치/상태바의 `safe-area-inset-*` 반영. 가로 스크롤 없음.
- 검수 폭: 320, 360, 390, 430, 600, 840, 1280, 1440 CSS px. 600/840은 브라우저 시뮬레이션이며 실물 폴더블·태블릿을 대신하지 않습니다.

## 5. 모션 원칙

| 인트로 | 목표 전체 시간 | 단일 주요 연출 | 제거할 동작 |
| --- | --- | --- | --- |
| `light` | **1,400ms** | 타이포그래피 1회 등장 → 본문 부드러운 전환 | 광선 스윕, 글자 반복 퇴장, clip-path 화면 와이프 |
| `cinema` | **1,600ms** | 사진과 이름의 짧은 페이드 → 본문 표지 전환 | 검은 셔터, 이미지 좌표 장거리 이동, 과도한 영문 장식 |
| `envelope` | **탭 이후 1,100ms** | 평면 카드 소폭 상승 → 본문 전환 | 3D 덮개 180° 회전, 금빛 봉인, 이미지 비행 |
| `none` | **0ms** | 즉시 본문 노출 | 없음 |

공통 `ease: cubic-bezier(0.22,1,0.36,1)`, 기본 진입 580ms, 퇴장 420ms, stagger 최대 80ms, 이동 최대 12px. 특별한 필요가 없으면 `transform`과 `opacity`만 애니메이션하며 레이아웃을 재측정해 이미지의 위치·너비·높이를 프레임마다 변경하지 않습니다.

1-B 스토리보드에서 시작·독서·종료의 정확한 프레임과 사용자 인터랙션을 확정합니다. 2-A 구현에서는 사진이 이미 로드됐고 커버와 동일한 이미지일 때도 불필요한 강제 숨김을 피합니다.

## 6. 접근성 및 상태 규칙

1. **건너뛰기**: 항상 접근 가능, 명확한 이름 및 최소 48px, 클릭 즉시 안전하게 본문으로 복귀. 애니메이션 로딩 실패나 느린 인터넷에서도 작동.
2. **동작 줄이기**: `prefers-reduced-motion: reduce`에서는 모든 진입·퇴장 모션을 0ms로 하고, 사용자 입력형 Envelope는 열기 탭으로 즉시 진행하거나 즉시 본문을 선택할 수 있도록 유지.
3. **스크린리더**: 인트로가 열린 경우 다이얼로그 의미·초기 포커스·Escape·종료 후 본문 포커스를 보장하고, 문구·날짜를 중복 낭독하지 않음.
4. **리사이즈**: 회전·폴더블 펼침·브라우저 크기 변경 시 **무조건 complete() 호출 금지**. 전환 가능한 레이아웃으로 재배치하고, 실패 시에만 본문 안전 전환.
5. **세션**: 기존 `weddingIntroSessionKey(slug)`의 탭당 최초 1회, `#` 앵커 진입 시 스킵, 미리보기에서는 반복 재생 가능 정책 보존.
6. **빈 상태**: 대표 사진 404·이미지 누락·GSAP 지연/실패에서도 버튼/이름·날짜·본문 노출을 보장. 본문 대표 사진의 `visibility: hidden` 잔여물 금지.
7. **전환 안정성**: 기존 애니메이션 완료·skip·unmount·history 이동 경로에서 타이머, resize, 미디어 쿼리 및 GSAP context를 일관되게 해제.

## 7. 단계 간 연결 및 명확한 완료 기준

**1-A 완료 조건**: 토큰 CSS 모듈·명세·정적 계약 테스트 추가, 웹/Android 저장값과 공개 렌더러 무변경, CI 성공. 0-A의 실제 캡처와 디자인 결정을 연계.

**1-B 후속**: 모바일 390×844와 PC 1440×900의 light/cinema/envelope 3종 **시작·중간·끝 시안**, 정적 비교판과 프레임별 모션 사양. 사용자 승인 후 실제 교체.

**2-A/2-B 후속**: `QuietInvitationTokens.module.css`를 `WeddingIntro.tsx`에 적용, PC·Android 편집기의 기존 `introStyle` 키 보존, 미리보기와 저장·재방문·스킵 검증.

**3-A 후속**: 실 공개 웨딩 5종/PC·모바일·접근성·실기기·사진→본문 연결, reduced-motion, 네트워크 및 0-A 대비 전후 GIF/PNG 비교. 실제 커플 페이지의 결과 확인 전 완료로 선언하지 않습니다.

**3-B 후속**: lint/타입·전체 테스트·빌드·Firebase Emulator·PR 승인 → `main` 병합 → Firebase App Hosting 롤아웃 커밋 확인 → 공개 URL 회귀. 이 단계에는 배포 없음.

## 8. 변경 범위

- 추가: `src/components/sections/WeddingIntro/QuietInvitationTokens.module.css` — 향후 연결할 **비활성 토큰**. 기존 화면 CSS를 덮어쓰지 않음.
- 추가: `docs/design/quiet-invitation-intro-design-system.md` — 본 문서.
- 추가: `scripts/test-quiet-invitation-tokens.mts` — 대비·설계 계약 정적 검증.
- 최소 변경: `scripts/run-test-suite.mjs` — 새 검증 스크립트를 기존 CI 테스트에 등록.
- 제외: 고객 데이터·결제·공개 URL·기존 introStyle·사진·인트로 구현·운영 배포.

**주의:** 0-A의 시각적 문제는 실제 캡처/코드에서 확인됐지만, 이 1-A는 디자인 표준만 확정한 단계이므로 “인트로가 개선되어 배포됐다”는 판정이 아닙니다.
