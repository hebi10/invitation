# Security Hardening Checklist

## 목적
- 평문 비밀번호 저장, 기본 비밀번호 fallback, 무제한 시도를 제거하고 인증/권한 흐름을 안전하게 유지한다.
- 웹 생성/편집 화면은 관리자 전용으로 제한하고, 모바일 고객 편집 흐름은 별도 API 정책으로 관리한다.

## 현재 기준 화면
- Web public: `/`, `/{slug}`, `/{slug}/{theme}`, `/memory/{slug}`
- Web admin-only: `/admin`, `/page-wizard`, `/page-wizard/[slug]`, `/page-editor`, `/page-editor/[slug]`
- Web customer dashboard: `/login`, `/signup`, `/my-invitations`
- Mobile: Expo 로그인, 생성, 운영 대시보드, 방명록 관리

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
- Admin 고객 비밀번호 관리
  - [ ] 현재 비밀번호가 화면에 직접 노출되지 않음
  - [ ] 새 비밀번호 입력 후 재설정 가능
  - [ ] 비밀번호 미설정 페이지는 자동 기본값 없이 미설정으로 보임
- API 보안
  - [ ] `/api/client-editor/*` 웹 고객 편집 API는 관리자 전용 전환 안내를 반환
  - [ ] `/api/customer/events/claim` 연속 실패 시 429 응답
  - [ ] `/api/admin/session`이 Firebase ID token과 admin 권한 문서를 검증
- Mobile
  - [ ] 모바일 로그인과 고위험 재인증이 기존 비밀번호로 정상 동작
  - [ ] 기존 계정 연결 후 `/my-invitations`가 서버 API로 목록을 다시 읽음

## 배포 전 확인 명령
```bash
npm run check
npm run qa:event-rollout
npm run build
git diff --check
```

## 비밀번호 데이터 처리 정책
- `passwordHash/passwordSalt/passwordIterations`가 있으면 해시 검증만 사용한다.
- legacy `password` 필드가 남아 있으면 다음 로그인 성공 또는 비밀번호 재설정 시 평문 필드를 삭제한다.
- 검증에 성공하지 못한 legacy 평문 문서는 관리자에서 새 비밀번호를 재설정하는 방식으로 정리한다.
