import ExperienceWizardResult from './ExperienceWizardResult';

export default async function ExperienceWizardResultPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ExperienceWizardResult slug={slug} />;
}
