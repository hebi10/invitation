import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import WeddingKakaoShareButton from '@/app/_components/WeddingKakaoShareButton';
import { isWeddingPreviewThemeKey } from '@/lib/eventPreviewLinks';
import { getInvitationThemeLabel } from '@/lib/invitationThemes';
import { getServerInvitationPageBySlug } from '@/server/invitationPageServerService';

import { buildMobileInvitationShareModel } from '../../shareModel';
import styles from '../../share.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '카카오톡 카드 공유',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function MobileInvitationSharePage({
  params,
}: {
  params: Promise<{ slug: string; theme: string }>;
}) {
  const { slug, theme } = await params;
  if (!isWeddingPreviewThemeKey(theme)) notFound();
  const page = await getServerInvitationPageBySlug(slug, { includePrivate: false, sampleFallbackMode: 'never' });
  const share = page ? buildMobileInvitationShareModel(page, theme) : null;
  if (!share) notFound();

  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>카카오톡 카드 공유</p>
      <h1>{getInvitationThemeLabel(theme)}으로 전하는 초대</h1>
      <p className={styles.description}>카드를 확인하고 카카오톡에서 받는 사람을 선택해 주세요.</p>
      <section className={styles.card} aria-label="공유 카드 내용">
        {share.imageUrl ? (
          <Image src={share.imageUrl} alt="청첩장 공유 카드 대표 사진" width={1200} height={800} unoptimized className={styles.image} />
        ) : null}
        <div className={styles.content}>
          <h2>{share.title}</h2>
          <p>{share.description}</p>
        </div>
      </section>
      <WeddingKakaoShareButton
        title={share.title}
        description={share.description}
        imageUrl={share.imageUrl}
        fallbackImageUrl={share.fallbackImageUrl}
        shareUrl={share.publicPath}
        shareMode="card"
        variant="minimal"
      />
      {!share.imageUrl ? <p className={styles.description}>대표 사진이 없어 주소로 공유됩니다. 앱에서 공유 카드 사진을 설정하면 이미지 카드를 보낼 수 있습니다.</p> : null}
      <a href={share.publicPath} className={styles.link}>하객용 청첩장 확인</a>
      <p className={styles.description}>선택한 디자인의 공개 주소가 전달됩니다. 하객은 앱을 설치하지 않고 청첩장을 볼 수 있습니다.</p>
    </main>
  );
}
