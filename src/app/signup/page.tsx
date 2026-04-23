import CustomerAuthPageClient from '@/app/my-invitations/CustomerAuthPageClient';

export const dynamic = 'force-dynamic';

export default function SignupPage() {
  return (
    <CustomerAuthPageClient
      eyebrow="Customer Signup"
      title="고객 계정을 만든 뒤 내 청첩장을 연결해 주세요"
      description="새 계정을 만들면 `/my-invitations`에서 청첩장을 바로 만들거나 기존 페이지를 연결해서 관리할 수 있습니다."
      authTitle="고객 회원가입"
      authDescription="회원가입 후에는 같은 계정으로 로그인해 내 청첩장을 관리할 수 있습니다."
      initialMode="register"
    />
  );
}
