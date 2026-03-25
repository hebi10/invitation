'use client';

import styles from './Guestbook_5.module.css';

import GuestbookThemed from './GuestbookThemed';

interface GuestbookProps {
  pageSlug: string;
}

export default function Guestbook_5({ pageSlug }: GuestbookProps) {
  return (
    <GuestbookThemed
      pageSlug={pageSlug}
      styles={styles}
      title="방명록"
      subtitle="Guestbook"
      statusColors={{
        success: '#7b6518',
        error: '#9f2d2d',
      }}
    />
  );
}
