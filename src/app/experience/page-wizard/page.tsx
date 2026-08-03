import PageWizardClient from '@/app/page-wizard/PageWizardClient';

export default function ExperiencePageWizardPage() {
  return (
    <PageWizardClient
      initialSlug={null}
      forcedEventType="wedding"
      experience
    />
  );
}
