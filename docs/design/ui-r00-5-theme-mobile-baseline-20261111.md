# UI-R00 — 공개 청첩장 5종 모바일 리뉴얼 기준선

**검증일:** 2026-11-11 (Asia/Seoul)  
**실행 원칙:** 고객 데이터 및 런타임 미변경. 후속 UI-R01~UI-R09의 변경·유지·제외 조건 정의.  
**현재 main 소스 SHA:** `87df75244845dad3b52b8517167af675b072b6ef`  
**이전 전체 화면 촬영 SHA:** `10f237bf93b3c5221baaff350963be6e122b46c7` (2026-11-11 07:04 UTC, UI-07-A-07 가상 데이터)  
**이전 전체 화면 QA 아티팩트:** GitHub artifact `13835457972` · 5종 원본 PNG가 보존된 [Drive 폴더](https://drive.google.com/drive/folders/1pzMnRJT6Az3uXwOQGfmx-1Zw-KHRoM0O)  
**기존 기획 문서:** [모바일 리뉴얼 상세 비교·수정 기획](https://docs.google.com/document/d/1VHPhkLcoKXr0zURObi1Ds7lVn-caChGlQ-juNTgN4yw/edit)  
**UI-R00 자료 폴더:** [Drive 기준선](https://drive.google.com/drive/folders/1P8b1tlnqYYDFew5x9y2hDZLEjKDWd2zj)

> **증거 한계:** 5종 기존 PNG는 `10f237bf` 커밋의 개발용 샘플로 촬영됐으며, 현재 `main`은 방명록 UI-09 개선이 병합된 `87df7524`이다. **이전 PNG를 최신 `main` 실화면으로 부르지 않는다.** AI 생성 시안 역시 실제 동작/실제 고객 정보를 증명하지 않는다. 이 PR의 별도 UI-R00 캡처 workflow 결과가 성공하면 최신 소스 기준 5종 캡처를 후속 기준 이미지로 고정한다.

## 1. 디자인 5종 표본 및 변경 계약

| 디자인 키 | 기존 390px 전체 화면 | 새 시안(9:16) | 유지할 요소 | 우선 수정 | 절대 도입하지 않을 요소 |
| --- | --- | --- | --- | --- | --- |
| `simple` 기본형 | [원본](https://drive.google.com/file/d/1LYujIz1PgvaE32IENJlPR8lqzi2Qe4w7/view) · 780×8068 | SHA256 `78f4d99f6f4f` | 아이보리·차콜, 고객 사진·초점, 단일 슬라이더, 기본 접힘, 간단한 감사 문구 | 사진·이름·날짜의 시각적 그룹화, 3개 아이콘형 바로가기, 날짜·시간·장소 카드 정렬, 연락처 화살표 간격 | 다수 꽃 장식, 계좌 자동 펼침, 가짜 알림 받기 |
| `classic-r` 모던형 | [원본](https://drive.google.com/file/d/19x1Nd7aSHMQekROppYb8qxmJBafLdhHa/view) · 780×8696 | SHA256 `b3d14974b8f6` | 화이트·블랙 대비, 섹션 번호, 검정 예식 안내 패널, 와이드 슬라이더, 번호형 방명록 | 표지 이미지 위 텍스트 가독성, 영문·한글 타이포그리드, 바로가기, 날짜 대형 정보 카드, 직선형 컨트롤 | 기존 사용자 textPosition 덮어쓰기, 과한 블랙 패널, 장식용 인물 사진 대체 |
| `romantic` 포토형 | [원본](https://drive.google.com/file/d/1A_-mfXtPzO9tgdfizJ1GrQvn2mhs_wcr/view) · 780×8528 | SHA256 `26f77f59ce2b` | 사진 위 이름, 웜베이지, 메인·보조 사진, 페이드 전환, 명조 방명록, 기존 마무리 사진 | 사진 위 날짜 대비, 갤러리 화살표·페이지 번호, 320px 보조 사진 크기, 예식 카드 간격 | 폴라로이드 다중 레이어·그림자, 임의 사진/봉투 삽입, 내용 2~3건 고정 |
| `gyeol` 클래식형 | [원본](https://drive.google.com/file/d/1xFZuThKwtkDkVayMJ4QJGvHgXr2BrWwG/view) · 780×9540 | SHA256 `e6bff6bca989` | 크림·샴페인 톤, 명조, 이중 프레임, 메인+보조 사진, 편지 문구, 종이형 마무리 | 사진 하단과 한 개의 프레임 연결, 이름·날짜 정보 계층, 프레임 굵기·여백 통일, 작은 화면 날짜 배치 | 큰 밀랍 도장·3D, 모든 카드 이중 테두리, 실제 개인정보 공개 변경 |
| `emotional` 내추럴형 | [원본](https://drive.google.com/file/d/1I6Jb_XAonBuoiTf17nE_CnrRgAUMNmP8/view) · 780×8912 | SHA256 `7325126ff932` | 세이지·올리브, 왼쪽 정렬 표지, 기존 garden-sprig 자산, 옆 사진 보이는 슬라이더, 세이지 방명록 | 인사·이름·날짜 간격, 3개 세이지 아이콘 바로가기, 날짜 중심 예식 카드, 계좌·교통 패널 정렬 | 모든 섹션에 잎사귀, 중앙정렬 강제, 고정 D-108 숫자 |

**체크섬:** 원본 PNG 및 최신 9:16 시안 SHA-256은 아래 2절에 모두 기록한다. 코드에서 시안의 임의 이름·주소·날짜·계좌·댓글을 그대로 사용하지 않는다.

## 2. 이미지 해시 및 캡처 출처

| 테마 | 이전 실화면 SHA-256 (780px 너비) | 생성 참고 이미지 SHA-256 (941×1672) |
| --- | --- | --- |
| `simple` | `2a804859596c492df50ac704234f7beec90260d3afcc32eb353940b8a1b73181` | `78f4d99f6f4fc1d68b4934964bddd365cee69a6bd06c27b2ec99aa26a74bf801` |
| `classic-r` | `868d85e2dc170287ea3f872f813def36210df6264f79ae3583774f4018595eda` | `b3d14974b8f6a1588e1abab6667e642478e7bf9c1e0d3c18c67a5eff6ec63143` |
| `romantic` | `9186f3a9d7289eef5f7f4ff95a1cc6272e7350727d27b5b823f4bf02ad5cc731` | `26f77f59ce2b14afe4ba362679514f87c5861b23d727bce46ad7008dc6273449` |
| `gyeol` | `b925b8281627bc9d735bf5ab97b250d41f06ccc833c501cc3dec3850dd9bff95` | `e6bff6bca989ad1bda467ce287a81721cf6e708004f9325e19d630c3bd3ae525` |
| `emotional` | `b926556b785e000f424af6c8e986ab5a0275d2c0d3b88f63a4091dae8e8338e5` | `7325126ff9322d7a16ef92152d9da6fd0bbdb18ada36cfc7b30b46157a0a4891` |

이전 캡처의 정확한 원본 ZIP 위치는 Drive의 `Invitation_5종_모바일전체화면_QA원본.zip`이며, QA manifest는 `task: UI-07-A-07`, `source: isolated Next.js development-only qaUI07 fixture`, `no_actual_customer_data: true`, `production_data_writes: 0`를 명시한다.

## 3. 현재 코드 기준 컴포넌트 및 DOM 계약

- `WeddingBase.tsx`: 공개 모바일 청첩장 공통 컨테이너 `main[data-design]`. `data-wedding-section`: `invitation → contact → gallery → ceremony → schedule → transport → gift → guestbook` (조건부 섹션은 데이터·설정에 따라 생략). 퀵 링크는 실제 `#wedding-info`, `#wedding-location`, `#wedding-gallery` 등의 연결 대상으로 이동한다.
- `WeddingCover.tsx`/`WeddingCover.module.css`: 테마별 표지 레이아웃. 고객 대표 사진·사진 초점(`focusX`, `focusY`)·표지 텍스트 위치 설정을 우선한다.
- `WeddingGallery.tsx`, `WeddingGallerySwiper.tsx`/CSS: 다섯 테마 모두 슬라이드 구성, 원본/프리뷰 연결, 이미지 확대, 키보드/터치 기능. 초점·순서 변경이나 사진 삭제를 금지한다.
- `WeddingBase.module.css`: 5종 색상 팔레트와 디자인별 섹션 여백이 다중 선언돼 있음. UI-R01에서 적용 우선순위를 통합하되 다른 테마 및 제작·관리 UI에 영향을 주지 않게 한다.
- `GiftInfoThemed.tsx`: 접힘 상태 기본, 선택 시에만 실제 고객 계좌·복사 동작 노출.
- `GuestbookThemed.tsx`: 작성·조회, 새로고침, cursor pagination, 작성자·날짜·본문 카드 구조 유지. 운영 Firebase에 QA 댓글 작성 금지.
- `WeddingClosing.tsx`/CSS: 현재 5종 마무리 분기 구조 유지. 새 장식물은 과하지 않게 제한.
- `WeddingIntro.tsx`/CSS: 3종 인트로 모드, 건너뛰기, 재노출 정책, 배경음악, `prefers-reduced-motion` 준수.

## 4. 디자인 시스템 범위와 기본 수치

- 기본 검토 폭 390 CSS px. 반응형 폭 320/360/390/430/768/1440 CSS px 및 200% 텍스트 확대. 전체 페이지 캡처와 초기/접힘/펼침/빈·오류·로딩 상태를 분리.
- 기본 양쪽 여백 16~24px에서 검토. 실제 테마별 CSS를 우선하되 터치 대상은 최소 44×44 CSS px, 주요 CTA는 48px 이상.
- 일반 본문 가독성 15~16px를 기준으로 예식 정보·축하 메시지를 실제 모바일에서 읽을 수 있는 크기로 유지. 색상 대비는 WCAG AA 일반 텍스트 4.5:1 이상.
- 라이트·다크 앱 설정과 무관하게 공개 청첩장 테마별 색상 팔레트 일관성 유지. 장식성 녹색은 `emotional`에서만 허용(성공/오류 상태색 예외).
- 시안의 라운드·그림자·꽃 장식은 **그림 그대로 복제하지 않음**. 카드 배경·정렬·타이포를 우선하고 불필요한 장식 제거.

## 5. 구현 순서 및 완료 게이트

1. **UI-R00:** 현재 소스 SHA·이전 5종 PNG·시안 5종 SHA256·유지/수정/제외·QA 시나리오를 고정. 독립 CI가 현재 main 기반의 5종 전체 PNG와 manifest를 생성하고, 5종 품질 검사를 통과하면 실화면 최신 근거 확보 완료.
2. **UI-R01:** 공통 간격·타이포·버튼·아코디언·테마별 토큰 정리. 기존 컴포넌트 구조와 고객 데이터가 바뀌지 않았음을 테스트.
3. **UI-R02~06:** 기본형→모던형→포토형→클래식형→내추럴형 순서로 각 테마의 표지부터 마무리까지 한 디자인씩 완료.
4. **UI-R07:** 인트로 3모드×5테마, 마지막 화면, BGM·모션 설정 합치기.
5. **UI-R08:** 5종×반응형·접근성·사진 0/1/다장·교통/지도/계좌/방명록 상태 QA, Android 및 가능한 실제 기기 점검.
6. **UI-R09:** 독립 PR의 CI·시각 캡처 확인 후 순차 병합. main CI 성공과 Firebase App Hosting Rollout 성공을 확인하고 실제 공개 URL 표시까지 별도 확인.

## 6. 안전·제외 계약

- `src/app/_components`의 제작/관리 화면, Firestore/Storage 데이터, 결제/계정/권한, 앱 스토어/Play 및 고객 URL을 변경하지 않는다.
- `vow` 등의 범위 외 테마를 바꾸지 않는다. 다섯 공개 디자인 키와 팔레트 명세를 유지한다.
- 고객의 이름/날짜/장소/전화번호/계좌/사진/댓글은 원본을 보존하고, 생성 이미지의 예시 내용을 운영 데이터에 적용하지 않는다.
- 캡처는 `NEXT_PUBLIC_USE_FIREBASE=false`의 격리된 개발용 샘플에서 수행하며 운영 서비스에 실제 댓글/전화/결제/계좌 동작을 실행하지 않는다.
- 마지막 프레임에 휴대전화 상태바·노치 등 그림 속 프레임을 웹 UI로 구현하지 않는다. 생성 시안의 9:16 높이만을 CSS 고정 페이지 높이로 사용하지 않는다.
- **UI-R00 PR은 기준 문서와 QA workflow만 추가한다.** UI 구현 수정, `main` 병합 및 Firebase 재배포는 이 단계에서 하지 않는다.

## 7. CI에서 확보해야 할 최신 캡처

- workflow: `.github/workflows/invitation-ui-r00-baseline-qa.yml`
- 명령: `npx tsx scripts/test-wedding-ui07-a07.mts` → `python scripts/qa-invitation-ui07-a07.py`
- 산출물: `artifacts/ui-07-a07/manifest.json` 및 디자인별 `simple-390-full-full.png`, `classic-r-390-full-full.png`, `romantic-390-full-full.png`, `gyeol-390-full-full.png`, `emotional-390-full-full.png` (이외 모바일·태블릿·PC 샷 포함).
- **최신 캡처 생성 성공 여부는 GitHub Actions의 실제 성공 결과를 확인한 뒤 판정**한다. GitHub Actions의 CI 통과는 실제 고객 운영 URL 접속 검증의 대체가 아니다.
