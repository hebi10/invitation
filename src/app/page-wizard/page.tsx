import { redirect } from 'next/navigation';

export default async function PageWizardPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams ?? {};
  const eventType = typeof query.eventType === 'string' ? query.eventType : '';
  redirect(`/page-wizard/edit${eventType ? `?eventType=${encodeURIComponent(eventType)}` : ''}`);
}
