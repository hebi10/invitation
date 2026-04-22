import InvitationDraftSetupClient from '@/app/_components/InvitationDraftSetupClient';

export default function PageEditorCreatePage() {
  return (
    <InvitationDraftSetupClient
      editorKind="page-editor"
      title="기본 편집기 초안 만들기"
      description="템플릿, 한글 이름, 청첩장 주소를 먼저 정한 뒤 page-editor에서 세부 편집을 이어갑니다."
    />
  );
}
