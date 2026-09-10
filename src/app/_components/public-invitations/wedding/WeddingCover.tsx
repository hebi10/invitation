import type { InvitationPage } from '@/types/invitationPage';
import type { InvitationThemeKey } from '@/lib/invitationThemes';
import styles from './WeddingCover.module.css';

interface Props {
  theme: InvitationThemeKey;
  page: InvitationPage;
  imageUrl: string;
  time?: string;
}

export default function WeddingCover({ theme, page, imageUrl, time }: Props) {
  const names = <><span>{page.groomName}</span><span aria-hidden="true" className={styles.join}>·</span><span>{page.brideName}</span></>;
  const date = <p className={styles.date}>{page.date}{time ? ` · ${time}` : ''}</p>;
  const photo = imageUrl ? <img src={imageUrl} alt={`${page.displayName} 대표 사진`} className={styles.photo} loading="eager" decoding="async" /> : null;
  const family = [page.couple.groom, page.couple.bride].map((person, index) => {
    const parents = [person.father?.name, person.mother?.name].filter(Boolean).join(' · ');
    return <p key={index}>{parents ? <span>{parents}의 {person.order || (index === 0 ? '아들' : '딸')}</span> : <span>{index === 0 ? '신랑' : '신부'}</span>}<strong>{person.name}</strong></p>;
  });

  if (theme === 'romantic') return (
    <section className={`${styles.cover} ${styles.photographic} ${!imageUrl ? styles.withoutPhoto : ''}`} aria-labelledby="wedding-cover-title">
      {photo}
      <div className={styles.photoCopy}>
        <h1 id="wedding-cover-title" className={styles.names}>{names}</h1>
        {date}<p className={styles.venue}>{page.venue}</p>
      </div>
    </section>
  );

  if (theme === 'emotional') return (
    <section className={`${styles.cover} ${styles.letter}`} aria-labelledby="wedding-cover-title">
      <h1 id="wedding-cover-title" className={styles.names}>{names}</h1>
      <p className={styles.letterTitle}>소중한 당신께</p>
      {photo ? <figure className={styles.letterPhoto}>{photo}</figure> : null}
      {date}<p className={styles.venue}>{page.venue}</p>
    </section>
  );

  if (theme === 'classic-r') return (
    <section className={`${styles.cover} ${styles.editorial}`} aria-labelledby="wedding-cover-title">
      <h1 id="wedding-cover-title" className={styles.editorialNames}><span>{page.groomName}</span><span>{page.brideName}</span></h1>
      <div className={styles.editorialPhoto}>{photo}</div>
      <div className={styles.editorialMeta}>{date}<p className={styles.venue}>{page.venue}</p></div>
    </section>
  );

  if (theme === 'gyeol') return (
    <section className={`${styles.cover} ${styles.traditional}`} aria-labelledby="wedding-cover-title">
      <div className={styles.traditionalTitle}>
        <p className={styles.vow}>두 사람의 인연,<br />하나의 약속</p>
        <h1 id="wedding-cover-title" className={styles.verticalNames}><span>{page.groomName}</span><span>{page.brideName}</span></h1>
      </div>
      <div className={styles.families}>{family}</div>
      {date}<p className={styles.venue}>{page.venue}</p>
      {photo ? <figure className={styles.traditionalPhoto}>{photo}</figure> : null}
    </section>
  );

  return (
    <section className={`${styles.cover} ${styles.basic}`} aria-labelledby="wedding-cover-title">
      <h1 id="wedding-cover-title" className={styles.names}>{names}</h1>
      {date}
      {photo ? <figure className={styles.basicPhoto}>{photo}</figure> : null}
      <p className={styles.venue}>{page.venue}</p>
    </section>
  );
}
