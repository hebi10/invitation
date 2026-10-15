import type { InvitationPage } from '@/types/invitationPage';
import styles from './Vow.module.css';

export default function VowCover({ page, time, titleId, showNames = true }: {
  page: InvitationPage;
  time?: string;
  titleId: string;
  showNames?: boolean;
}) {
  return (
    <section className={styles.cover} aria-labelledby={titleId}>
      <p className={styles.promise}>서로의 오늘을 아끼며,<br />함께할 내일을 약속합니다.</p>
      {showNames ? <h1 id={titleId} className={styles.names}>
        <span>{page.groomName}</span>
        <span className={styles.join}>그리고</span>
        <span>{page.brideName}</span>
      </h1> : null}
      <div className={styles.schedule}>
        <p>{page.date}</p>
        {time ? <p>{time}</p> : null}
        <p className={styles.venue}>{page.venue}</p>
      </div>
    </section>
  );
}
