# Editorial 이미지 에셋

이 디렉터리의 WebP 파일은 각각 별개의 이미지입니다. 디자인 가이드 시트를 자르거나 문구가 들어간 합성 이미지를 런타임에서 사용하는 방식이 아닙니다.

| 파일 | 용도 | 원본 |
| --- | --- | --- |
| `wedding-portrait.webp` | 비로그인 홈 웨딩 화보 | `public/images/home-wedding/portrait.webp` |
| `wedding-bouquet.webp` | 홈 보조 웨딩 이미지 | `public/images/home-wedding/bouquet.webp` |
| `rings-ribbon.webp` | 제작 2단계 상품 소개 | `public/images/share-defaults/rings-ribbon.webp` |
| `ivory-flowers.webp` | 추후 카드·소개 이미지에 사용할 독립 이미지 | `public/images/share-defaults/ivory-flowers.webp` |

모두 저장소에 이미 존재하던 개별 원본 에셋을 모바일 앱 번들로 복사한 것입니다. 인물은 `public/images/home-wedding/provenance.json`에 기록된 가상의 AI 생성 샘플이며 실제 사용자 사진이 아닙니다.

각 청첩장의 실제 디자인 미리보기는 `../theme-previews/*.jpg`를 사용합니다. 5개 미리보기는 `scripts/capture-clean-wedding-previews.mjs`로 실제 샘플 화면을 재캡처한 780×1440 JPG이며, Next.js 개발 표시와 스크롤바가 제외되어 있습니다. 갤러리에는 원본 390:720 비율을 적용했습니다.

색상, 타이포그래피, 테마 가격 및 기간 정책은 각각 `src/constants/theme.ts`, `src/components/AppText.tsx`, `src/lib/invitationProductPolicy.ts`에 정의된 값을 사용합니다. 앱의 조작 아이콘은 별도 비트맵을 만들지 않고 프로젝트에 포함된 Ionicons를 사용합니다.

## 앱 아이콘

`app-icon-design-source.webp`는 디자인 가이드에서 봉투·하트 심벌만 분리한 독립 WebP 소스입니다. `scripts/build-wedding-editorial-icon.mjs`로 Android용 `../icon-v3.png`(1024×1024), Play 스토어용 `../../store/icon.png`(512×512)를 각각 32비트 PNG로 생성합니다. `apps/mobile/app.config.ts`에서 새 아이콘을 사용합니다.
