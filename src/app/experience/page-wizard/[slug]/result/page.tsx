import ExperienceWizardResult from './ExperienceWizardResult';

export default async function ExperienceWizardResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ returnTo?: string | string[] }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const returnTo = typeof query?.returnTo === 'string' ? query.returnTo : null;
  return <ExperienceWizardResult slug={slug} returnTo={returnTo} />;
}
