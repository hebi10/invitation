'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import AppQueryProvider from '@/app/AppQueryProvider';
import FirebaseAuthLoginCard from '@/app/_components/FirebaseAuthLoginCard';
import { resolveEventPageRenderer } from '@/app/_components/eventPageRendererRegistry';
import CustomerEmailVerificationGate from '@/app/page-wizard/CustomerEmailVerificationGate';
import { useAdmin } from '@/contexts';
import { buildCustomerInvitationPreviewPath } from '@/lib/customerInvitationWorkspace';
import type { InvitationThemeKey } from '@/lib/invitationThemes';
import { loadCustomerInvitationPreview } from '@/services/customerEventService';
import styles from '../../../page.module.css';

export default function CustomerInvitationPreviewClient({ slug, theme }: { slug: string; theme: InvitationThemeKey }) {
  const { authUser, isAdminLoading, isLoggedIn } = useAdmin();
  const verified = authUser?.emailVerified === true;
  const query = useQuery({
    queryKey: ['customer-invitation-preview', slug, authUser?.uid ?? null],
    enabled: !isAdminLoading && isLoggedIn && verified,
    queryFn: () => loadCustomerInvitationPreview(slug),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  if (isAdminLoading) return <p className={styles.cardMeta} role="status">로그인 상태를 확인하고 있습니다.</p>;
  if (!isLoggedIn) return <main className={styles.page}><div className={styles.shell}>
    <FirebaseAuthLoginCard title="로그인 후 미리보기를 확인해 주세요" description="현재 계정에 연결된 초대장만 볼 수 있습니다."
      allowSignUp={false} returnTo={buildCustomerInvitationPreviewPath(slug, theme)} />
  </div></main>;
  if (!verified) return <CustomerEmailVerificationGate />;

  const page = query.data;
  const { renderer } = resolveEventPageRenderer(page?.eventType);
  const validTheme = !page || (renderer.isThemeSupported(theme) && renderer.resolveRouteTheme(page, theme) === theme);
  const error = query.error instanceof Error ? query.error.message : !validTheme ? '이 초대장에서 지원하지 않는 디자인입니다.' : '';

  return <>
    <div className={styles.previewNotice} data-operation-ui>
      <p>소유자 미리보기입니다. 공개 전이나 노출 종료 후에도 저장한 내용을 확인할 수 있습니다.</p>
      <Link className={styles.secondaryButton} href="/my-invitations/">내 초대장으로</Link>
    </div>
    {error ? <div className={styles.previewNotice} data-operation-ui>
      <p role="alert">{error}</p>
      <button type="button" className={styles.secondaryButton} onClick={() => void query.refetch()} disabled={query.isFetching}>다시 시도</button>
    </div> : !page ? <p className={styles.cardMeta} role="status">초대장을 불러오고 있습니다.</p> : <AppQueryProvider key={`${authUser?.uid}-${query.dataUpdatedAt}`}>
      {renderer.renderPage({
      slug, theme, initialPageConfig: page, pageLoader: async () => page,
      queryScope: 'experience', showGuestbook: false, allowStorageImages: false, externalShareEnabled: false,
    })}</AppQueryProvider>}
  </>;
}
