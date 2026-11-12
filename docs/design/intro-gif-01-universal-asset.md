# INTRO-GIF-01 — 고객 선택형 카탈로그의 첫 번째 GIF 후보 자산

기준 문서: [공통 인트로 전환 기획 PR #97](https://github.com/hebi10/invitation/pull/97), [추적 이슈 #98](https://github.com/hebi10/invitation/issues/98).

## 제작 및 파일
- **카탈로그 후보 `intro-01` GIF(10종 중 첫 번째):** `public/assets/invitation-intro/universal-2s.gif` — 480 × 600px, 8프레임 × 250ms = 정확히 **2,000ms**, 루프 없음.
- **정적 포스터:** `public/assets/invitation-intro/poster.webp` — 동일한 480 × 600px 마지막 프레임, 모션 감소·로딩 실패 시 사용.
- **자산 증빙:** `public/assets/invitation-intro/manifest.json` — 실제 GIF/WebP 바이트와 SHA-256, 루프, 재생 시간 기록.
- **재현 스크립트:** `scripts/generate-universal-intro.py`. 새 런타임 의존성 없이 GitHub Actions에서만 Pillow 11.3 및 Korean system font를 설치해 제작. 서체 파일 자체는 저장소에 추가하지 않음.

## 디자인 원칙
- 화이트 `#FAFAFA`, 차콜 `#282828`, 중성 회색 직선으로 구성. 문구는 **'초대합니다'** 한 가지.
- 봉투/밀랍·하트·꽃·반지·결혼사진·아기·브랜드 로고·금박·3D·그라데이션·그림자 등 특정 행사와 무관한 장식은 제외.
- 키워드·고객명·생일·웨딩 날짜 등을 GIF에 합성하지 않음. 결혼식과 돌잔치·생일·개업·일반 행사에서 **선택 가능한 옵션 1개**이며, 모든 고객에게 자동 적용하지 않음.
- 포스터는 GIF 종료 상태와 일치. GIF 8프레임의 수평선 너비만 점진적으로 변화하며 사용자 정보를 추가하지 않음.

## 자동 검수
- `.github/workflows/invitation-intro-gif-01-assets.yml`에서 GIF/WebP/manifest 생성, 프레임 8개·재생 총 2,000ms·무한 반복 금지·480×600 크기·두 이미지 각 150KB 미만·SHA-256을 검증.
- GitHub Actions artifact로 실 바이너리와 manifest를 보존하고 **이 자산 전용 브랜치에만 커밋**. `main` 직접 수정 금지.
- 생성 PNG/SVG 또는 개별 행사 폰트·개인 이미지는 포함하지 않음. 이미지 파일은 이벤트별 렌더러에 종속되지 않음.

## 이번 단계의 비변경 범위
- `WeddingIntro` 레거시 구현, `light/cinema/envelope/none` 설정, 개업·일반 행사의 별도 인트로는 그대로 유지.
- 고객 저장 데이터·결제·계좌·음악·방명록·Firebase·Google Play 출시·공개 웹 인트로 연동은 **미실행**.
- 다음 `INTRO-GIF-02-A~C`에서 약 10종 중 고객 직접 선택·미리보기·저장할 카탈로그를 만들고, `02-D`에서 실제 공개 페이지에 선택 ID를 연동. 기존 인트로 제거는 고객 데이터 호환성을 확인한 `INTRO-GIF-04` 이후. **2초 GIF 재생 길이가 자동 본문 진입을 뜻하지는 않음**.

## 검토 순서
1. 실제 GIF 한 번 재생과 포스터 상태 확인.
2. 웹 모바일 320/360/390/430px와 PC 1440px에서 원본 비율·배경·한글 렌더링 비교.
3. 데이터 없는 전 이벤트 타입용 공통 자산임을 확인.
4. `INTRO-GIF-02` 개발 전 `main` 병합 금지. 에셋 생성만으로 기존 사용자 화면이 달라져서는 안 됨.

## 2026-11-12 사용자 요구 개정
- 고객이 **약 10종의 GIF 목록에서 직접 보고 선택**합니다. `universal-2s`라는 현행 바이너리 파일명은 생성 단계의 원래 이름일 뿐 기본 선택이나 이벤트별 강제 사용을 의미하지 않음.
- 각 자산의 GIF와 정적 포스터는 향후 `introPresetId` 기반 카탈로그 항목 하나로 등록 예정. 현재 자산 1종 외 9종은 아직 제작되지 않음.
- 파일의 2,000ms 길이 검증과 공개 인트로 뒤 화면 전환 정책은 별개의 작업. 이번 PR은 선택 UI도, 강제 전환 로직도 포함하지 않음.
- 개정 상세 기획: https://github.com/hebi10/invitation/pull/97
