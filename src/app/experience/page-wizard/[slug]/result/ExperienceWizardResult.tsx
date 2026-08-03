'use client';

import { useRouter } from 'next/navigation';

import PageWizardResultClient from '@/app/page-wizard/PageWizardResultClient';
import { demoExperienceWizardPersistenceGateway } from '@/app/page-wizard/wizardPersistenceGateway';
import { useExperience } from '@/contexts';

export default function ExperienceWizardResult({ slug }: { slug: string }) {
  const router = useRouter();
  const { routes, switchRole } = useExperience();

  return (
    <PageWizardResultClient
      slug={slug}
      gateway={demoExperienceWizardPersistenceGateway}
      routes={routes}
      experience
      onContinueAsCustomer={async () => {
        await switchRole('customer');
        router.push(routes.wizardEdit(slug));
      }}
    />
  );
}
