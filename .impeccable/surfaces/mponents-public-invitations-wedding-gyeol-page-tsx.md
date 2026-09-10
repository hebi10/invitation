---
version: 1
slug: "mponents-public-invitations-wedding-gyeol-page-tsx"
primary_target: "src/app/_components/public-invitations/wedding/gyeol/Page.tsx"
related_targets: ["src/app/_components/public-invitations/wedding/gyeol/styles.module.css"]
---

# GYEOL 공개 웨딩 테마

- **Decision:** `direct-approved-gyeol-2026-09-10`
- **Scope / mode:** 공개 웨딩 초대장 `gyeol` 테마만의 Experience 표면이다. 운영 UI `DESIGN.md`와 기존 웨딩 4개 테마는 변경하지 않는다.
- **Audience / job:** 하객이 두 사람의 사진과 한글 초대 서사를 경험한 뒤 예식 일정·장소를 확인하고 연락·축의·방명록 행동을 완료한다.
- **Direction:** `결 / GYEOL` — 최대 480px의 흰색 연속 캔버스를 중앙 정렬하고 모든 화면에서 단일 열로 흐른다. 구획은 넉넉한 여백으로 나누며, 대표 사진은 원본 비율을 유지한다. 사진 위에 흰색 영문 필기체 제목과 두 사람의 이름·일정을 얹고 상하 그라데이션으로 가독성을 확보한다.
- **Color / type:** 배경 `#ffffff`, 본문 `#38363e`, 보조 글자 `#706b78`, 절제된 라벤더 제목 `#80639b`, 얇은 제어선 `#e4dfe9`를 사용한다. 달력과 방명록 항목에는 연한 라벤더 `#f8f6fb`를 적용한다. 한글은 로컬 Gowun Dodum 기반 `Gyeol Dodum`으로 본문 14px, 섹션 제목 15px·500, 보조 정보 11–13px를 사용한다. 표지의 `Our Wedding Day`는 로컬 Alex Brush 기반 `Gyeol Brush` 34–48px·400이며 이름은 20px·500이다.
- **Story order:** 대표 사진 → 초대 글 → 가족 연락 → 우리의 순간 갤러리 → 오시는 길·지도·방문 안내 → 달력·카운트다운 → 계좌 → 방명록. 선택 데이터나 기능 설정에 따라 관련 섹션을 숨기되 남은 정보의 순서는 유지한다.
- **Interactions:** 가족 연락, 신랑측·신부측 계좌, 방명록 입력, 식사·방문 상세 안내는 기본 접힘으로 시작한다. 갤러리는 사진 한 장씩 넘기며 원본 비율을 보존해 보여 주고 기존 확대 대화상자를 유지한다. 지도 링크가 있으면 실제 Kakao 지도를 지연 로드하며, 좌표가 없거나 유효하지 않으면 주소를 검색한다. 이동·확대는 사용자가 켜도록 하고, 로드 실패 시 외부 지도 링크를 제공한다.
- **Constraints:** 기존 웨딩 데이터 헬퍼와 공유 갤러리·계좌·방명록 기능을 재사용하며 저장 스키마, API, 공개 URL, 인증·인가 계약을 바꾸지 않는다. 키보드 포커스, 주요 행동의 44px 영역, 감소 모션 호환을 유지한다. 대표 사진이 없으면 기존 초대장 포스터를 표시한다.
- **Memorable moment:** 원본 비율의 웨딩 사진 위 흰색 필기체 표지에서 작은 라벤더 한글 제목과 여백 중심의 초대 서사로 자연스럽게 이어진다.
- **Unresolved:** 없음.
