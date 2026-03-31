'use client';

import styles from './Guestbook_2.module.css';
import GuestbookThemed from './GuestbookThemed';

interface GuestbookProps {
  pageId?: string;
  pageSlug?: string;
}

export default function Guestbook_2({ pageId, pageSlug }: GuestbookProps) {
  const resolvedPageSlug = pageSlug ?? pageId;

  if (!resolvedPageSlug) {
    return null;
  }

  return (
    <GuestbookThemed
      pageSlug={resolvedPageSlug}
      styles={styles}
      title="축하 메시지"
      subtitle="기쁜 마음을 편하게 남겨주세요."
      statusColors={{
        success: '#2d6a4f',
        error: '#c0392b',
      }}
    />
  );
}
