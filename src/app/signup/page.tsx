import CustomerAuthPageClient from '@/app/my-invitations/CustomerAuthPageClient';

export const dynamic = 'force-dynamic';

export default function SignupPage() {
  return (
    <CustomerAuthPageClient
      eyebrow="Customer Signup"
      title="고객 계정을 만든 뒤 내 청첩장을 연결해 주세요"
      description="새 계정을 만들면 `/my-invitations`에서 청첩장을 바로 만들거나 기존 페이지를 연결해서 관리할 수 있습니다."
      authTitle="고객 회원가입"
      authDescription="Google 로그인은 별도 인증 없이 바로 사용할 수 있고, 이메일 계정은 인증 메일 확인 후 청첩장을 생성할 수 있습니다."
      authHelperText="이메일로 계정을 만들면 받은 편지함의 인증 링크를 먼저 확인해 주세요. 인증 전에는 로그인은 가능하지만 새 청첩장 생성은 제한됩니다."
      initialMode="register"
    />
  );
}
