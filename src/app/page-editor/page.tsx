import InvitationDraftSetupClient from '@/app/_components/InvitationDraftSetupClient';

export default function PageEditorCreatePage() {
  return (
    <InvitationDraftSetupClient
      editorKind="page-editor"
      title="Create a page-editor draft"
      description="Choose the starting template, reserve the public URL, and create the Firestore draft before entering the detailed page editor."
    />
  );
}
