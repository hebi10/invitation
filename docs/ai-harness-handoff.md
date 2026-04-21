### Commit 메시지
- `Collapse ticket-only purchase section in mobile create flow`

### 작업 요약
- 모바일 구매 탭의 `티켓만 구매` 섹션을 기본 접힘으로 바꾸고, 토글 클릭 시 부드럽게 펼쳐지도록 `Animated` 기반 열림/닫힘 동작을 추가했다.
- 접힌 상태에서는 본문을 트리에서 내려 웹/앱에서 불필요한 포커스 이동이 생기지 않도록 정리했다.
- 구매 탭 스타일 파일에 토글 행 스타일을 추가했고, 누락돼 있던 `stickyBarCompact` 키도 복원해 `typecheck`가 다시 통과하도록 맞췄다.
- 이전 작업으로 Expo 웹 파비콘 입력을 `icon.png`로 교체했고, 웹 미리보기 오프라인 배너는 브라우저 `online/offline` 기준만 사용하도록 완화했다.

### 남은 작업
1. 실제 UI 확인
   - `npm run mb:web` 또는 네이티브 앱에서 구매 탭을 열고 `티켓만 구매` 카드가 접힌 상태로 시작하는지, 열고 닫을 때 높이 애니메이션이 자연스러운지 확인이 필요하다.
2. Expo 웹 export 이슈
   - `npm --prefix apps/mobile exec expo export --platform web`와 `expo config --type public`은 현재 monorepo 경로 해석 중 `web/package.json`, `public/package.json`을 찾으며 실패한다.
3. 모바일 결제 릴리스 준비
   - Google Play/RevenueCat 권한, 상품 매핑, 실제 결제 검증 작업은 계속 남아 있다.
