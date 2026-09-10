import CustomerAuthPageClient from '@/app/my-invitations/CustomerAuthPageClient';

export const dynamic = 'force-dynamic';

export default function SignupPage() {
  return (
    <CustomerAuthPageClient
      title="회원가입"
      description="계정을 만들고 나만의 청첩장을 준비하세요."
      authTitle="고객 회원가입"
      authDescription="이메일 또는 Google 계정으로 시작하세요."
      authHelperText="이메일로 가입하셨다면 받은 편지함의 인증 링크를 확인해 주세요. 인증 후 청첩장을 만들 수 있습니다."
      initialMode="register"
    />
  );
}
