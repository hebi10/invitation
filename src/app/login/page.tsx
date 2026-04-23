import CustomerAuthPageClient from '@/app/my-invitations/CustomerAuthPageClient';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <CustomerAuthPageClient
      eyebrow="Customer Login"
      title="로그인 후 내 청첩장을 관리해 주세요"
      description="이메일 로그인 또는 Google 로그인으로 내 계정에 연결된 청첩장을 확인하고 바로 수정할 수 있습니다."
      authTitle="고객 로그인"
      authDescription="기본 이메일 로그인과 Google 로그인만 지원합니다."
      initialMode="login"
    />
  );
}
