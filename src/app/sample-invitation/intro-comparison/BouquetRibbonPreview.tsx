import Image from 'next/image';
import styles from './AutomaticIntro.module.css';

const poster = '/images/wedding-intro/bouquet-ribbon.webp';
const animation = '/images/wedding-intro/bouquet-ribbon.gif';
export default function BouquetRibbonPreview() {
  return (
    <div className={styles.bouquet}>
      <Image
        data-bouquet-art
        src={animation}
        alt=""
        fill
        sizes="(min-width: 960px) 480px, 100vw"
        loading="eager"
        unoptimized
        onError={(event) => {
          if (event.currentTarget.getAttribute('src') === poster) event.currentTarget.hidden = true;
          else event.currentTarget.src = poster;
        }}
      />
    </div>
  );
}
