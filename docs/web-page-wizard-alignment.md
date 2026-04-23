# page-wizard 정렬 상태

## 현재 기준

- `/page-wizard`
  - 새 청첩장 생성과 기존 페이지 편집 모두 `PageWizardClient` 기반 wizard 흐름을 사용합니다.
- `/page-editor`
  - 세부 편집 화면은 별도 editor 흐름을 유지합니다.

## 현재 동작

1. `/page-wizard`
   - 관리자 또는 권한 확인 사용자가 wizard 단계형 편집 화면으로 진입합니다.
   - 신규 생성은 `이벤트 타입 -> 테마/상품 -> 주소 -> 본문` 흐름으로 이어집니다.
2. `/page-wizard/[slug]`
   - 기존 페이지 설정도 wizard 화면에서 다시 편집합니다.
   - 삭제된 스토리지 이미지 참조는 진입 시 자동 정리합니다.
3. 이미지 단계
   - URL 직접 입력은 제거했습니다.
   - 업로드 슬롯은 `대표 이미지`, `공유 미리보기 이미지`, `카카오 카드 이미지`, `갤러리`로 분리했습니다.
   - 공유 미리보기 이미지는 `og:image`, `twitter:image`에 사용합니다.
   - 카카오 카드 이미지는 카카오 feed/card 공유용으로 사용합니다.
- 공개 페이지 카카오 공유는 `카카오 카드 이미지 -> 공유 미리보기 이미지 -> 대표 이미지` 순으로 fallback 합니다.
- `romantic` 공개 페이지의 로더와 첫 hero는 `heroImageUrl -> mainImageUrl` 순서로 대표 이미지를 우선 사용합니다.
- 공개 페이지는 스토리지 관리 URL을 다시 읽을 때도 wizard에 저장된 `metadata.images.wedding`과 일치하는 자산을 먼저 매칭한 뒤, 없을 때만 legacy `main`/갤러리 fallback을 사용합니다.
- `romantic` hero 날짜 문구는 이미지 중앙을 가리지 않도록 이름/장소 아래 하단으로 내리고, 밝은 배경에서도 읽히게 그림자를 보강했습니다.
- `romantic` 갤러리 모달은 좌우 터치 스와이프로 이전/다음 이미지를 넘길 수 있도록 보강했습니다.

## Expo 반영 메모

- Expo 관리 화면도 같은 3슬롯 이미지 구조를 사용하도록 맞췄습니다.
- 모바일 업로드 타입은 `cover`, `share-preview`, `kakao-card`, `gallery`를 지원합니다.
- 모바일 저장 시 `metadata.images.wedding`, `metadata.images.social`, `metadata.images.kakaoCard`로 각각 반영됩니다.
