import InvitationDraftSetupClient from '@/app/_components/InvitationDraftSetupClient';

export const dynamic = 'force-dynamic';

export default function PageWizardCreatePage() {
  return (
    <InvitationDraftSetupClient
      editorKind="page-wizard"
      title="모바일 위저드로 청첩장 만들기"
      description="원하는 템플릿과 상품을 고른 뒤 Firestore 초안을 만들고, 단계별 모바일 위저드에서 이어서 편집합니다."
      compactMode
    />
  );
}
