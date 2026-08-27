import styles from './InvitationPoster.module.css';

type InvitationPosterProps = {
  eyebrow?: string;
  title: string;
  dateLabel: string;
  locationLabel?: string;
  tone?: string;
};

export function InvitationPoster({
  eyebrow,
  title,
  dateLabel,
  locationLabel,
  tone,
}: InvitationPosterProps) {
  return (
    <section aria-label={title + ' 초대 정보'} className={styles.poster} data-tone={tone}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <p className={styles.date}>{dateLabel}</p>
      <h1>{title}</h1>
      {locationLabel ? <p className={styles.location}>{locationLabel}</p> : null}
    </section>
  );
}
