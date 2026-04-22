import InvitationDraftSetupClient from '@/app/_components/InvitationDraftSetupClient';

export const dynamic = 'force-dynamic';

export default function PageWizardCreatePage() {
  return (
    <InvitationDraftSetupClient
      editorKind="page-wizard"
      title="모바일형 청첩장 초안 만들기"
      description="템플릿, 한글 이름, 청첩장 주소를 먼저 정한 뒤 page-wizard에서 단계별로 내용을 채웁니다."
    />
  );
}
