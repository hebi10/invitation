# 🎊 모바일 청첩장 프로젝트

Next.js 15와 Firebase를 기반으로 구축된 현대적이고 반응형 모바일 청첩장 웹사이트입니다.

## ✨ 주요 기능

### 🎨 UI/UX
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 최적화
- **웨딩 테마**: 우아하고 로맨틱한 CSS 모듈 기반 디자인
- **로딩 애니메이션**: 사용자 맞춤형 웨딩 로더
- **스무스 인터랙션**: 드래그 방지, 부드러운 전환 효과

### � 기술적 특징
- **Multi-Page Support**: 여러 커플의 청첩장을 하나의 앱에서 관리
- **컴포넌트 기반**: 재사용 가능한 모듈형 컴포넌트 시스템
- **TypeScript**: 완전한 타입 안정성
- **CSS Modules**: 격리된 스타일링 시스템

### 📱 핵심 컴포넌트
- **Cover**: 커버 페이지 (신랑신부 이름, 날짜)
- **Greeting**: 인사말 섹션
- **Gallery**: 이미지 갤러리 (Firebase Storage 연동)
- **Schedule**: 결혼식 일정 및 시간
- **LocationMap**: Google Maps 연동 위치 안내
- **WeddingCalendar**: 달력 형태의 날짜 표시
- **Guestbook**: 방명록 (댓글 시스템)
- **GiftInfo**: 축의금 계좌 정보

### 🔥 Firebase 통합
- **Firestore**: 방명록 댓글 시스템
- **Storage**: 이미지 업로드 및 관리
- **페이지별 컬렉션**: 각 커플별 독립적인 데이터 관리
- **실시간 업데이트**: 새 댓글 실시간 반영

### �️ 관리 기능
- **클라이언트 패스워드 시스템**: 커플별 개별 비밀번호 관리
- **이미지 매니저**: 갤러리 이미지 업로드/삭제
- **댓글 관리**: 방명록 댓글 승인/삭제
- **스팸 방지**: 쿠키 기반 댓글 제한

### �️ 지도 통합
- **Google Maps**: iframe 기반 지도 표시
- **외부 앱 연동**: 네이버 지도, 카카오맵, 구글 지도로 바로 연결
- **주소 복사**: 원클릭 주소 복사 기능

## 🚀 환경 설정

### 1. 프로젝트 클론 및 설치
```bash
git clone [repository-url]
cd invitation
npm install
```

### 2. 환경변수 설정
`.env.local` 파일을 생성하고 다음 값들을 설정하세요:

```env
# Firebase 설정
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Firebase 사용 여부
NEXT_PUBLIC_USE_FIREBASE=true

# 관리자 비밀번호
NEXT_PUBLIC_ADMIN_PASSWORD=your_admin_password

# 카카오맵 API 키 (선택사항)
NEXT_PUBLIC_KAKAO_MAP_API_KEY=your_kakao_api_key
```

### 3. Firebase 설정
1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. **Firestore Database** 생성 (테스트 모드로 시작)
3. **Firebase Storage** 활성화
4. **Web 앱 추가**하여 설정 정보 획득
5. 환경변수에 Firebase 설정 정보 입력

### 4. 새로운 웨딩 페이지 추가
`src/config/weddingPages.ts` 파일에서 새 커플 정보를 추가:

```typescript
{
  slug: 'groom-name-bride-name', // URL 경로
  displayName: '신랑 ♥ 신부', // 표시 이름
  description: '결혼식 설명',
  date: '2024년 4월 14일',
  venue: '웨딩홀 이름',
  groomName: '신랑',
  brideName: '신부',
  weddingDateTime: {
    year: 2024,
    month: 3, // 0-based (3 = April)
    day: 14,
    hour: 15,
    minute: 0
  }
}
```

## 🛠️ 개발 시작하기

### 개발 서버 실행
```bash
npm run dev
# 또는
yarn dev
# 또는
pnpm dev
# 또는
bun dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 결과를 확인하세요.

### 사용 가능한 스크립트
```bash
npm run dev      # 개발 서버 시작
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버 시작
npm run lint     # ESLint 실행
npm run export   # 정적 사이트 생성
npm run deploy:firebase  # Firebase 호스팅 배포
```

## 📁 프로젝트 구조

```
src/
├── app/
│   ├── (page)/                    # 웨딩 페이지들
│   │   ├── shin-minje-kim-hyunji/
│   │   ├── kim-taehyun-choi-yuna/
│   │   └── lee-junho-park-somin/
│   ├── globals.css               # 전역 스타일
│   ├── layout.tsx               # 루트 레이아웃
│   └── page.tsx                # 홈페이지
├── components/                  # 재사용 가능한 컴포넌트들
│   ├── Cover/                  # 커버 페이지
│   ├── Greeting/              # 인사말
│   ├── Gallery/               # 갤러리
│   ├── Schedule/              # 일정
│   ├── LocationMap/           # 지도
│   ├── WeddingCalendar/       # 캘린더
│   ├── Guestbook/             # 방명록
│   ├── GiftInfo/              # 축의금 정보
│   ├── WeddingLoader/         # 로딩 컴포넌트
│   ├── ImageManager/          # 이미지 관리
│   ├── ClientPasswordManager/ # 클라이언트 패스워드 관리
│   └── index.ts               # 컴포넌트 내보내기
├── config/
│   └── weddingPages.ts        # 웨딩 페이지 설정
├── hooks/
│   └── usePageImages.ts       # 이미지 관리 훅
├── lib/
│   ├── firebase.ts            # Firebase 설정
│   └── passwordService.ts     # 패스워드 서비스
└── services/
    └── commentService.ts      # 댓글 서비스
```

## 🎯 사용법

### 1. 새 웨딩 페이지 생성
1. `src/config/weddingPages.ts`에 새 커플 정보 추가
2. `src/app/(page)/새로운-슬러그/` 폴더 생성
3. `page.tsx` 파일 생성 및 컴포넌트 구성

### 2. 이미지 관리
- 관리자 모드에서 ImageManager 컴포넌트 사용
- Firebase Storage에 자동 업로드
- 갤러리에서 즉시 반영

### 3. 방명록 관리
- 페이지별 독립적인 방명록 운영
- 댓글 실시간 업데이트
- 스팸 방지 기능 내장

## 🚀 배포

### Firebase 호스팅
```bash
# Firebase CLI 설치
npm install -g firebase-tools

# Firebase 로그인
firebase login

# 프로젝트 초기화 (최초 1회)
firebase init

# 배포
npm run deploy:firebase
```

### Vercel 배포
1. [Vercel](https://vercel.com)에 GitHub 저장소 연결
2. 환경변수 설정
3. 자동 배포 완료

## 🛡️ 보안 고려사항

- **환경변수**: 민감한 정보는 반드시 환경변수로 관리
- **Firestore 규칙**: 프로덕션에서는 적절한 보안 규칙 설정
- **이미지 업로드**: 파일 타입 및 크기 제한
- **댓글 스팸**: 쿠키 기반 제한 및 관리자 승인

## 📚 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: CSS Modules
- **Backend**: Firebase (Firestore, Storage)
- **State Management**: React Query
- **Date Handling**: date-fns
- **Map Integration**: Google Maps

## 📄 라이선스

이 프로젝트는 개인 사용을 위한 프로젝트입니다.
