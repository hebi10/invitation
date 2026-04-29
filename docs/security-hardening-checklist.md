# Security Hardening Checklist

## 목적
- 기존 고객 편집 비밀번호 흐름을 제거하고 Firebase 계정 소유권 기반 인증/권한 흐름을 안전하게 유지한다.
- 웹 생성/편집 화면은 관리자 전용으로 제한하고, 모바일 고객 편집 흐름은 별도 API 정책으로 관리한다.

## 현재 기준 화면
- Web public: `/`, `/{slug}`, `/{slug}/{theme}`, `/memory/{slug}`
- Web admin-only: `/admin`, `/page-wizard`, `/page-editor`, `/page-editor/[slug]`
- Web owner-editable: `/page-wizard/[slug]`
- Web customer dashboard: `/login`, `/signup`, `/my-invitations`
- Mobile: Expo 로그인, 생성, 운영 대시보드, 방명록 관리

## 배포 / 비밀값 기준
- 웹 런타임은 Firebase App Hosting을 사용한다.
- 저장소에는 서비스 계정 JSON 파일을 두지 않는다.
- 서버 비밀값은 Firebase App Hosting Secret Manager 또는 배포 환경 변수로 주입한다.
- 로컬 스크립트에서 `GOOGLE_APPLICATION_CREDENTIALS`가 필요하면 저장소 밖의 파일 경로를 사용한다.

## 수동 QA 체크리스트
- Web 관리자 전용
  - [ ] `/page-wizard` 비관리자 접근 시 “관리자만 이용 가능” 안내 표시
  - [ ] `/page-wizard/[slug]` 비관리자 접근 시 “관리자만 이용 가능” 안내 표시
  - [ ] `/page-editor` 비관리자 접근 시 “고객 편집기는 관리자만 이용 가능” 안내 표시
  - [ ] `/page-editor/[slug]` 비관리자 접근 시 “고객 편집기는 관리자만 이용 가능” 안내 표시
- Web 고객 대시보드
  - [ ] `/login` 이메일 로그인
  - [ ] `/signup` 이메일 가입
  - [ ] `/my-invitations` 로그인 전/후 상태 전환
  - [ ] `/my-invitations`에서 본인 청첩장 방명록 조회
  - [ ] `/my-invitations`에서 본인 청첩장 방명록 삭제 예정 처리
- API 보안
  - [ ] 기존 고객 편집 비밀번호 로그인/claim API가 노출되지 않음
  - [ ] `/api/customer/events/[slug]/comments`가 Firebase ID token과 ownerUid를 검증
  - [ ] `/api/admin/session`이 Firebase ID token과 admin 권한 문서를 검증
- Repository hygiene
  - [ ] 저장소 루트에 서비스 계정 JSON 파일이 없음
  - [ ] `.codex/`, `.codex-logs/` 같은 로컬 도구 산출물이 git에 추적되지 않음
  - [ ] App Hosting Secret Manager에 서버 비밀값이 등록되어 있음
  - [ ] `firebase.json`은 Firestore/Storage rules 배포만 담당함
- Mobile
  - [ ] 모바일 로그인과 고위험 재인증이 고객 로그인/owner session으로 정상 동작
  - [ ] 기존 계정 연결 후 `/my-invitations`가 서버 API로 목록을 다시 읽음

## 배포 전 확인 명령
```bash
npm run check
npm run qa:event-rollout
npm run build
git diff --check
```

## 레거시 비밀번호 데이터 처리 정책
- 신규 코드 경로는 고객 편집 비밀번호를 생성, 검증, 저장하지 않는다.
- 기존 `eventSecrets`/`client-passwords` 데이터는 새 로그인 또는 claim 기준으로 사용하지 않는다.
- 레거시 문서 삭제가 필요하면 별도 마이그레이션/운영 스크립트로 정리한다.
