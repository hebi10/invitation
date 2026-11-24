# INV-FIX-02-C — 권한 확인형 이미지 게이트웨이 (파일럿)

기본 비활성: 서버 환경의 INVITATION_MEDIA_GATEWAY_PILOT_SLUG에 승인된 테스트 slug 하나를 지정한 경우에만 작동한다. 운영 환경 설정은 이번 PR에서 변경하지 않는다.

- 공개 GET /api/public/media/{slug}/{file}/: 활성 slug index, 실제 이벤트 ID, 공개·기간·삭제/결제 보류 상태, 동일 버킷의 정확한 저장 참조를 확인한다. 샘플 fallback, slug 자동 복구, 임의 외부 URL은 사용하지 않는다.
- 인증 GET /api/customer/events/{slug}/media/{file}/: 취소된 인증 토큰 거절, 인증된 소유자 또는 활성 관리자만. 비공개 편집 이미지 읽기 가능. 모바일 세션 기반 미리보기 및 기존 브라우저 렌더러 연결은 후속.
- 실제 객체의 generation·크기·MIME·파일 서명 확인, 8MiB 상한, no-store 및 nosniff, 다운로드 뒤 접근 조건 재확인. 기존 원본 URL과 저장 필드는 변경하지 않는다.
- 범위는 wedding-images 내 JPG/PNG/WebP. memory-images, 이전 slug/리다이렉트, 음악, 외부 CDN, 일반 고객 경로는 제외.
- 다음: 테스트 이벤트로 공개/인증 미리보기 경로 연동, 공유 메타데이터·웹/Android 편집·추억 페이지·구버전 호환 검증, 저장 참조 변환 및 운영 토큰 폐기/복구 계획 검증. 기존 토큰 직접 접근은 여전히 가능하며 이 PR만으로 해결되지 않는다.
