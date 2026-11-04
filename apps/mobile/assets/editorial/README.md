# Editorial 이미지 에셋

이 디렉터리의 WebP 파일은 각각 별개의 이미지입니다. 디자인 가이드 시트를 자르거나 문구가 들어간 합성 이미지를 런타임에서 사용하는 방식이 아닙니다.

| 파일 | 용도 | 원본 |
| --- | --- | --- |
| `wedding-portrait.webp` | 비로그인 홈 웨딩 화보 | `public/images/home-wedding/portrait.webp` |
| `wedding-bouquet.webp` | 홈 보조 웨딩 이미지 | `public/images/home-wedding/bouquet.webp` |
| `rings-ribbon.webp` | 제작 2단계 상품 소개 | `public/images/share-defaults/rings-ribbon.webp` |
| `ivory-flowers.webp` | 추후 카드·소개 이미지에 사용할 독립 이미지 | `public/images/share-defaults/ivory-flowers.webp` |

모두 저장소에 이미 존재하던 개별 원본 에셋을 모바일 앱 번들로 복사한 것입니다. 인물은 `public/images/home-wedding/provenance.json`에 기록된 가상의 AI 생성 샘플이며 실제 사용자 사진이 아닙니다.

각 청첩장의 실제 디자인 미리보기는 `../theme-previews/*.jpg`를 사용합니다. 이 샘플 이미지에 남아 있는 개발 도구 아이콘·스크롤바를 피하기 위해 상단을 중심으로 크롭해서 표시하지만, 추후 개발 표시가 없는 별도 캡처로 교체하는 것이 좋습니다.

색상, 타이포그래피, 테마 가격 및 기간 정책은 각각 `src/constants/theme.ts`, `src/components/AppText.tsx`, `src/lib/invitationProductPolicy.ts`에 정의된 값을 사용합니다. 앱의 조작 아이콘은 별도 비트맵을 만들지 않고 프로젝트에 포함된 Ionicons를 사용합니다.
