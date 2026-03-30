'use client';

import styles from './Guestbook.module.css';
import GuestbookThemed from './GuestbookThemed';

interface GuestbookProps {
  pageSlug: string;
}

export default function Guestbook({ pageSlug }: GuestbookProps) {
  return (
    <GuestbookThemed
      pageSlug={pageSlug}
      styles={styles}
      title="축하 메시지"
      subtitle="따뜻한 한마디를 남겨주세요."
      statusColors={{
        success: '#2d6a4f',
        error: '#c0392b',
      }}
      emptyIcon="♡"
    />
  );
}
