### commit message
- fix: 모바일 이미지 조작 패키지 추가

### 해결한 문제
- Expo 앱에 Android HTTPS intent filter와 iOS associated domains를 추가해 `https://msgnote.kr/app`, `https://msgnote.kr/mobile` 앱 링크를 받을 수 있게 했습니다.
- 모바일 이미지 업로드는 선택 품질을 낮추고, 서버 제한 초과 이미지를 사전 차단하며, `expo-image-manipulator`가 런타임에 있으면 긴 변 2400px 기준으로 최적화합니다.
- `npx expo install expo-image-manipulator`를 실행해 `apps/mobile` 의존성과 lockfile에 `expo-image-manipulator ~55.0.15`를 추가했습니다.

### 최근 변경 유지 항목
- 결제 기능은 이번 작업 범위에서 제외했고 기존 흐름을 건드리지 않았습니다.
- SecureStore 기반 owner/customer session 복구 흐름은 기존 구조를 유지했습니다.
- 고객 소유자의 방명록 관리 권한 유지 정책도 변경하지 않았습니다.

### 검증 명령과 결과
- `npm run typecheck:mobile` 통과
- `npm run lint:mobile` 통과

### 남은 리스크
- HTTPS 앱 링크는 앱 설정 외에 `assetlinks.json`, `apple-app-site-association` 도메인 배포 후 실기기에서 확인해야 합니다.
- iPhone/Android 원본 사진 업로드와 카카오/브라우저 앱 링크 전환은 실기기 QA가 필요합니다.
### commit message
- chore: 보안 하드닝 기본 조치 적용

### 해결한 문제
- `.gitignore`에 `.gstack/`을 추가해 로컬 보안 점검 보고서가 실수로 커밋되지 않도록 했습니다.
- `next.config.ts`에 기본 보안 헤더(`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`)를 추가했습니다.
- API 라우트의 500 응답에서 내부 `error.message`가 노출되지 않도록 공통 안전 응답 헬퍼와 보안 하드닝 회귀 테스트를 추가했습니다.

### 최근 변경 유지 항목
- 인증/권한/입력 검증처럼 사용자가 알아야 하는 400/401/403 계열 메시지는 기존 흐름을 유지했습니다.
- 고위험 모바일 편집 감사 로그에는 내부 원인 추적용 reason만 남기고, 클라이언트 500 응답은 일반 메시지로 통일했습니다.
- CSP는 카카오/Firebase/이미지 외부 리소스 영향이 있어 이번 범위에서 제외했습니다.

### 검증 명령과 결과
- `npm run test:security-hardening` 통과
- `npm run typecheck:web` 통과
- `npm run lint:web` 통과

### 남은 리스크
- Firebase/App Hosting Secret Manager, IAM, GitHub branch protection은 운영 콘솔에서 별도 확인이 필요합니다.
- CSP는 별도 브랜치에서 리소스 허용 목록을 확인하며 단계적으로 적용해야 합니다.
