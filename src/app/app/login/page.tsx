import AppLoginRedirectClient from './AppLoginRedirectClient';

export const dynamic = 'force-dynamic';

type AppLoginPageProps = {
  searchParams: Promise<{
    linkToken?: string | string[];
    next?: string | string[];
  }>;
};

function readSearchParam(
  value: string | string[] | undefined,
  fallback: string
) {
  const selected = Array.isArray(value) ? value[0] : value;
  const trimmed = selected?.trim();

  return trimmed ? trimmed : fallback;
}

export default async function AppLoginRedirectPage({
  searchParams,
}: AppLoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const linkToken = readSearchParam(resolvedSearchParams.linkToken, '');
  const requestedNext = readSearchParam(resolvedSearchParams.next, '/manage');
  const nextPath = requestedNext.startsWith('/') ? requestedNext : '/manage';

  return <AppLoginRedirectClient linkToken={linkToken} nextPath={nextPath} />;
}
