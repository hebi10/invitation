---
version: 1
slug: "mponents-public-invitations-wedding-gyeol-page-tsx"
primary_target: "src/app/_components/public-invitations/wedding/WeddingBase.tsx"
related_targets: ["src/app/_components/public-invitations/wedding/WeddingBase.module.css", "src/app/_components/public-invitations/wedding/WeddingCover.tsx", "src/app/_components/public-invitations/wedding/WeddingCover.module.css", "src/app/_components/public-invitations/wedding/gyeol/Page.tsx", "src/app/_components/public-invitations/wedding/quiet-ceremony/Page.tsx", "src/app/_components/public-invitations/wedding/garden-note/Page.tsx", "src/app/_components/public-invitations/wedding/portrait-letter/Page.tsx", "src/app/_components/public-invitations/wedding/letterpress/Page.tsx"]
---

# 공개 웨딩 초대장 5개 디자인

- **Decision:** 사용자 승인에 따라 기존 색상 중심 변형을 교체하고 기본형·사진형·편지형·에디토리얼·전통의 다섯 구조로 구성한다
- **Scope / mode:** 하객이 두 사람의 사진과 초대 글을 읽고 일정·장소·연락·축의·방명록으로 이어지는 Experience 표면이다. 운영 UI의 DESIGN.md와 독립적으로 관리한다
- **Shared implementation:** 기존 테마 키와 라우트는 유지하며 5개 Page 래퍼가 WeddingBase를 호출한다. 본문과 기능은 WeddingBase.tsx/CSS, 표지는 WeddingCover.tsx/CSS에서 구성한다
- **Canvas / type:** 최대 480px의 단일 열과 넉넉한 세로 여백을 공유한다. 기본 배경은 #ffffff, 본문 #292929, 보조 #68645f, 강조 #393939이며 본문 14px, 일반 제목 15px·500이다. 편지형과 전통은 로컬 Nanum Myeongjo 기반 Wedding Myeongjo를 사용한다

| 테마 키 · 방향 | 표지와 조판 | 본문과 사진 |
| --- | --- | --- |
| simple · 기본형 | 중앙 이름 24px, 일정, 좌우 여백 안 원본 비율 사진, 장소 순서 | 고딕 중심의 중앙 정렬 본문, 한 장씩 넘기는 갤러리, 오시는 길 다음 달력 |
| romantic · 사진형 | 화면 폭 사진 위 하단 흰 이름 30px·명조와 일정·장소, 어두운 하단 그라데이션 | 표지 사진은 높이에 맞춰 잘라 채움. 갤러리를 초대 글보다 앞에 두고 큰 단일 열로 배치. 오시는 길 다음 달력 |
| emotional · 편지형 | #fcfaf6 배경, 왼쪽 이름 20px와 ‘소중한 당신께’, 오른쪽에 작은 사진, 하단 일정·장소 | 왼쪽 초대 글과 오른쪽 서명, 260px 갤러리, 배경 구획 없는 달력 |
| classic-r · 에디토리얼 | 위아래 이름 34px에 수평 단차, 오른쪽 끝까지 이어지는 사진, 오른쪽 일정·장소 | 22px 왼쪽 제목, 오른쪽으로 밀린 초대 글. 초대 글 앞 비대칭 갤러리와 오시는 길 앞 달력 |
| gyeol · 전통 | #faf8f3 배경, 세로 약속 문구와 이름 28px, 가족 관계·이름과 일정·장소 다음 사진 | 명조 중앙 조판과 넓은 행간, 280px 갤러리, 오시는 길 앞 달력. 강조 #574638 |

- **Story order:** 기본형·편지형은 표지 → 초대 글 → 연락 → 갤러리 → 오시는 길 → 달력 → 계좌 → 방명록이다. 사진형은 갤러리를 표지 바로 뒤에 둔다. 에디토리얼은 갤러리를 표지 바로 뒤에, 달력을 오시는 길 앞에 둔다. 전통은 기본 순서에서 달력을 오시는 길 앞으로 옮긴다. 선택 데이터가 없으면 해당 섹션을 숨긴다
- **Shared interactions:** 가족 연락, 양측 계좌, 방명록 입력, 식사·방문 안내는 기본 접힘이다. 연락 대상은 전화번호가 있는 두 사람과 부모다. 기존 공유 갤러리 확대, 계좌 복사, 방명록 기능과 달력·카운트다운을 재사용한다
- **Map:** 지도 링크가 있으면 기존 gyeol/LocationMap을 사용한다. 실제 Kakao 지도 지연 로드, 유효 좌표 또는 주소 검색, 사용자 선택에 따른 지도 이동·확대, 로드 실패 시 외부 지도 링크를 유지한다
- **Constraints:** 저장 스키마, API, 권한과 공개 URL 계약을 보존한다. 주요 행동의 44px 영역, 키보드 포커스, 감소 모션을 공유한다. 사진이 없으면 사진 영역을 생략하고 이름·일정·장소를 남긴다. 사진형은 사진 없는 표지 배경을 제공한다
- **Review evidence:** 동일 사진을 사용한 5개 380px 모바일 캡처와 5개 PC 캡처에서 구조적 차이, 중앙 캔버스, 본문 흐름을 확인했다. 임시 로컬 사진 3장을 사용한 사진형·에디토리얼 모바일 갤러리 캡처에서 큰 단일 열과 단차가 있는 비대칭 배열을 추가 확인했다. 메인 검증에서 갤러리 확대 → 다음 → Escape 후 첫 트리거 초점 복귀를 확인했다. 검토용 사진은 실제 고객 갤러리를 변경하지 않았다. 지도는 로딩 상태로 촬영되어 SDK 로드 및 타일 완료 상태는 이 검증 범위에서 제외한다
