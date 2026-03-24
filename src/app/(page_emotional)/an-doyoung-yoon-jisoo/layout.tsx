import type { Metadata, Viewport } from 'next';

import {
  createWeddingInvitationLayout,
  getWeddingInvitationMetadata,
  weddingInvitationViewport,
} from '@/app/_components/WeddingInvitationLayout';

const WEDDING_SLUG = 'an-doyoung-yoon-jisoo';

export const metadata: Metadata = getWeddingInvitationMetadata(WEDDING_SLUG);
export const viewport: Viewport = weddingInvitationViewport;

const Layout = createWeddingInvitationLayout({ slug: WEDDING_SLUG, theme: 'emotional' });

export default Layout;
