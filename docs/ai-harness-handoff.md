### 인수인계 (최대 3개)

1. 개업 초대장 웹 위저드 분기 정리
   - 내용: `/page-wizard` 진입 시 이벤트 타입이 `opening`이면 청첩장 문구가 나오던 분기를 분리해, 로딩/로그인/접근제어/오류 안내 문구를 개업 전용으로 전환했습니다.
   - 내용: `page-wizard`의 문구 소스(`PageWizardClient`, `pageWizardPresentation`)에서 `opening` 브랜치를 추가해 이벤트별 UI 상태 메시지를 분리했습니다.
   - 남은 이유: 현재는 개업 전용 테마 색상은 기존 공용 스타일을 사용하므로 추후 톤 조정이 필요하면 `page.module.css`와 `opening` 전용 토큰 추가 고려.

2. 개업 전용 위저드 진입경로 추가
   - 내용: `/page-wizard/opening/page.tsx`를 추가해 쿼리 없이 `forcedEventType="opening"`로 진입하도록 구성했습니다.
   - 내용: `src/app/admin/_components/AdminPagesTab.tsx`의 새 페이지 생성 링크에 `activePageCategory === 'opening'`일 때 `/page-wizard/opening`이 선택되도록 연결했습니다.
   - 남은 이유: 이벤트 리스트/필터에서 `/page-wizard/opening?eventType=...` 경로를 사용하는 타 화면 링크가 있으면 동일 기준으로 정리 필요.

3. 이벤트 타입 안내 문구 업데이트
   - 내용: `EventTypeStep` 상단 안내 문구를 고정 문장 대신 `enabled` 이벤트 타입 메타 기반으로 동적으로 구성해, opening 추가 시 하드코딩 갱신을 줄였습니다.
   - 내용: `EVENT_TYPE_KEYS`/`getEventTypeMeta`를 이용해 활성 타입 이름을 노출해 사용자 오해 포인트를 완화했습니다.

### 남은 작업 (최대 3개)

1. 관리자 화면 문구/라벨 다국화
   - 현재 상태: 개업 카테고리에서 페이지 목록/헤더 라벨은 일부 일반 텍스트(예: '예식 정보', '청첩장 테이블')가 남아 있음.
   - 남은 이유: 운영 상 체감 품질 차이 최소화를 위해 opening 전용 라벨 추가 필요.
   - 다음 작업 권장: `AdminPagesTab.tsx`의 opening 전용 안내/테이블 라벨만 선택적으로 분기.

2. 공개 화면 QA
   - 현재 상태: 위저드 진입과 문구/라우트는 정상화되었으나 실제 `/page-wizard/opening` + `/page-wizard/{slug}` 경로의 체감 검증이 남음.
   - 다음 작업 권장: 브라우저로 로딩 화면, 생성 흐름, 마이그레이션되지 않은 slug 편집 플로우를 회귀 테스트.
