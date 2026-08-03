import PageWizardClient from '@/app/page-wizard/PageWizardClient';

export default async function ExperienceEditWizardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PageWizardClient
      initialSlug={slug}
      forcedEventType="wedding"
      experience
    />
  );
}
