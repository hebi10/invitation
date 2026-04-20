### Commit 메시지
- 최종 commit 메시지: `Update 모바일 앱 개인정보처리방침 페이지 추가`

### 인수인계
1. handoff 관리 규칙 정리
   - 내용: `AGENTS.md`에 `docs/ai-harness-handoff.md`를 60줄 이내로 유지하고, 길어지면 최근 작업 기준 3개 안팎의 핵심 묶음으로 다시 정리하도록 규칙을 추가했다.
   - 내용: `docs/ai-harness-handoff.template.md`도 같은 기준으로 최대 항목 수와 요약 원칙을 맞췄다.

2. 모바일 운영 이미지 업로드 후속 작업 반영
   - 내용: `useImageUpload.ts`, `manage.tsx`, `InvitationEditorModalShell.tsx`, `api.ts`, `route.ts`에 multipart 우선 업로드, cleanup API, 임시 업로드 추적, 저장/닫기 시 정리, picker 선실행 권한 복구 흐름을 반영했다.
   - 내용: `npm --prefix apps/mobile run typecheck`, `npm --prefix apps/mobile run lint`, `npm run lint`, `npx tsc --noEmit`를 통과했다.

3. 모바일 앱 개인정보처리방침 페이지 및 배포 메모 추가
   - 내용: `src/app/privacy/mobile-invitation/page.tsx`, `page.module.css`에 모바일 청첩장 앱용 개인정보처리방침 라우트를 추가하고, Play Console 권장 URL을 `https://msgnote.kr/privacy/mobile-invitation/`로 정리했다.
   - 내용: 정책 문안은 청첩장 생성/운영 정보, 이미지 업로드, 인증 세션, 기기 저장 정보, 사진 권한 사용, Firebase 인프라 사용, 삭제 요청 흐름을 기준으로 한국어 초안을 작성했다.
   - 내용: 문의 채널은 현재 레포에서 확정된 운영 이메일을 찾지 못해 공개 문의 경로로 `https://kmong.com/gig/686626`를 임시 기재했다.
   - 내용: 웹 검증은 `npm run lint`, `npx tsc --noEmit`, `npm run build`까지 통과했다.

### 남은 작업
1. 실기기 업로드/cleanup 확인
   - 현재 상태: 대표 이미지와 갤러리 업로드는 multipart 우선, fallback base64, cleanup 추적/삭제 흐름까지 코드 반영이 끝났다.
   - 남은 이유: 실기기에서 Blob 오류, `Network request failed`, 저장 없이 닫기, 다중 업로드 중간 실패 후 orphan 정리까지 직접 확인하지 못했다.
   - 다음 작업 권장: 대표 이미지와 갤러리 업로드, 저장 성공/취소, 실패 cleanup 시나리오를 실기기에서 확인한다.

2. 실기기 포맷/권한 시나리오 확인
   - 현재 상태: 원본 `mimeType` 우선 업로드와 picker 선실행 후 권한 복구 흐름을 반영했다.
   - 남은 이유: PNG/WEBP/JPEG 보존과 `limited`, `denied`, `canAskAgain: false` 권한 동선은 아직 실기기 검증이 없다.
   - 다음 작업 권장: 포맷별 업로드 결과와 권한 4개 케이스의 notice 및 재시도 흐름을 점검한다.

3. 개인정보처리방침 문의 채널 확정
   - 현재 상태: 정책 페이지는 공개 라우트로 추가됐지만, 문의 섹션은 임시로 공개 판매 페이지 링크를 사용한다.
   - 남은 이유: Play 정책상 운영 이메일이나 전용 문의 폼을 명시해 두는 편이 더 안전한데, 현재 레포에서는 확정된 채널을 찾지 못했다.
   - 다음 작업 권장: `msgnote.kr` 도메인 메일 또는 전용 문의 폼 URL이 준비되면 개인정보처리방침의 문의 섹션과 Play Console 정보를 같은 채널로 교체한다.
