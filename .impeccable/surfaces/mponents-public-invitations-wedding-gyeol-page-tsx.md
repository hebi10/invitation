---
version: 1
slug: "mponents-public-invitations-wedding-gyeol-page-tsx"
primary_target: "src/app/_components/public-invitations/wedding/gyeol/Page.tsx"
related_targets: ["src/app/_components/public-invitations/wedding/gyeol/styles.module.css"]
---

# GYEOL 공개 웨딩 테마

- **Decision:** `direct-approved-gyeol-2026-08-28`
- **Scope / mode:** 공개 웨딩 초대장 `gyeol` 테마만의 Experience 표면이다. 운영 UI `DESIGN.md`와 기존 웨딩 4개 테마는 변경하지 않는다.
- **Audience / job:** 하객이 두 사람의 사진과 한글 초대 서사를 경험한 뒤 예식 일정·장소를 확인하고 연락·축의·방명록 행동을 완료한다.
- **Direction:** `결 / GYEOL` — 화면을 이끄는 풀 포토와 한국어 에디토리얼 조판, 종이·먹색·얇은 선의 절제된 언어를 사용한다. 데스크톱 히어로는 사진과 이름·일정 정보가 병렬되는 실질적 2열이며, 모바일은 단일 열로 흐른다.
- **Story order:** invitation → schedule/location → contacts/accounts → gallery → guestbook. 선택 데이터가 없는 섹션은 숨기되 남은 정보의 순서는 유지한다.
- **Constraints:** 기존 웨딩 데이터 헬퍼와 공유 갤러리·계좌·방명록 기능을 재사용하며 저장 스키마, API, 공개 URL, 인증·인가 계약을 바꾸지 않는다. 동작은 키보드 포커스, 44px 행동 영역, 감소 모션 호환을 유지한다.
- **Memorable moment:** 첫 화면에서 웨딩 사진과 두 사람의 이름이 한 편의 한국어 에디토리얼 표지처럼 맞물린다.
- **Unresolved:** 없음.
