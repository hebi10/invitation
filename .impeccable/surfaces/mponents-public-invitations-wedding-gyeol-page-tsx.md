---
version: 1
slug: "mponents-public-invitations-wedding-gyeol-page-tsx"
primary_target: "src/app/_components/public-invitations/wedding/gyeol/Page.tsx"
related_targets: ["src/app/_components/public-invitations/wedding/gyeol/styles.module.css"]
---

# GYEOL 공개 웨딩 테마

- **Decision:** `direct-approved-gyeol-2026-09-10`
- **Scope / mode:** 공개 웨딩 초대장 `gyeol`의 Experience 표면과, 사용자 추가 승인으로 기존 분위기를 유지하며 공통 기준을 확장한 웨딩 4개 테마를 기록한다. 운영 UI `DESIGN.md`는 변경하지 않는다.
- **Audience / job:** 하객이 두 사람의 사진과 한글 초대 서사를 경험한 뒤 예식 일정·장소를 확인하고 연락·축의·방명록 행동을 완료한다.
- **Direction:** `결 / GYEOL` — 최대 480px의 흰색 연속 캔버스를 중앙 정렬하고 모든 화면에서 단일 열로 흐른다. 구획은 넉넉한 여백으로 나누며, 대표 사진은 원본 비율을 유지한다. 사진 위에 흰색 영문 필기체 제목과 두 사람의 이름·일정을 얹고 상하 그라데이션으로 가독성을 확보한다.
- **Color / type:** 배경 `#ffffff`, 본문 `#38363e`, 보조 글자 `#706b78`, 절제된 라벤더 제목 `#80639b`, 얇은 제어선 `#e4dfe9`를 사용한다. 달력과 방명록 항목에는 연한 라벤더 `#f8f6fb`를 적용한다. 한글은 로컬 Gowun Dodum 기반 `Gyeol Dodum`으로 본문 14px, 섹션 제목 15px·500, 보조 정보 11–13px를 사용한다. 표지의 `Our Wedding Day`는 로컬 Alex Brush 기반 `Gyeol Brush` 34–48px·400이며 이름은 20px·500이다.
- **Story order:** 대표 사진 → 초대 글 → 가족 연락 → 우리의 순간 갤러리 → 오시는 길·지도·방문 안내 → 달력·카운트다운 → 계좌 → 방명록. 선택 데이터나 기능 설정에 따라 관련 섹션을 숨기되 남은 정보의 순서는 유지한다.
- **Interactions:** 가족 연락, 신랑측·신부측 계좌, 방명록 입력, 식사·방문 상세 안내는 기본 접힘으로 시작한다. 갤러리는 사진 한 장씩 넘기며 원본 비율을 보존해 보여 주고 기존 확대 대화상자를 유지한다. 지도 링크가 있으면 실제 Kakao 지도를 지연 로드하며, 좌표가 없거나 유효하지 않으면 주소를 검색한다. 이동·확대는 사용자가 켜도록 하고, 로드 실패 시 외부 지도 링크를 제공한다.
- **Constraints:** 기존 웨딩 데이터 헬퍼와 공유 갤러리·계좌·방명록 기능을 재사용하며 저장 스키마, API, 공개 URL, 인증·인가 계약을 바꾸지 않는다. 키보드 포커스, 주요 행동의 44px 영역, 감소 모션 호환을 유지한다. 대표 사진이 없으면 기존 초대장 포스터를 표시한다.
- **Memorable moment:** 원본 비율의 웨딩 사진 위 흰색 필기체 표지에서 작은 라벤더 한글 제목과 여백 중심의 초대 서사로 자연스럽게 이어진다.
- **Unresolved:** 없음.

## 공통 기준 확장

- **Shared implementation:** `portrait-letter`, `garden-note`, `quiet-ceremony`, `letterpress`는 `gyeol/styles.module.css`와 실제 지도 `gyeol/LocationMap`을 재사용하고 테마 CSS로 색상·폰트·표지를 조정한다. 모두 최대 480px의 연속 단일 열, 원본 비율 대표 사진, 작은 본문·섹션 제목, 한 장씩 넘기는 갤러리를 유지한다.
- **Flow / disclosure:** 표지 → 초대 글 → 연락 → 갤러리 → 오시는 길·지도·방문 안내 → 달력·카운트다운 → 계좌 → 방명록 순서다. 연락, 식사·방문 상세 안내, 양측 계좌, 방명록 입력은 기본 접힘이다. 연락 대상은 `portrait-letter`가 두 사람, `garden-note`가 부모, `quiet-ceremony`와 `letterpress`가 두 사람과 부모이며 기존 데이터 필터를 유지한다.

| 테마 | 배경 / 본문 / 강조 | 폰트 | 표지의 차이 |
| --- | --- | --- | --- |
| `portrait-letter` | `#ffffff` / `#3e3730` / `#82694e` | Gyeol Dodum | 좌우 여백 안의 사진 아래 이름·일정·장소, 이름 23px·500 및 작은 ‘그리고’ |
| `garden-note` | `#ffffff` / `#344037` / `#58724e` | Gyeol Dodum | 세이지색 이름·일정 아래 전체 폭 사진, 사진 아래 장소, 이름 25px·500 |
| `quiet-ceremony` | `#ffffff` / `#292c2a` / `#48534b` | Gyeol Dodum | 이름·일정·장소 아래 좌우 여백 안의 사진, 이름 23px·500 및 슬래시 |
| `letterpress` | `#fcfaf5` / `#362f27` / `#79634a` | 로컬 Nanum Myeongjo 기반 Wedding Myeongjo | 따뜻한 종이색 위 여백 안의 사진과 하단 이름·일정·장소, 이름 26px·500 및 가운뎃점 |
