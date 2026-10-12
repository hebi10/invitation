import type { AdminTab } from '../_components/adminPageUtils';

export function getAdminDataLoadPolicy({
  isAdminLoggedIn,
  activeTab,
  selectedEventSlug,
  selectedEventDetailTab,
}: {
  isAdminLoggedIn: boolean;
  activeTab: AdminTab;
  selectedEventSlug?: string | null;
  selectedEventDetailTab?: string | null;
}) {
  const hasEventDetail = activeTab === 'pages' && Boolean(selectedEventSlug);
  return {
    pages: isAdminLoggedIn && (activeTab === 'pages' || activeTab === 'comments' || activeTab === 'periods'),
    comments: isAdminLoggedIn && (activeTab === 'comments' || (hasEventDetail && selectedEventDetailTab === 'comments')),
    accounts: isAdminLoggedIn && (activeTab === 'accounts' || (hasEventDetail && selectedEventDetailTab === 'ownership')),
    summary: isAdminLoggedIn && (activeTab === 'memory' || activeTab === 'periods'),
  };
}
