# 모바일 청첩장 프로젝트

Next.js로 구축된 반응형 모바일 청첩장 웹사이트입니다.

## 주요 기능

- 🎨 반응형 디자인
- 💬 댓글 시스템 (Firebase Firestore)
- 🖼️ 이미지 관리
- 🔐 관리자 인증
- 📱 모바일 최적화

## 환경 설정

1. 환경변수 파일 생성:
```bash
cp .env.example .env.local
```

2. `.env.local` 파일에서 다음 값들을 설정:

### Firebase 설정
- Firebase Console에서 프로젝트 생성
- Firestore Database 생성 (테스트 모드)
- Firebase Storage 설정
- Firebase 설정 정보를 환경변수에 입력

### 관리자 설정
- `NEXT_PUBLIC_ADMIN_PASSWORD`: 관리자 로그인 비밀번호

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
