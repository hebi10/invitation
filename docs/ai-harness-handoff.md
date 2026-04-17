### Commit 메시지
- 최종 commit 메시지: `Update 모바일 운영 이미지 업로드 경로 안정화`

### 작업 요약
1. 모바일 이미지 업로드 경로 재구성
   - 내용: `apps/mobile/src/features/manage/hooks/useImageUpload.ts`에서 `Blob([Uint8Array])` 생성 로직을 제거했다.
   - 내용: 이미지 선택 시 `base64: true`로 받은 데이터를 우선 사용해 JSON payload로 업로드하고, base64가 없는 경우에만 기존 `FormData + uri` 업로드를 fallback으로 유지했다.

2. 모바일 업로드 API 분기 추가
   - 내용: `apps/mobile/src/lib/api.ts`의 `uploadMobileInvitationImage()`가 `FormData`와 `base64 JSON payload`를 모두 받을 수 있게 변경했다.
   - 내용: base64 payload일 때는 `application/json` 요청으로 전송하고, 기존 multipart 전송 helper는 fallback 경로로 유지했다.

3. 서버 라우트에 base64 업로드 처리 추가
   - 내용: `src/app/api/mobile/client-editor/pages/[slug]/images/route.ts`에서 모바일 이미지 업로드 요청을 `multipart/form-data`와 `application/json` 두 형식 모두 처리하도록 변경했다.
   - 내용: JSON 업로드일 때는 `assetKind`, `fileName`, `mimeType`, `base64`를 받아 `File`과 `Buffer`를 구성한 뒤 기존 서버 검증/저장 로직을 그대로 재사용한다.
   - 내용: `base64`가 없는 기기에서 fallback으로 들어오는 `multipart/form-data` 경로가 자기 자신을 재호출하던 버그를 제거하고, 실제 `formData`를 읽어 `file`과 `assetKind`를 파싱하도록 수정했다.

4. 오류 원인 정리
   - 내용: React Native 0.83 환경에서는 `new Blob([Uint8Array])`가 지원되지 않아 `Creating blobs from 'ArrayBuffer' and 'ArrayBufferView' are not supported` 오류가 발생했다.
   - 내용: 이번 변경으로 해당 Blob 생성 경로를 제거해 동일 오류가 다시 나오지 않도록 정리했다.

5. 검증
   - 내용: `apps/mobile`에서 `npm run typecheck`, `npm run lint`를 통과했다.
   - 내용: 루트에서 `npm run lint`, `npx tsc --noEmit`를 통과했다.

### 남은 작업
1. 실기기 대표 이미지 업로드 재확인
   - 현재 상태: 모바일 업로드는 base64 JSON 경로를 우선 사용하고, 서버도 그 경로를 처리하도록 반영됐다.
   - 남은 이유: 현재 환경에서는 실제 기기에서 대표 이미지 업로드 버튼을 눌러 업로드 성공과 미리보기 표시를 직접 확인할 수 없었다.
   - 다음 작업 권장: 실기기에서 대표 이미지 업로드 후 Blob 오류와 `Network request failed`가 모두 사라졌는지, 업로드 직후 미리보기가 보이는지 확인한다.

2. 갤러리 이미지 업로드 동작 확인
   - 현재 상태: 갤러리도 같은 업로드 경로와 같은 payload 생성 로직을 사용한다.
   - 남은 이유: 현재 사용자 리포트는 대표 이미지 기준으로 확인된 상태다.
   - 다음 작업 권장: 갤러리 이미지도 1장 이상 업로드해 동일하게 정상 동작하는지 확인한다.
