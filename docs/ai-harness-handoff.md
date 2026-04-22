### Commit 메시지
- `Add one-time mobile link token flow`

### 작업 요약
- 7단계 1회용 앱 연동 링크를 반영했다. `src/server/mobileClientEditorLinkToken.ts`에 Firestore 저장 모델, tokenHash 기반 발급/교환/폐기, 15분 TTL, 1회 사용, 비밀번호 버전 무효화 규칙을 추가했다.
- 모바일 API는 `src/app/api/mobile/client-editor/link-tokens/route.ts`, `link-tokens/exchange/route.ts`를 추가했고, 로그인/세션 응답은 `src/server/clientEditorMobileApi.ts`의 snapshot helper로 통일했다.
- Expo 앱은 `apps/mobile/src/lib/appDeepLink.ts`, `app/login.tsx`, `contexts/AuthContext.tsx`, `features/screens/manage.tsx`, `lib/api.ts`를 업데이트해 딥링크 자동 연동, 앱 연동 링크 복사, 활성 링크 폐기 흐름을 연결했다. 웹 fallback은 `src/app/app/login/page.tsx`에서 앱 열기를 시도한다.

### 확인 사항
- 실행: `npm run typecheck`
- 실행: `npm run lint:web`
- 실행: `npm --prefix apps/mobile run lint`
- 문서 갱신: `docs/mobile-client-editor-policy.md`를 7단계 기준으로 다시 작성했다.

### 남은 작업
1. 링크 운영 UX 보강
   - 운영 화면에 최근 발급 상태나 마지막 사용 시간까지 보여주고 싶으면 별도 조회 API와 카드 UI를 추가하면 된다.
2. 앱 미설치 fallback 확장
   - `src/app/app/login/page.tsx`에 스토어 이동, 설치 안내, 실패 케이스 분기를 더 넣을 수 있다.
3. 미구현 고위험 API 연결
   - 비밀번호 변경, 청첩장 삭제, 방명록 전체 삭제 API가 추가되면 현재 high-risk helper와 audit log를 그대로 재사용하면 된다.
