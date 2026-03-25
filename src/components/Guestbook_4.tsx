'use client';

import styles from './Guestbook_4.module.css';

import GuestbookThemed from './GuestbookThemed';

interface GuestbookProps {
  pageSlug: string;
}

export default function Guestbook_4({ pageSlug }: GuestbookProps) {
  return (
    <GuestbookThemed
      pageSlug={pageSlug}
      styles={styles}
      title="Guestbook"
      subtitle="축하의 마음을 남겨 주세요"
      statusColors={{
        success: '#1f6b52',
        error: '#b22929',
      }}
      emptyIcon="✦"
    />
  );
}
