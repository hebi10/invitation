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
  if (theme === 'romantic') return (
    <section className={`${styles.cover} ${styles.photographic} ${!imageUrl ? styles.withoutPhoto : ''}`} aria-labelledby={titleId}>
      {photo}
      <div className={styles.photoCopy}>
        <p className={styles.conceptLabel}>WEDDING INVITATION</p>
        <h1 data-wedding-motion="copy" id={titleId} className={styles.names}>{names}</h1>
        <p className={styles.conceptIntroduction}>서로의 하루가 되어<br />이제 평생을 함께하려 합니다.</p>
      </div>
      <div className={styles.photoMeta}>{date}<p className={styles.venue} data-wedding-motion="copy">{page.venue}</p></div>
    </section>
  );

  if (theme === 'emotional') return (
    <section className={`${styles.cover} ${styles.letter}`} aria-labelledby={titleId}>
      <p className={styles.conceptIntroduction}>평생을 함께하고 싶은<br />사람을 만났습니다.</p>
      <h1 data-wedding-motion="copy" id={titleId} className={styles.names}>{names}</h1>
      <p className={styles.letterTitle} data-wedding-motion="copy">소중한 날 함께해 주세요.</p>
      {photo ? <figure className={styles.letterPhoto}>{photo}</figure> : null}
      {date}<p className={styles.venue} data-wedding-motion="copy">{page.venue}</p>
    </section>
  );

  if (theme === 'classic-r') return (
    <section className={`${styles.cover} ${styles.editorial}`} aria-labelledby={titleId}>
      <p className={styles.conceptLabel}>WEDDING INVITATION</p>
      <h1 data-wedding-motion="copy" id={titleId} className={styles.editorialNames}>{names}</h1>
      <p className={styles.conceptIntroduction}>서로의 오늘이 되어,<br />평생을 함께 걸어가려 합니다.</p>
      {photo ? <div className={styles.editorialPicture}><div className={styles.editorialPhoto}>{photo}</div><span className={styles.editorialRail} aria-hidden="true">OUR SPECIAL DAY</span></div> : null}
      <div className={styles.editorialMeta}>{date}<p className={styles.venue} data-wedding-motion="copy">{page.venue}</p></div>
    </section>
  );

  if (theme === 'gyeol') return (
    <section className={`${styles.cover} ${styles.traditional}`} aria-labelledby={titleId}>
      <div className={styles.classicOrnament} aria-hidden="true" />
      <p className={styles.conceptLabel}>WEDDING INVITATION</p>
      <div className={styles.traditionalTitle}>
        <h1 data-wedding-motion="copy" id={titleId} className={styles.names}>{names}</h1>
        <p className={styles.conceptIntroduction}>소중한 날에 귀한 걸음으로 함께해 주세요.</p>
      </div>
      {photo ? <figure className={styles.traditionalPhoto}>{photo}</figure> : null}
      {date}<p className={styles.venue} data-wedding-motion="copy">{page.venue}</p>
      <div className={styles.families}>
        {[page.couple.groom, page.couple.bride].map((person, index) => {
          const parents = [person.father?.name, person.mother?.name].filter(Boolean).join(' · ');
          return parents ? <p key={index}>{parents}의 {person.order || (index === 0 ? '아들' : '딸')} <strong>{person.name}</strong></p> : null;
        })}
      </div>
    </section>
  );

  return (
    <section className={`${styles.cover} ${styles.basic}`} aria-labelledby={titleId}>
      <p className={styles.invitationLabel}>WEDDING INVITATION</p>
      <p className={styles.salutation}>소중한 당신께</p>
      <h1 data-wedding-motion="copy" id={titleId} className={styles.names}>{names}</h1>
      <p className={styles.introduction}>둘이 하나가 되는 특별한 날<br />함께해 주세요.</p>
      {photo ? <figure className={styles.basicPhoto}>{photo}</figure> : null}
      {date}
      <p className={styles.venue} data-wedding-motion="copy">{page.venue}</p>
    </section>
  );
}
