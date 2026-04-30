'use client';

import GuestbookThemed from '@/components/sections/Guestbook/GuestbookThemed';

import styles from './BirthdayGuestbook.module.css';

export default function BirthdayGuestbook({ pageSlug }: { pageSlug: string }) {
  return (
    <GuestbookThemed
      pageSlug={pageSlug}
      styles={styles}
      title="축하 메시지"
      subtitle="생일을 축하하는 따뜻한 한마디를 남겨주세요."
      statusColors={{
        success: '#2f6f66',
        error: '#b84a62',
      }}
    />
  );
}
