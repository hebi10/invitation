### Commit 메시지
- 최종 commit 메시지: `Update 운영 이미지 업로드 미리보기 안정화`

### 작업 요약
1. 운영 이미지 업로드 미리보기 보강
   - 내용: `apps/mobile/src/features/manage/hooks/useImageUpload.ts`에서 업로드 성공 직후 서버 썸네일 URL만 쓰지 않고, 방금 선택한 로컬 이미지 URI를 미리보기 값으로 유지하도록 변경했다.
   - 내용: 대표 이미지와 갤러리 모두 업로드 직후 편집 모달 안에서 바로 미리보기가 보이도록 정리했다.

2. 임시 로컬 URI 저장 방지
   - 내용: `apps/mobile/src/features/manage/buildConfigFromForm.ts`에서 `file://`, `content://`, `ph://`, `assets-library://`, `blob:` 같은 임시 로컬 미리보기 URI는 저장 payload에 남기지 않도록 처리했다.
   - 내용: 저장 시에는 원격 업로드 URL을 기준으로 `coverImageThumbnailUrl`, `galleryImageThumbnailUrls`를 정리해 서버 설정이 깨지지 않게 했다.

3. 임시 미리보기 URL 판별 헬퍼 추가
   - 내용: `apps/mobile/src/features/manage/shared.ts`에 `isTemporaryImagePreviewUrl()`를 추가해 로컬 URI 여부를 공통으로 판별하도록 정리했다.

4. 기존 설정/딥링크 변경 유지
   - 내용: 설정 탭 공개 전환, 앱 딥링크 처리, 설정 화면 버전 안내와 런타임 오류 수정은 유지했다.

5. 검증
   - 내용: `apps/mobile`에서 `npm run typecheck`, `npm run lint`를 실행해 둘 다 통과했다.

### 남은 작업
1. 실기기 업로드 재확인
   - 현재 상태: 업로드 직후에는 로컬 URI를 미리보기로 쓰도록 보강했다.
   - 남은 이유: 이 환경에서는 실제 기기에서 이미지 선택 후 편집 모달 안 미리보기를 직접 확인할 수 없었다.
   - 다음 작업 권장: iOS/Android 실기기에서 대표 이미지와 갤러리 업로드 후 즉시 미리보기가 보이는지 확인한다.

2. 원격 썸네일 품질 정책 검토
   - 현재 상태: 현재 모바일 업로드는 썸네일 파일을 별도로 만들지 않고 원본 URL을 그대로 사용한다.
   - 남은 이유: 편집 중에는 로컬 미리보기로 해결했지만, 저장 후 재진입 시에는 서버가 내려주는 원격 URL 품질과 속도에 다시 의존한다.
   - 다음 작업 권장: 필요하면 모바일 업로드에서도 썸네일 파일을 함께 생성하거나 서버 썸네일 생성 정책을 추가 검토한다.
