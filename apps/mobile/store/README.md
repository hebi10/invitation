# Play 스토어 등록 자료

- 앱: 프리미엄 모바일 청첩장 제작 / kr.msgnote.mobileinvitation
- 기본 언어: 한국어(ko-KR)
- title.txt, short-description.txt, full-description.txt: 스토어 등록 문구
- icon.png: 512×512 RGBA PNG, 생성 아이콘
- feature-graphic.png: 1024×500 RGB PNG, 생성 소개 이미지
- ../assets/icon-v2.png: 같은 디자인의 앱 런처용 1024×1024 PNG
- image-generation-prompts.txt: 기본 이미지 생성 기능에 사용한 프롬프트

아이콘·소개 이미지는 기존 봉투·하트 모티브를 유지해 생성했으며 크기·PNG 포맷만 변환했다. 스크린샷은 Android 화면 캡처 workflow의 실제 앱 PNG를 비율 유지 배치해 1080×1920으로 준비한다. 예시 청첩장에는 가상 이름을 사용하며 실제 저장·계정·결제를 호출하지 않는다.

새 스크린샷은 모바일 리뉴얼 버전에 해당한다. 스토어 등록정보의 저장과 앱 바이너리 출시를 구분하고, 같은 UI의 버전과 함께 공개한다. 확인하지 않은 무료·무제한·광고 없음, 운영 결제 검증 완료, QR 지원은 문구에 포함하지 않는다.


## 2026-11-09 평면형 디자인 배포 경로

- `scripts/build-store-rebrand.py --icon-only`: 1024px Android 앱 설치 아이콘과 512px Play 대표 아이콘을 동일한 평면형 봉투 심벌로 재현합니다. 실제 AAB 빌드와 Play 아이콘 동기화에서 실행합니다.
- `scripts/build-store-rebrand.py --screenshots-only`: 기존 SHA-256으로 검증된 실제 앱 및 공개 청첩장 캡처 8장을 원본으로 사용해 새로운 절제된 에디토리얼 레이아웃을 만듭니다. 이미지 생성 AI로 만든 가상 앱 화면은 포함하지 않습니다.
- 두 번째 이미지 '웨딩 디자인 살펴보기'의 샘플 이름은 `신민제 · 김현지`입니다. 결제·통계·운영 고객 기록은 변경하지 않습니다.
- 출력된 PNG와 manifest.json은 GitHub Actions의 실행별 Artifact에 보존하고 검증 후 Google Play ko-KR 목록에만 업로드합니다.
- 스토어 등록정보 이미지 변경과 Android 실행 파일 변경은 별개이며, 앱 설치 아이콘 변경은 서명된 AAB의 새 테스트 릴리스를 요구합니다.
