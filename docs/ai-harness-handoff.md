### Commit 메시지
- 작업 종료 시 기준으로 갱신한다. 가능하면 50자를 넘지 않는다.
- 형식: 기존 저장소 commit 패턴을 우선 따른다.
- 예시: `Update 모바일 티켓 구매 흐름 주석 정리와 운영 카드 스타일 정리`
- 최종 commit 메시지: `Fix 운영 탭 전환 가능 청첩장 노출 조건 정리`

### 작업 요약 (최대 10개)
1. 구매 탭 디자인 미리보기 제거
   - 내용: `apps/mobile/src/app/(tabs)/create.tsx`에서 선택된 디자인 아래 보이던 폰 프레임 프리뷰를 제거했다.
   - 내용: `apps/mobile/src/features/create/components/ThemePreviewPhone.tsx` 파일도 함께 삭제해 더 이상 프리뷰 컴포넌트가 렌더에 끼어들지 않도록 정리했다.

2. 가이드 샘플 링크를 서비스/디자인 선택과 연결
   - 내용: `apps/mobile/src/constants/content.ts`의 `guideSamplePages`에 `themeKey`, `tier` 메타데이터를 추가해 서비스 등급과 디자인 키로 샘플 URL을 찾을 수 있게 만들었다.
   - 내용: 같은 파일에 `findGuideSamplePageUrl()` 헬퍼를 추가해 구매 탭과 가이드 탭이 같은 URL 소스를 공유하도록 정리했다.

3. 구매 탭 선택 카드에 샘플 링크 UI 추가
   - 내용: `apps/mobile/src/app/(tabs)/create.tsx`에서 현재 선택한 서비스와 디자인 조합에 맞는 샘플 URL을 계산해 카드 안에 표시하도록 바꿨다.
   - 내용: `샘플 링크 열기` 버튼을 추가하고, 가이드 탭과 동일하게 인앱 브라우저 우선 후 기본 브라우저로 폴백하는 방식으로 열도록 구현했다.

4. 프리뷰 전용 스타일 정리
   - 내용: `apps/mobile/src/features/create/createStyles.ts`에서 더 이상 쓰지 않는 `themePreviewFrame` 스타일을 제거했다.
   - 내용: 대신 링크 표시용 `sampleLinkBox`, `sampleLinkText`, `sampleLinkButton` 스타일을 추가해 링크 영역을 간결하게 정리했다.

5. 구매 상단 상태 hero 카드 제거 유지
   - 내용: `apps/mobile/src/app/(tabs)/create.tsx`에서 `모바일 청첩장 생성 상태` `SectionCard`는 제거된 상태를 유지했다.
   - 내용: 함께 쓰이던 `FLOW_GUIDE_ITEMS` 상수와 hero 전용 스타일도 제거된 상태를 유지했다.

6. 모바일 구매 화면 검증 수행
   - 내용: `apps/mobile`에서 `npm run typecheck`, `npm run lint`를 실행해 변경 후 타입/린트 오류가 없는지 확인했다.

7. 샘플 페이지 cover 이미지 URL 우선순위 보정
   - 내용: `src/app/_components/weddingPageState.tsx`에서 Firebase Storage 관리 이미지인 경우, 설정 파일에 박힌 다운로드 URL보다 `getPageImages()`로 다시 읽어온 최신 다운로드 URL을 우선 사용하도록 수정했다.
   - 내용: cover와 gallery가 모두 같은 규칙을 따르도록 맞췄고, Storage 관리 이미지를 다시 읽는 동안에는 `imagesLoading`도 유지해 앱 내 브라우저에서 깨진 이미지가 먼저 보이지 않도록 정리했다.

8. 운영 탭 청첩장 전환 가능 조건 정리
   - 내용: `apps/mobile/src/lib/linkedInvitationCards.ts`에 `canActivateLinkedInvitationCard()` 헬퍼를 추가해, 저장 세션이 있고 `expiresAt`이 아직 남아 있는 카드만 전환 가능 카드로 보도록 기준을 만들었다.
   - 내용: `apps/mobile/src/features/manage/hooks/useLinkedInvitationManager.ts`에서 추가 연동 카드 목록을 이 조건으로 필터링해 세션 만료 등으로 전환 불가능한 청첩장은 운영 탭에 노출되지 않도록 정리했다.

### 남은 작업 (최대 10개)
1. 단계 탭과 하단 CTA 실기기 확인
   - 현재 상태: 단계 탭, 하단 CTA, 좁은 폭 대응, 긴 금액 축소 처리까지 코드 반영과 타입/린트 검증을 마쳤다.
   - 남은 이유: 현재 환경에서는 Expo 앱을 실기기나 에뮬레이터로 직접 띄워 탭 바 간격, 홈 인디케이터 간섭, 버튼 균형을 확인하지 못했다.
   - 다음 작업 권장: iOS/Android 실기기 또는 에뮬레이터에서 구매 화면을 열어 단계 탭 줄바꿈, CTA 버튼 폭, 긴 금액 표시를 확인한다.

2. 샘플 링크 문구/배치 미세 조정
   - 현재 상태: 선택 카드 안에 URL 텍스트와 `샘플 링크 열기` 버튼이 들어가고, 선택한 서비스/디자인 조합에 따라 링크가 바뀐다.
   - 남은 이유: 실제 기기 폭에 따라 URL 두 줄 노출이나 버튼 위치가 조금 답답하게 보일 수 있다.
   - 다음 작업 권장: 실기기에서 카드 높이를 보고 URL 줄 수나 버튼 폭을 한 번 더 조정한다.

3. 샘플 페이지 실브라우저 재확인
   - 현재 상태: cover 이미지 경로 우선순위는 보정했고, 루트 기준 `eslint .`, `npx tsc --noEmit` 검증까지 마쳤다.
   - 남은 이유: 현재 환경에서는 Expo 인앱 브라우저와 외부 모바일 브라우저에서 실제 샘플 링크를 직접 열어 재현 여부를 다시 확인하지 못했다.
   - 다음 작업 권장: 앱에서 `샘플 링크 열기`로 감성/심플 샘플을 각각 열어 cover 이미지가 정상 노출되는지 확인한다.

4. 운영 탭 전환 카드 실기기 확인
   - 현재 상태: 세션이 없거나 만료된 추가 연동 카드는 목록에서 숨기도록 코드 반영과 타입/린트 검증을 마쳤다.
   - 남은 이유: 현재 환경에서는 실제 만료된 저장 세션을 가진 기기 상태에서 운영 탭 UI를 직접 확인하지 못했다.
   - 다음 작업 권장: 세션 만료 후 운영 탭을 열어 `청첩장 전환하기` 카드가 사라지는지, 대신 `다른 청첩장 연동하기`만 남는지 확인한다.
