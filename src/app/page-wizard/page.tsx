import InvitationDraftSetupClient from '@/app/_components/InvitationDraftSetupClient';

export const dynamic = 'force-dynamic';

export default function PageWizardCreatePage() {
  return (
    <InvitationDraftSetupClient
      editorKind="page-wizard"
      title="Create a page-wizard draft"
      description="Start with the template and package you want, create the Firestore draft, and then continue inside the mobile step-based wizard."
    />
  );
}
