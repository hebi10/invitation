### commit message
- fix: App Hosting npm ci lockfile 동기화

### 해결한 문제
- App Hosting 빌드의 `npm ci`가 `sharp` 선택 패키지 누락으로 실패하던 문제를 수정했습니다.
- `sharp@^0.34.3`를 명시 의존성으로 추가하고, `package-lock.json`에 `@img/sharp-*` 및 `@img/sharp-libvips-*` 플랫폼 패키지 22개가 모두 기록되도록 동기화했습니다.
- 로컬에서 깨졌던 `node_modules`는 갱신된 lockfile 기준 `npm ci`로 복구했습니다.

### 최근 변경 유지 항목
- Expo 모바일 가격 정책은 STANDARD 5,000원, DELUXE 10,000원, PREMIUM 15,000원 기준입니다.
- 추가 티켓은 할인 없이 1장당 1,000원 기준이며, 모바일 화면과 결제 확인 문구도 이 기준을 따릅니다.

### 검증 명령과 결과
- `npm ci --dry-run --no-audit --no-fund --offline=false --cache .\.npm-cache` 통과
- `npm ci --ignore-scripts --no-audit --no-fund --offline=false --cache .\.npm-cache` 통과
- `npm run typecheck:web` 통과
- `git diff --check` 통과, 기존 모바일 파일 CRLF/LF 경고만 표시

### 남은 리스크
- App Hosting 실제 배포에서 Next 15.4.8 보안 업데이트 경고가 표시될 수 있어 추후 Next 패치 버전 업그레이드가 필요합니다.
- RevenueCat/Google Play Console의 실제 상품 가격은 코드와 별도로 콘솔에서 5,000원/10,000원/15,000원/1,000원 기준으로 맞춰야 합니다.
