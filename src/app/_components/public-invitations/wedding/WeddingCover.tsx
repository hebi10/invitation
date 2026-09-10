import type { InvitationPage } from '@/types/invitationPage';
import type { InvitationThemeKey } from '@/lib/invitationThemes';
import styles from './WeddingCover.module.css';

interface Props {
  theme: InvitationThemeKey;
  page: InvitationPage;
  imageUrl: string;
  time?: string;
  titleId?: string;
}

export default function WeddingCover({ theme, page, imageUrl, time, titleId = 'wedding-cover-title' }: Props) {
  const names = <><span>{page.groomName}</span><span aria-hidden="true" className={styles.join}>·</span><span>{page.brideName}</span></>;
  const date = <p className={styles.date} data-wedding-motion="copy"><span>{page.date}</span>{time ? <span>{time}</span> : null}</p>;
  const photo = imageUrl ? <img src={imageUrl} alt={`${page.displayName} 대표 사진`} className={styles.photo} data-wedding-motion="photo" loading="eager" decoding="async" /> : null;
  const family = [page.couple.groom, page.couple.bride].map((person, index) => {
    const parents = [person.father?.name, person.mother?.name].filter(Boolean).join(' · ');
    return <p key={index}>{parents ? <span>{parents}의 {person.order || (index === 0 ? '아들' : '딸')}</span> : <span>{index === 0 ? '신랑' : '신부'}</span>}<strong>{person.name}</strong></p>;
  });

  if (theme === 'romantic') return (
    <section className={`${styles.cover} ${styles.photographic} ${!imageUrl ? styles.withoutPhoto : ''}`} aria-labelledby={titleId}>
      {photo}
      <div className={styles.photoCopy}>
        <h1 data-wedding-motion="copy" id={titleId} className={styles.names}>{names}</h1>
        {date}<p className={styles.venue} data-wedding-motion="copy">{page.venue}</p>
      </div>
    </section>
  );

  if (theme === 'emotional') return (
    <section className={`${styles.cover} ${styles.letter}`} aria-labelledby={titleId}>
      <h1 data-wedding-motion="copy" id={titleId} className={styles.names}>{names}</h1>
      <p className={styles.letterTitle} data-wedding-motion="copy">소중한 당신께</p>
      {photo ? <figure className={styles.letterPhoto}>{photo}</figure> : null}
      {date}<p className={styles.venue} data-wedding-motion="copy">{page.venue}</p>
    </section>
  );

  if (theme === 'classic-r') return (
    <section className={`${styles.cover} ${styles.editorial}`} aria-labelledby={titleId}>
      <h1 data-wedding-motion="copy" id={titleId} className={styles.editorialNames}><span>{page.groomName}</span><span>{page.brideName}</span></h1>
      {photo ? <div className={styles.editorialPhoto}>{photo}</div> : null}
      <div className={styles.editorialMeta}>{date}<p className={styles.venue} data-wedding-motion="copy">{page.venue}</p></div>
    </section>
  );

  if (theme === 'gyeol') return (
    <section className={`${styles.cover} ${styles.traditional}`} aria-labelledby={titleId}>
      <div className={styles.traditionalTitle}>
        <p className={styles.vow}>두 사람의 인연,<br />하나의 약속</p>
        <h1 data-wedding-motion="copy" id={titleId} className={styles.verticalNames}><span>{page.groomName}</span><span>{page.brideName}</span></h1>
      </div>
      <div className={styles.families} data-wedding-motion="copy">{family}</div>
      {date}<p className={styles.venue} data-wedding-motion="copy">{page.venue}</p>
      {photo ? <figure className={styles.traditionalPhoto}>{photo}</figure> : null}
    </section>
  );

  return (
    <section className={`${styles.cover} ${styles.basic}`} aria-labelledby={titleId}>
      <h1 data-wedding-motion="copy" id={titleId} className={styles.names}>{names}</h1>
      {date}
      {photo ? <figure className={styles.basicPhoto}>{photo}</figure> : null}
      <p className={styles.venue} data-wedding-motion="copy">{page.venue}</p>
    </section>
  );
}
