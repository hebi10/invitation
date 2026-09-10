import CustomerAuthPageClient from '@/app/my-invitations/CustomerAuthPageClient';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <CustomerAuthPageClient
      title="내 청첩장 로그인"
      description="내 계정에 연결된 청첩장을 확인하고 수정하세요."
      authTitle="고객 로그인"
      authDescription="이메일 또는 Google 계정으로 로그인하세요."
      initialMode="login"
    />
  );
}
