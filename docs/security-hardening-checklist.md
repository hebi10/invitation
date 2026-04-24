# Security Hardening Checklist

## 목적
- 평문 비밀번호 저장, 기본 비밀번호 fallback, claim 무제한 시도를 제거하고 고객 로그인/연동 흐름을 안전하게 정리한다.
- 작업 전 기준선과 수동 QA 기준을 남겨 이후 수정 시 빠르게 비교할 수 있게 한다.

## 작업 전 기준선
- 기준 브랜치: `main`
- 기준 커밋: `a81d2a9b322416ae07994f9263ea651a0b2acbf4`
- 로컬 백업 브랜치 생성 시도:
  - `backup-security-hardening-baseline-20260423`
  - 현재 환경의 `.git` 쓰기 권한 문제로 자동 생성 실패
- 현재 비교 기준 화면
  - Web: `/login`, `/signup`, `/my-invitations`, `/page-wizard`, `/page-wizard/[slug]`
  - Admin: `/admin?section=customers&tab=passwords`, `/admin?section=events&tab=pages`
  - Mobile: 로그인, 생성, 운영 대시보드, 방명록 관리

## 수동 QA 체크리스트 초안
- Web 고객 로그인/회원가입
  - [ ] `/login` 이메일 로그인
  - [ ] `/signup` 이메일 가입
  - [ ] `/my-invitations` 로그인 전/후 상태 전환
- Web 페이지 생성/관리
  - [ ] `/page-wizard`에서 고객 편집 비밀번호를 직접 입력해야만 저장 가능
  - [ ] `/page-wizard/[slug]`에서 기존 청첩장 claim 성공 후 바로 편집 화면으로 전환
  - [ ] `/page-wizard/[slug]`에서 비밀번호가 맞으면 성공/연결 완료 상태를 표시하고, 틀리면 오류 문구를 표시
  - [ ] `/page-editor/[slug]` 편집 후 공개 페이지 정상 노출
- Admin 고객 비밀번호 관리
  - [ ] 현재 비밀번호가 화면에 직접 노출되지 않음
  - [ ] 새 비밀번호 입력 후 재설정 가능
  - [ ] 비밀번호 미설정 페이지는 자동 기본값 없이 미설정으로 보임
- Admin 로그인
  - [ ] `/admin?section=events&tab=pages&pageCategory=invitation`에서 로그인 화면이 현재 청첩장 앱으로 뜸
  - [ ] 관리자 권한 확인은 `/api/admin/session`의 Firebase ID token 검증 결과를 사용함
- 보안 흐름
  - [ ] claim API 연속 실패 시 429 응답
  - [ ] 모바일 로그인과 고위험 재인증이 기존 비밀번호로 정상 동작
  - [ ] 기존 계정 연결(claim) 이후 `/my-invitations`가 서버 API로 목록을 다시 읽고 관리 화면으로 이동
  - [ ] 기존 계정 연결(claim) 이후 `/page-wizard/[slug]`가 서버 API 기준 owner/config 상태로 편집 화면 전환

## 배포 전 확인 명령어
```bash
npm run typecheck:web
npm run lint:web
npm run typecheck:mobile
npm run lint:mobile
```

## 이번 작업 범위
1. `eventSecrets` 평문 비밀번호 저장 제거
2. 기본 비밀번호 `12344` 제거
3. `/api/customer/events/claim` rate limit 추가
4. 관리자 비밀번호 탭을 “조회”가 아닌 “재설정” 흐름으로 정리

## 기존 평문 데이터 처리 정책
- `passwordHash/passwordSalt/passwordIterations`가 이미 있으면 해시 검증만 사용한다.
- 같은 문서에 legacy `password` 필드가 남아 있으면, 다음 로그인 성공 또는 비밀번호 재설정 시 평문 필드를 삭제한다.
- 해시가 없고 legacy `password`만 있는 문서는 1회 검증 성공 시 해시-only 문서로 업그레이드한다.
- 검증에 성공하지 못한 legacy 평문 문서는 관리자에서 새 비밀번호를 재설정하는 방식으로 정리한다.

## 공개 페이지 fallback 정책
- Firebase를 사용할 수 있는 공개 라우트는 Firestore 공개 데이터만 초기 렌더에 전달한다.
- 비관리자 공개 클라이언트 조회는 seed fallback, 오류 fallback, 비공개 데이터 통과를 모두 끈다.
- seed/sample fallback은 Firebase 비활성 환경, 관리자 인증 상태, 명시적 preview 용도에서만 허용한다.

## Storage 이미지 공개 정책
- `wedding-images/{slug}` 공개 읽기는 Firestore `events`의 공개 상태와 노출 기간을 통과한 경우에만 허용한다.
- `memory-images/{slug}` 공개 읽기는 `memory-pages/{slug}`가 enabled이고 public/unlisted인 경우에만 허용한다.
- 공개 방문자는 Storage folder listing을 하지 않고, Firestore config에 저장된 필요한 이미지 URL만 사용한다.
- Storage download token이 이미 발급된 기존 URL은 별도 토큰 회전/삭제 없이는 계속 접근될 수 있으므로 운영 정리 대상이다.

## 방명록 쓰기 공개 정책
- 공개 방문자 댓글 등록은 클라이언트 Firestore `addDoc`이 아니라 `POST /api/guestbook/comments`만 사용한다.
- 서버 API는 slug 존재 여부, 공개 여부, 노출 기간, 이름/메시지 길이, 기본 스팸 패턴, IP/user-agent 기반 rate limit을 확인한다.
- `events/{eventId}/comments/{commentId}`의 클라이언트 직접 create는 Firestore rules에서 차단한다.
- 이번 단계에서는 댓글을 기존 공개 흐름과 맞춰 `status: "public"`으로 저장하고, 승인제 전환이 필요하면 별도 관리자 승인 흐름과 함께 `pending` 정책을 추가한다.

## 이번 작업 후 자동 검증
- [x] `npm run typecheck:web`
- [x] `npm run lint:web`
- [x] `npm run typecheck:mobile`
- [x] `npm run lint:mobile`
- [x] `npm run build`
