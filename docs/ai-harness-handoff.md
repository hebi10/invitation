### Commit 메시지
- 최종 commit 메시지: `Update 모바일 운영 이미지 업로드 정리 흐름 보강`

### 작업 요약
1. 모바일 업로드 경로를 `FormData + uri` 우선으로 재구성
   - 내용: `apps/mobile/src/features/manage/hooks/useImageUpload.ts`에서 picker 기본 옵션의 `base64: true`를 제거하고 multipart 업로드를 1순위로 사용하도록 바꿨다.
   - 내용: multipart 업로드가 `Network request failed` 같은 전송 계열 오류로 실패하거나 `uri`를 사용할 수 없을 때만 `expo-file-system/legacy`로 base64를 읽어 JSON 업로드 fallback을 사용하도록 정리했다.

2. 임시 업로드 추적과 orphan 정리 흐름 추가
   - 내용: `apps/mobile/src/features/manage/hooks/useImageUpload.ts`에 업로드 성공 파일의 `path`, `thumbnailPath`, `url`, `uploadSessionId`를 추적하는 로직을 추가했다.
   - 내용: 업로드 중간 실패 시 이미 올라간 파일을 즉시 cleanup API로 정리하고, 정리 실패분은 추적 목록에 남겨 이후 저장/닫기 시점에 다시 정리하도록 구성했다.
   - 내용: `apps/mobile/src/features/screens/manage.tsx`에서 편집 모달 저장 시 유지되지 않은 업로드만 정리하고, 저장 없이 닫을 때는 추적된 임시 업로드를 모두 정리하도록 연결했다.
   - 내용: 업로드 진행 중에는 편집 모달 저장/닫기 버튼을 막아 중간 상태에서 충돌하지 않도록 했다.

3. 서버 이미지 cleanup API와 업로드 메타데이터 보강
   - 내용: `apps/mobile/src/lib/api.ts`에 `deleteMobileInvitationImages()`와 cleanup 오류 메시지 매핑을 추가했다.
   - 내용: `src/app/api/mobile/client-editor/pages/[slug]/images/route.ts`에서 `uploadSessionId`를 업로드 요청으로 받아 Storage 메타데이터에 `pageSlug`, `assetKind`, `uploadSessionId`, `uploadedAt`을 기록하도록 확장했다.
   - 내용: 같은 라우트에 인증된 현재 페이지 경로만 삭제할 수 있는 `DELETE` cleanup API를 추가했다.

4. 이미지 라이브러리 권한 UX 단순화
   - 내용: `apps/mobile/src/features/manage/hooks/useImageUpload.ts`에서 picker 진입 전 선권한 요청을 제거하고, 우선 picker를 연 뒤 실패했을 때만 권한 상태를 확인해 재요청하도록 바꿨다.
   - 내용: `limited`, `denied`, `canAskAgain: false` 상태에 맞는 안내 문구를 분기해 notice로 보여주도록 정리했다.

5. 편집 모달 닫기 버튼 상태 제어 보강
   - 내용: `apps/mobile/src/components/manage/InvitationEditorModalShell.tsx`에 닫기 버튼의 `disabled`, `loading` 제어 prop을 추가했다.
   - 내용: 저장/정리 중에는 모달 닫기 버튼도 동일한 busy 상태를 따르도록 맞췄다.

6. 검증
   - 내용: `npm --prefix apps/mobile run typecheck`를 통과했다.
   - 내용: `npm --prefix apps/mobile run lint`를 통과했다.
   - 내용: 루트에서 `npm run lint`를 통과했다.
   - 내용: 루트에서 `npx tsc --noEmit`를 통과했다.

### 남은 작업
1. 실기기 대표 이미지 업로드 재확인
   - 현재 상태: 모바일 업로드는 `FormData + uri`를 우선 사용하고, 전송 계열 실패 시에만 base64 fallback으로 내려가도록 바뀌었다.
   - 남은 이유: 현재 환경에서는 실제 기기에서 대표 이미지 업로드 버튼을 눌러 Blob 오류, `Network request failed`, 업로드 직후 미리보기 노출까지 직접 확인할 수 없었다.
   - 다음 작업 권장: 실기기에서 대표 이미지 업로드 후 오류가 사라졌는지와 업로드 직후 로컬 미리보기가 바로 보이는지 확인한다.

2. 실기기 갤러리 업로드와 cleanup 시나리오 확인
   - 현재 상태: 갤러리도 같은 업로드 경로와 같은 cleanup 추적 로직을 사용한다.
   - 남은 이유: 다중 선택 업로드, 중간 실패, 저장 없이 닫기, 저장 성공 후 stale 이미지 정리까지는 실기기에서 아직 검증하지 못했다.
   - 다음 작업 권장: 갤러리 이미지를 1장 이상 올려 정상 업로드를 확인하고, 다중 업로드 중 실패 케이스와 저장 없이 닫는 케이스에서 Storage orphan이 남지 않는지 확인한다.

3. 실기기 원본 포맷 보존 확인
   - 현재 상태: MIME은 asset의 원본 `mimeType`을 우선 사용하고, base64 fallback도 multipart 실패 시에만 제한적으로 사용한다.
   - 남은 이유: PNG 투명 배경, WEBP, JPEG 각각이 실제 기기와 서버 경로에서 원본대로 유지되는지는 아직 확인하지 못했다.
   - 다음 작업 권장: PNG, WEBP, JPEG를 각각 업로드해 서버 `contentType`, 썸네일 결과, 투명도 보존 여부를 확인한다.

4. 실기기 권한 시나리오 확인
   - 현재 상태: picker 선실행 후 실패 시점에만 권한 복구를 시도하도록 바뀌었고, 권한 안내 문구도 정리됐다.
   - 남은 이유: `limited`, `denied`, `canAskAgain: false` 시나리오는 기기 설정 상태에 따라 실제 동선이 달라 실기기 확인이 필요하다.
   - 다음 작업 권장: 권한 허용, 제한 허용, 거부, 설정 이동 필요 4개 케이스에서 notice 문구와 재시도 흐름이 의도대로 동작하는지 확인한다.
