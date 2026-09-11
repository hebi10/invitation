---
name: Invitation Operation UI
description: 고객 편집과 관리 운영을 흰색·회색의 평면적 작업 화면으로 연결하는 Operate UI
colors:
  action-graphite: "#292b27"
  action-graphite-strong: "#111210"
  focus: "#596257"
  workspace-ink: "#1c1d1a"
  muted-ink: "#666862"
  subtle-ink: "#70726b"
  divider: "#d8dad4"
  divider-strong: "#8c9087"
  surface: "#ffffff"
  canvas: "#f8f8f7"
  success: "#3f7054"
  warning: "#8a6428"
  error: "#a5423a"
typography:
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.35
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.94rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 700
    lineHeight: 1.4
rounded:
  control: "0px"
  panel: "0px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.action-graphite}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.workspace-ink}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.workspace-ink}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
---

# Design System: Invitation Operation UI

## Overview

**Creative North Star: "The Clear Operations Desk"**

고객 인증·대시보드·생성·편집 화면과 관리자는 장식물을 감상하는 화면이 아니라 정보를 빠짐없이 완성하고 운영하는 작업 공간입니다. 모든 작업 화면은 흰색·회색 표면과 차콜 행동색의 평면적 문법을 공유하되, 고객 화면은 편안한 계정 관리와 입력 흐름에, 관리자는 빠른 조회와 상태 처리에 집중합니다. 공개 초대장의 이벤트별 테마는 이 작업 UI와 독립적으로 유지합니다.

**Key Characteristics:**

- 중립 캔버스와 흰 작업 표면
- 먹색 정보 계층과 하나의 차콜 행동 강조
- 영문 장식 문구와 알약형 지표를 배제한 실제 정보 중심 구성
- PC에서 목록 조회와 상세 편집, 모바일에서 상태 확인과 지원되는 작업 중심 구성
- 여백과 필요한 전체 테두리로 구분하는 직선 표면
- 필요할 때만 여는 미리보기

## Colors

작업 화면은 밝은 회색 캔버스, 흰 표면, 차콜 행동색으로 구성합니다. 녹색·황토색·적색은 성공·경고·오류처럼 의미가 있는 상태에만 사용합니다.

### Primary

- **Action Graphite:** 주요 저장·다음 행동과 선택 상태에 사용합니다.
- **Action Graphite Strong:** 눌림 상태와 가장 강한 텍스트에 사용합니다.
- **Focus:** 키보드 포커스와 입력 활성 상태를 분명하게 표시합니다.

### Neutral

- **Workspace Ink:** 제목과 핵심 정보에 사용합니다.
- **Muted / Subtle Ink:** 설명, 메타데이터, 비활성 정보에 사용합니다.
- **Surface / Canvas:** 입력 표면과 앱 배경을 분리합니다.
- **Divider / Divider Strong:** 카드 그림자 대신 영역 경계를 만듭니다.

**The One Action Color Rule.** 한 화면의 주된 행동 강조는 Action Graphite 하나로 유지합니다.

## Typography

시스템 고딕만 사용하여 관리자와 고객 환경에서 빠르고 안정적으로 읽히게 합니다. 장식용 세리프는 편집 워크스페이스에 사용하지 않습니다.

### Hierarchy

- **Title:** 화면·작업 영역·단계 제목은 간결하게 표시합니다. 기본 굵기 500, 필요한 강조는 700까지, 크기는 34px 이하로 제한합니다.
- **Body:** 입력 설명과 도움말에 사용하고 긴 문장은 넉넉한 행간을 유지합니다.
- **Label:** 상태, 순서, 필드명처럼 짧고 반복되는 정보에 사용합니다.

## Layout

고객 계정 화면은 최대 1100px, 로그인·가입은 최대 440px의 단일 폼으로 구성합니다. 내 이벤트 목록에는 공개 설정과 최근 수정, 바로 수정할 행동을 보여 주며 제작권·티켓은 생성 행동 가까이에 둡니다. 고객 생성은 제작권 선택, 기본 정보, 주소 확인으로 나누고 차감할 제작권을 제출 전에 확인합니다.

관리자 셸은 PC에서 최대 1440px와 160px 탐색 영역을 사용합니다. 이벤트는 검색·필터·목록에서 찾아 상세 작업으로 이동하며 공개 설정과 노출 기간을 함께 표시합니다. 고객 관리에서는 고객 목록에서 한 명을 선택하고 상세의 이벤트·이용권·관리 항목으로 작업을 나눕니다. 검색·선택·상세 항목은 URL 상태로 유지합니다.

고객 편집기는 최대 1080px 안에서 작업 목차와 입력 영역을 배치합니다. 상단에는 저장된 공개 상태, 변경·저장 상태, 마지막 저장 시각과 내용 저장을 표시합니다. 하단에는 이전과 저장 후 다음 또는 최종 저장을 둡니다. 최종 검토에서는 이름·일정·장소·주소·사진을 확인하고 필요한 영역으로 이동할 수 있습니다.

