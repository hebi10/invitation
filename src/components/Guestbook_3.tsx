'use client';

import styles from './Guestbook_3.module.css';
import GuestbookThemed from './GuestbookThemed';

interface GuestbookProps {
  pageSlug: string;
}

export default function Guestbook_3({ pageSlug }: GuestbookProps) {
  return (
    <GuestbookThemed
      pageSlug={pageSlug}
      styles={styles}
      title="축하 메시지"
      subtitle="별처럼 오래 남을 한마디를 들려주세요."
      statusColors={{
        success: '#d9f7ff',
        error: '#ff9f9f',
      }}
      emptyIcon="★"
    />
  );
}
