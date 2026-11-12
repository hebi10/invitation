# INTRO-GIF-01 — 전체 초대장 공용 2초 GIF 자산 인수

기준 문서: [공통 인트로 전환 기획 PR #97](https://github.com/hebi10/invitation/pull/97), [추적 이슈 #98](https://github.com/hebi10/invitation/issues/98).

## 제작 및 파일
- **공통 GIF:** `public/assets/invitation-intro/universal-2s.gif` — 480 × 600px, 8프레임 × 250ms = 정확히 **2,000ms**, 루프 없음.
- **정적 포스터:** `public/assets/invitation-intro/poster.webp` — 동일한 480 × 600px 마지막 프레임, 모션 감소·로딩 실패 시 사용.
- **자산 증빙:** `public/assets/invitation-intro/manifest.json` — 실제 GIF/WebP 바이트와 SHA-256, 루프, 재생 시간 기록.
- **재현 스크립트:** `scripts/generate-universal-intro.py`. 새 런타임 의존성 없이 GitHub Actions에서만 Pillow 11.3 및 Korean system font를 설치해 제작. 서체 파일 자체는 저장소에 추가하지 않음.

## 디자인 원칙
- 화이트 `#FAFAFA`, 차콜 `#282828`, 중성 회색 직선으로 구성. 문구는 **'초대합니다'** 한 가지.
- 봉투/밀랍·하트·꽃·반지·결혼사진·아기·브랜드 로고·금박·3D·그라데이션·그림자 등 특정 행사와 무관한 장식은 제외.
- 키워드·고객명·생일·웨딩 날짜 등을 GIF에 합성하지 않음. 결혼식과 돌잔치·생일·개업·일반 행사 모두 한 파일을 공통 사용.
- 포스터는 GIF 종료 상태와 일치. GIF 8프레임의 수평선 너비만 점진적으로 변화하며 사용자 정보를 추가하지 않음.

## 자동 검수
- `.github/workflows/invitation-intro-gif-01-assets.yml`에서 GIF/WebP/manifest 생성, 프레임 8개·재생 총 2,000ms·무한 반복 금지·480×600 크기·두 이미지 각 150KB 미만·SHA-256을 검증.
- GitHub Actions artifact로 실 바이너리와 manifest를 보존하고 **이 자산 전용 브랜치에만 커밋**. `main` 직접 수정 금지.
- 생성 PNG/SVG 또는 개별 행사 폰트·개인 이미지는 포함하지 않음. 이미지 파일은 이벤트별 렌더러에 종속되지 않음.

## 이번 단계의 비변경 범위
- `WeddingIntro` 레거시 구현, `light/cinema/envelope/none` 설정, 개업·일반 행사의 별도 인트로는 그대로 유지.
- 고객 저장 데이터·결제·계좌·음악·방명록·Firebase·Google Play 출시·공개 웹 인트로 연동은 **미실행**.
- 다음 `INTRO-GIF-02`에서 공통 2초 오버레이와 skip/세션/URL hash/reduced-motion/오류 폴백을 연결하며, 이후 `INTRO-GIF-03~04`에서 PC·Android 편집 UI 호환 및 기존 3종 제거.

## 검토 순서
1. 실제 GIF 한 번 재생과 포스터 상태 확인.
2. 웹 모바일 320/360/390/430px와 PC 1440px에서 원본 비율·배경·한글 렌더링 비교.
3. 데이터 없는 전 이벤트 타입용 공통 자산임을 확인.
4. `INTRO-GIF-02` 개발 전 `main` 병합 금지. 에셋 생성만으로 기존 사용자 화면이 달라져서는 안 됨.
