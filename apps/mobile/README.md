# Mobile Invitation App

기존 Next.js 웹 서비스와 분리된 Expo 모바일 앱입니다.

## 목적
- 기존 공개 웹 청첩장 서비스는 유지합니다.
- 모바일 앱은 `홈 / 가이드 / 제작 / 운영 / 설정` 5개 탭 구조로 구성합니다.
- 페이지 URL 또는 슬러그 + 비밀번호 로그인, 자동 로그인, 운영 관리 흐름을 우선 연결합니다.

## 시작 방법
1. 루트에서 `npm --prefix apps/mobile install`
2. 루트에서 `npm run mb:start`
3. Android 에뮬레이터는 `npm run mb:android`
4. 웹 미리보기는 `npm run mb:web`

## 환경 변수
- `EXPO_PUBLIC_API_BASE`: 모바일 앱이 호출할 API Base URL
- 값을 지정하지 않으면 Expo 설정에서 `https://msgnote.kr`를 기본값으로 사용합니다.

## 현재 포함한 기능
- Expo Router 기반 하단 탭 앱 구조
- 페이지 URL 또는 슬러그 + 비밀번호 모바일 로그인
- SecureStore 기반 자동 로그인 복원
- 서비스/디자인/티켓 견적 계산과 제작 초안 저장
- 신랑/신부 한글·영문 이름 검증 후 URL 슬러그 자동 생성
- 결제 확인 팝업 후 모바일 청첩장 자동 생성
- 생성 직후 운영 탭 온보딩 슬라이드 입력
- 로그인된 페이지의 공개 상태 변경
- 핵심 문구 저장
- 방명록 댓글 조회 및 삭제
- 라이트/다크 모드, 글자 크기, API 주소 설정

## 아직 남은 항목
- 실제 결제 연동
- 이미지 업로드 및 갤러리 편집
- 음악 트랙 상세 선택
- QR 코드 생성
- 앱 아이콘, 스플래시, 배포 설정

## 참고
- Expo Router 문서: https://docs.expo.dev/router/installation/
- Expo SecureStore 및 스토리지 패턴: https://docs.expo.dev/router/reference/authentication

## 검증
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run typecheck`
