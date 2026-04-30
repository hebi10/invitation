### commit message
- fix: 모바일 앱 링크와 업로드 UX 안정화

### 해결한 문제
- Expo 앱에 Android HTTPS intent filter와 iOS associated domains를 추가해 `https://msgnote.kr/app`, `https://msgnote.kr/mobile` 앱 링크를 받을 수 있게 했습니다.
- 모바일 이미지 업로드는 선택 품질을 낮추고, 서버 제한 초과 이미지를 사전 차단하며, `expo-image-manipulator`가 런타임에 있으면 긴 변 2400px 기준으로 최적화합니다.
- 로그인 `next` 경로 allowlist, TextField 접근성 라벨, toast/오프라인 배너 스크린리더 공지를 추가했습니다.

### 최근 변경 유지 항목
- 결제 기능은 이번 작업 범위에서 제외했고 기존 흐름을 건드리지 않았습니다.
- SecureStore 기반 owner/customer session 복구 흐름은 기존 구조를 유지했습니다.
- 고객 소유자의 방명록 관리 권한 유지 정책도 변경하지 않았습니다.

### 검증 명령과 결과
- `npm run typecheck:mobile` 통과
- `npm run lint:mobile` 통과

### 남은 리스크
- 현재 환경은 npm registry 접근이 제한되어 `expo-image-manipulator` 설치/lockfile 갱신을 수행하지 못했습니다. 패키지를 설치하면 런타임 리사이즈 경로가 활성화됩니다.
- HTTPS 앱 링크는 앱 설정 외에 `assetlinks.json`, `apple-app-site-association` 도메인 배포 후 실기기에서 확인해야 합니다.
- iPhone/Android 원본 사진 업로드와 카카오/브라우저 앱 링크 전환은 실기기 QA가 필요합니다.
