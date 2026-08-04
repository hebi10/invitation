---
name: Invitation Page Wizard
description: 누락 없이 초대장 정보를 완성하는 중립적 Operate UI
colors:
  action-blue: "#315efb"
  action-blue-strong: "#2148cf"
  workspace-ink: "#17191f"
  muted-ink: "#626975"
  subtle-ink: "#8a919d"
  divider: "#dfe3e8"
  divider-strong: "#cbd1d9"
  surface: "#ffffff"
  canvas: "#f5f6f8"
  success: "#176b43"
  warning: "#8a5300"
  error: "#b42318"
typography:
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 750
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
  control: "6px"
  panel: "8px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.action-blue}"
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

# Design System: Invitation Page Wizard

## Overview

**Creative North Star: "The Clear Operations Desk"**

초대장 편집기는 장식물을 감상하는 화면이 아니라 관리자와 고객이 정보를 빠짐없이 완성하는 작업 공간입니다. 시각적 분위기는 차분하고 실용적이며, 현재 위치·오류·저장 상태를 우선적으로 드러냅니다. 크림색, 세리프 중심의 웨딩 장식, 과도한 카드와 그림자, 장식용 그라디언트는 이 작업 화면의 기준에서 제외합니다.

**Key Characteristics:**

- 중립 캔버스와 흰 작업 표면
- 먹색 정보 계층과 하나의 파란 행동 강조
- 데스크톱 2열, 모바일 단일 열의 동일한 정보 구조
- 얇은 구분선과 제한된 6~8px 반경
- 필요할 때만 여는 미리보기

## Colors

파란색은 진행 행동에만 제한적으로 쓰고, 대부분의 화면은 중립색의 명도 차와 선으로 구조화합니다.

### Primary

- **Action Blue:** 주요 저장·다음 행동과 선택 상태에 사용합니다.
- **Action Blue Strong:** 강조 텍스트와 눌림 상태에 사용합니다.

### Neutral

- **Workspace Ink:** 제목과 핵심 정보에 사용합니다.
- **Muted / Subtle Ink:** 설명, 메타데이터, 비활성 정보에 사용합니다.
- **Surface / Canvas:** 입력 표면과 앱 배경을 분리합니다.
- **Divider / Divider Strong:** 카드 그림자 대신 영역 경계를 만듭니다.

**The One Action Color Rule.** 한 화면의 주된 행동 강조는 Action Blue 하나로 유지합니다.

## Typography

시스템 고딕만 사용하여 관리자와 고객 환경에서 빠르고 안정적으로 읽히게 합니다. 장식용 세리프는 편집 워크스페이스에 사용하지 않습니다.

### Hierarchy

- **Title:** 화면·작업 영역·단계 제목에 사용하며 굵기로 계층을 만듭니다.
- **Body:** 입력 설명과 도움말에 사용하고 긴 문장은 넉넉한 행간을 유지합니다.
- **Label:** 상태, 순서, 필드명처럼 짧고 반복되는 정보에 사용합니다.

## Layout

최대 폭은 1080px이며 데스크톱에서는 240px 작업 목차와 최대 760px 입력 영역을 32px 간격으로 배치합니다. 상단 작업 바와 하단 행동 바는 현재 상태와 이동 수단을 계속 노출합니다. 모바일에서는 모든 정보를 단일 열로 바꾸고 작업 목차는 모달 목록으로 제공하며, 하단 행동은 엄지 접근 범위에 고정합니다.

**The Same Information Rule.** 반응형 전환은 필드를 숨기지 않고 배치 방식만 바꿉니다.

## Elevation & Depth

기본 표면에는 그림자를 사용하지 않습니다. 배경색 차이, 1px 구분선, sticky 위치로 깊이와 계층을 표현합니다. 모달은 반투명 오버레이로만 작업 맥락과 분리합니다.

**The Flat-by-Default Rule.** 정적인 카드에 그림자를 추가하지 않습니다.

## Shapes

버튼과 입력은 6px, 대화상자와 주요 패널은 8px 반경을 기준으로 합니다. 모든 컨테이너를 둥근 카드로 만들지 않으며, 구조가 필요한 곳은 직선 구분선을 우선합니다.

## Components

### Buttons

- **Primary:** 파란 배경과 흰 글자, 6px 반경으로 다음·저장 같은 한 가지 핵심 행동을 표시합니다.
- **Secondary:** 흰 배경과 중립 테두리로 이전·닫기·미리보기 행동을 표시합니다.
- **Focus:** `focus-visible`에서 명확한 파란 외곽선을 제공합니다.

### Cards / Containers

- **Background:** 흰 표면을 사용합니다.
- **Border:** 1px 중립 구분선으로 경계를 만듭니다.
- **Shadow Strategy:** 기본 그림자는 없습니다.

### Inputs / Fields

- **Style:** 흰 배경, 1px 중립 테두리, 6px 반경을 사용합니다.
- **Focus:** 파란 테두리나 외곽선으로 편집 위치를 명확히 합니다.
- **Error:** 붉은색은 검증 실패 메시지와 상태에만 사용합니다.

### Navigation

데스크톱 목차는 번호·제목·상태를 한 행에 보여주며 현재 영역만 파란색으로 강조합니다. 모바일은 현재 순서를 요약하고 전체 작업 목록을 모달로 엽니다.

### Save Status

저장 전, 변경사항 있음, 저장 중, 저장됨, 저장 실패를 짧은 텍스트와 의미 색상으로 구분합니다. 마지막 저장 시각만으로 수정된 내용을 저장됨으로 표시하지 않습니다.

## Do's and Don'ts

### Do:

- **Do** 모든 기존 필드와 검증을 데스크톱과 모바일에 동일하게 제공합니다.
- **Do** 오류가 있는 첫 단계로 스크롤하고 포커스를 이동합니다.
- **Do** 미리보기는 요청할 때만 열고 입력 흐름을 우선합니다.

### Don't:

- **Don't** 크림색, 장식용 세리프, 그라디언트로 편집 화면을 웨딩 테마처럼 꾸미지 않습니다.
- **Don't** 모든 섹션에 그림자와 큰 반경을 반복하지 않습니다.
- **Don't** 저장되지 않은 변경을 저장됨으로 표현하지 않습니다.
