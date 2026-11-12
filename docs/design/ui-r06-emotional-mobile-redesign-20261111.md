# UI-R06 — 내추럴형(emotional) 모바일 청첩장 리뉴얼

기준: 2026-11-11. 선행 UI-R00~R05 PR #83 → #84 → #85 → #86 → #87 → #88.

## 실제 변경
- `WeddingCover.module.css`: 기존 왼쪽 정렬 표지에서 인사·이름·날짜·장소의 글자 크기와 간격, `garden-sprig.webp` 장식 크기 및 320px 배치를 정돈.
- `WeddingBase.module.css`: emotional 한정 세이지 3개 아이콘 바로가기, 초대 문구, 날짜 중심 예식 카드, 교통·계좌 정보 패널, 320px 반응형 여백 보정.
- `WeddingGallerySwiper.module.css`: emotional 한정 기존 이전/다음 버튼, 카운터, 진행선, 키보드 초점 및 작은 화면 여백 정돈.

## 유지 범위
- `WeddingCover.tsx`의 사용자 대표 사진·초점 및 `textPosition` 설정, 기존 조건부 섹션, 왼쪽 정렬, 이름/날짜/장소의 저장 데이터.
- 내추럴형 고유 세이지·올리브 팔레트, 기존 `garden-sprig.webp`, 옆 사진 보이는 슬라이더 및 전환.
- 사진/갤러리 원본·순서·확대, 달력, 지도, 계좌 접힘·복사, 연락처, 방명록 및 공유 주소 유지.
- 다른 4종과 vow, 제작/관리 UI, Firebase/Firestore/Storage, 계정·결제·Play 릴리스 설정 변경 없음.
- 임의 고객 정보·고정 D-Day 숫자, 추가 잎사귀 장식, 3D·새 애니메이션·그라데이션 없음.

## QA 통과 게이트
1. PR #83~#88의 Actions·기준선 캡처를 먼저 확인하고 각각 안전하게 병합한 뒤 본 PR 검증.
2. ESLint·TypeScript·전체 테스트·Next.js production build, CSS Modules 검증.
3. emotional 320/360/390/430/768/1440 CSS px, 200% 글자 확대, 사진 없음/1장/다장, 긴 이름·주소.
4. 저장된 focusX/focusY 및 textPosition별 표지, 좌측 정렬 유지, 장식 중복·잘림 여부.
5. 갤러리 터치/키보드/모달, 달력/ICS, 지도·길찾기, 가족 연락, 계좌/방명록 및 접근성 회귀.
6. 실제 Android/iOS 기기와 운영 공개 URL 확인은 가상 샘플 QA와 별도.

코드 및 QA 문서 작성은 완료됐으나 CI 성공, 실화면 캡처, main 병합, Firebase 및 Google Play 배포의 성공은 검증 전까지 미완료입니다.
