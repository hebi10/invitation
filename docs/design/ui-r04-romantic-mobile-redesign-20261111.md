# UI-R04 — 포토형(romantic) 모바일 청첩장 리뉴얼

기준: 2026-11-11. 선행 스택 PR #83 → #84 → #85 → #86 이후 작업.

## 실제 변경
- `WeddingCover.module.css`: 포토형 표지의 이름/날짜/시간/장소 계층, 사진 위 이름 대비 및 320px 안전 여백.
- `WeddingBase.module.css`: 포토형의 바로가기·초대문·갤러리·예식 안내·하단 이동 링크 간격, 긴 예식장 이름 줄바꿈.
- `WeddingGallerySwiper.module.css`: romantic variant만 기존 이전/다음 버튼 최소 48px, 페이지 카운터, 진행 표시 및 보조 이미지 간격 보정.
- 새 이미지나 가짜 정보·댓글은 추가하지 않음. 고객 사진 순서/초점, 기존 fade 전환, 확대 모달, 터치/키보드 이동과 동작 줄이기 설정 유지.

## 범위·보존
- 5종 중 romantic 전용 선택자 및 일부 photographic 커버 스타일만 변경.
- 다른 테마와 vow, 제작/관리 UI, 운영 고객 사진·계좌·댓글, Firebase/Firestore/Storage, 결제·Play 운영 설정, 공개 URL은 변경하지 않음.
- 장식성 다중 폴라로이드, 새로운 3D·그라데이션·애니메이션은 도입하지 않음.

## QA 완료 게이트
1. 선행 PR #83~#86의 기준선 캡처와 CI 성공 확인 및 순차 병합 후 이 PR 검토.
2. ESLint, TypeScript, 전체 단위/회귀 테스트, Next.js 빌드 및 CSS Modules 검증.
3. romantic 320/360/390/430/768/1440 CSS px, 글자 200%, 대표사진/갤러리 사진 0·1·다장, 긴 이름·예식장.
4. 표지 textPosition(top/below/기타 설정), focusX/focusY, 사진 위 대비 및 사진 변경 시 원본 이미지 보존.
5. 이전·다음·페이지 카운터·보조 사진·모달 열기/ESC/포커스 복귀, 키보드 이동, reduced motion, 달력/지도/계좌/방명록 회귀.
6. 실제 Android/iOS 물리 기기 및 운영 URL 검증은 자동 브라우저 테스트와 별도.

현재 소스 변경/문서 작성만 완료. GitHub Actions 및 시각 QA 통과, main 병합, Firebase/Google Play 배포 여부는 별도 실제 결과가 필요.