**모바일 범위.** 관리자는 조회와 상태 확인을 우선하며 기존 읽기 전용 제한을 유지합니다. 고객 편집기는 제공하던 필드를 보존하고 단일 열, 접히는 목차, 하단 행동으로 재배치합니다. 복잡한 운영 작업의 권한이나 지원 범위를 반응형 변경으로 넓히지 않습니다.

## Elevation & Depth

기본 표면에는 그림자를 사용하지 않습니다. 배경색 차이, 1px 구분선, sticky 위치로 깊이와 계층을 표현합니다. 모달은 반투명 오버레이로만 작업 맥락과 분리합니다.

**The Flat-by-Default Rule.** 정적인 카드에 그림자를 추가하지 않습니다.

## Shapes

버튼·입력·패널의 기본 반경은 0px입니다. 장식적인 그림자, 둥근 카드, 마우스 오버 효과는 사용하지 않습니다. 구조는 여백과 배경 차이로 구분하며 테두리가 필요하면 전체 면에 적용합니다.

## Components

### Buttons

- **Primary:** 차콜 배경과 흰 글자, 직선 모서리로 다음·저장 같은 한 가지 핵심 행동을 표시합니다.
- **Secondary:** 흰 배경과 중립 테두리로 이전·닫기·미리보기 행동을 표시합니다.
- **Focus:** `focus-visible`에서 명확한 저채도 녹회색 외곽선을 제공합니다.

### Cards / Containers

- **Background:** 흰 표면을 사용합니다.
- **Border:** 1px 중립 구분선으로 경계를 만듭니다.
- **Shadow Strategy:** 기본 그림자는 없습니다.

### Inputs / Fields

- **Style:** 흰 배경, 1px 중립 테두리, 직선 모서리를 사용합니다.
- **Focus:** 녹회색 테두리나 외곽선으로 편집 위치를 명확히 합니다.
- **Error:** 붉은색은 검증 실패 메시지와 상태에만 사용합니다.

### Navigation

데스크톱 목차는 번호·제목·상태를 한 행에 보여주며 현재 영역만 차콜과 선택 배경으로 강조합니다. 모바일은 현재 순서를 한 번만 요약하고 전체 작업 목록을 모달로 엽니다.

### Save Status

저장 전, 변경사항 있음, 저장 중, 저장됨, 저장 실패를 짧은 텍스트와 의미 색상으로 구분합니다. 마지막 저장 시각만으로 수정된 내용을 저장됨으로 표시하지 않습니다. 내용 저장과 저장 후 다음은 저장된 공개 상태를 유지하며, 최종 검토의 저장 후 공개·비공개로 저장에서만 선택한 공개 여부를 적용합니다. 아직 적용되지 않은 공개 설정은 변경사항으로 남깁니다. 저장 중에는 입력·이동을 잠그고 실패 시 재시도 행동을 제공합니다.

## Do's and Don'ts

### Do:

- **Do** 기존 필드·검증·모바일 지원 범위와 권한을 보존합니다.
- **Do** 오류가 있는 첫 단계로 스크롤하고 포커스를 이동합니다.
- **Do** 미리보기는 요청할 때만 열고 입력 흐름을 우선합니다.

### Don't:

- **Don't** 크림색, 장식용 세리프, 그라디언트로 편집 화면을 웨딩 테마처럼 꾸미지 않습니다.
- **Don't** 모든 섹션에 그림자와 큰 반경을 반복하지 않습니다.
- **Don't** 저장되지 않은 변경을 저장됨으로 표현하지 않습니다.

## 공개 청첩장 기본형(simple)

이 섹션은 공개 청첩장 기본형에만 적용하며, 위 운영 UI의 토큰과 다른 공개 테마는 그대로 유지합니다.

- 아이보리 종이 배경 `#faf9f6`, 본문 `#282725`, 보조 글자 `#716e69`, 구분선 `#e6e2dc`를 사용합니다.
- 화면은 최대 480px, 주요 콘텐츠의 좌우 여백은 24px, 주요 섹션 사이 여백은 88px입니다.
- 이름과 제목은 `Wedding Myeongjo` 명조체, 본문은 기존 고딕체 15px입니다. 표지 이름은 26px(359px 이하 24px), 섹션 제목은 20px입니다.
- 표지 사진은 콘텐츠 폭의 92%, 3:4 비율이며 갤러리는 4:5 사진을 한 장씩 표시합니다. 두 사진 영역 모두 `object-fit: cover`로 채웁니다.
- 갤러리는 터치·좌우 방향키·이전/다음 버튼으로 이동하고 사진을 누르면 기존 확대 보기를 엽니다. 동작 줄이기 설정에서는 전환 시간을 0으로 적용합니다.
- 바로가기·연락·펼침·계좌 복사·방명록 주요 버튼과 갤러리 이동 버튼은 최소 높이 48px을 사용합니다.
- 예식 안내와 오시는 길을 나누고, 달력·연락처·교통 및 식사 안내·계좌·방명록 입력은 기존 조건에 따라 펼쳐 봅니다.
- 마무리는 같은 종이색과 좌우 24px 여백, 명조 이름 22px와 감사 문구 15px로 연결합니다.
- 기존 Firebase 연결, 데이터 저장 구조, 조회 흐름과 다른 테마의 동작은 변경하지 않습니다.
