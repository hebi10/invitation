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
  const photo = imageUrl ? <img src={imageUrl} alt={`${page.displayName} 대표 사진`} className={styles.photo} data-wedding-cover-photo data-wedding-motion="photo" loading="eager" decoding="async" /> : null;
  if (theme === 'romantic') return (
    <section className={`${styles.cover} ${styles.photographic} ${!imageUrl ? styles.withoutPhoto : ''}`} aria-labelledby={titleId}>
      {photo}
      <p className={styles.photoEyebrow}>WEDDING INVITATION</p>
      <div className={styles.photoCopy}>
        <h1 data-wedding-motion="copy" id={titleId} className={styles.names}>
          <span>{page.groomName}</span><span aria-hidden="true" className={styles.join}>&amp;</span><span>{page.brideName}</span>
        </h1>
        <div className={styles.photoMeta}>{date}<p className={styles.venue} data-wedding-motion="copy">{page.venue}</p></div>
      </div>
    </section>
  );

  if (theme === 'emotional') return (
    <section className={`${styles.cover} ${styles.letter}`} aria-labelledby={titleId}>
      <div className={styles.letterSprig} aria-hidden="true" />
      <p className={styles.letterEyebrow}>WEDDING INVITATION</p>
      <h1 data-wedding-motion="copy" id={titleId} className={styles.names}>{names}</h1>
      <div className={styles.letterMessage}>
        <p className={styles.conceptIntroduction}>평생을 함께하고 싶은<br />사람을 만났습니다.</p>
      </div>
      {photo ? <figure className={styles.letterPhoto}>{photo}</figure> : null}
      {date}<p className={styles.venue} data-wedding-motion="copy">{page.venue}</p>
    </section>
  );

  if (theme === 'classic-r') return (
    <section className={`${styles.cover} ${styles.editorial}`} aria-labelledby={titleId}>
      <div className={styles.editorialHeading}><p>WEDDING<br />INVITATION</p><span>{page.weddingDateTime.year}</span></div>
      <div className={`${styles.editorialLayout} ${!photo ? styles.editorialWithoutPhoto : ''}`}>
        {photo ? <figure className={styles.editorialPhoto}>{photo}</figure> : null}
        <div className={styles.editorialText}>
          <p className={styles.editorialKicker}>OUR SPECIAL DAY</p>
          <h1 data-wedding-motion="copy" id={titleId} className={styles.editorialNames}>
            <span>{page.groomName}</span><span aria-hidden="true" className={styles.join}>×</span><span>{page.brideName}</span>
          </h1>
          <div className={styles.editorialMeta}>
            <p className={styles.editorialDateNumber}>{String(page.weddingDateTime.month + 1).padStart(2, '0')}.{String(page.weddingDateTime.day).padStart(2, '0')}</p>
            {date}<p className={styles.venue} data-wedding-motion="copy">{page.venue}</p>
          </div>
        </div>
      </div>
    </section>
  );

  if (theme === 'gyeol') return (
    <section className={`${styles.cover} ${styles.traditional}`} aria-labelledby={titleId}>
      <div className={styles.traditionalFrame}>
        <p className={styles.traditionalEyebrow}>WEDDING INVITATION</p>
        <div className={styles.traditionalMonogram} aria-hidden="true">
          {[page.groomName, page.brideName].map((name) => Array.from(name.trim())[0]).filter(Boolean).join(' · ')}
        </div>
        <div className={styles.traditionalTitle}>
          <h1 data-wedding-motion="copy" id={titleId} className={styles.names}>{names}</h1>
          <p className={styles.conceptIntroduction}>소중한 날에 귀한 걸음으로 함께해 주세요.</p>
        </div>
        {photo ? <figure className={styles.traditionalPhoto}>{photo}</figure> : null}
        {date}<p className={styles.venue} data-wedding-motion="copy">{page.venue}</p>
      </div>
    </section>
  );

  return (
    <section className={`${styles.cover} ${styles.basic}`} aria-labelledby={titleId}>
      <p className={styles.basicEyebrow}>WEDDING INVITATION</p>
      <h1 data-wedding-motion="copy" id={titleId} className={styles.names}>{names}</h1>
      <p className={styles.introduction}>둘이 하나가 되는 특별한 날<br />함께해 주세요.</p>
      {photo ? <figure className={styles.basicPhoto}>{photo}</figure> : null}
      {date}
      <p className={styles.venue} data-wedding-motion="copy">{page.venue}</p>
    </section>
  );
}
