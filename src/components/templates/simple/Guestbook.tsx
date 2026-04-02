'use client';

import styles from './Guestbook.module.css';
import GuestbookThemed from '@/components/shared/GuestbookThemed';

interface GuestbookProps {
  pageSlug: string;
}

export default function Guestbook({ pageSlug }: GuestbookProps) {
  return (
    <GuestbookThemed
      pageSlug={pageSlug}
      styles={styles}
      title="축하 메시지"
      subtitle="정성 어린 메시지를 남겨주세요."
      statusColors={{
        success: '#2d6a4f',
        error: '#c0392b',
      }}
    />
  );
}
