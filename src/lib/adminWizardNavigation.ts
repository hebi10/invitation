import type { AppRoutes } from '@/lib/demoExperienceRoutes';

const ADMIN_CONTEXT_QUERY_KEYS = new Set([
  'section', 'tab', 'view',
  'pageQ', 'pageType', 'pageCategory', 'published', 'ownership', 'pageSort',
  'visibility', 'page', 'pageSize', 'event', 'detail',
  'customer', 'customerDetail', 'customerQ', 'customerConnection', 'customerPage',
  'commentQ', 'commentPageSlug', 'commentAge', 'commentPage', 'periodStatus',
]);

export function getAdminWizardReturnHref(
  returnTo: string | null | undefined,
  routes: AppRoutes
) {
  const adminPath = routes.admin();
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(returnTo)) {
    return adminPath;
  }

  try {
    const url = new URL(returnTo, 'https://admin-return.invalid');
    const isAdminPath = url.pathname === adminPath || url.pathname === `${adminPath}/`;
    if (url.origin !== 'https://admin-return.invalid' || !isAdminPath) {
      return adminPath;
    }

    // Restore screen state only; `next` can trigger another navigation in /admin.
    const context = new URLSearchParams();
    for (const [key, value] of url.searchParams) {
      if (ADMIN_CONTEXT_QUERY_KEYS.has(key)) context.set(key, value);
    }
    const query = context.toString();
    return query ? `${adminPath}?${query}` : adminPath;
  } catch {
    return adminPath;
  }
}

export function withAdminWizardReturnTo(routes: AppRoutes, returnTo: string): AppRoutes {
  const safeReturnTo = getAdminWizardReturnHref(returnTo, routes);
  const appendReturnTo = (path: string) => {
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}${new URLSearchParams({ returnTo: safeReturnTo })}`;
  };
  return {
    ...routes,
    wizardEdit: (slug) => appendReturnTo(routes.wizardEdit(slug)),
    wizardResult: (slug) => appendReturnTo(routes.wizardResult(slug)),
  };
}
