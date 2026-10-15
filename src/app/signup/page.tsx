import CustomerAuthPageClient from '@/app/my-invitations/CustomerAuthPageClient';
import { isMobileAccountSource } from '@/lib/mobileAccountReturn';

export const dynamic = 'force-dynamic';

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ from?: string | string[] }> }) {
  const mobileReturn = isMobileAccountSource((await searchParams).from);
  return (
    <CustomerAuthPageClient
      title="회원가입"
      description="계정을 만들고 관리자가 준비한 청첩장을 연결해 주세요."
      authTitle="고객 회원가입"
      authDescription="이메일 또는 Google 계정으로 시작하세요."
      authHelperText="이메일 인증을 마치면 관리자가 생성해 연결한 청첩장을 편집할 수 있습니다. 연결 링크를 받았다면 해당 링크에서 계정을 확인해 주세요."
      initialMode="register"
      mobileReturn={mobileReturn}
    />
  );
}
