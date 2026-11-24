import Image from 'next/image';
import styles from './PhotoDevelopmentPreview.module.css';

export default function PhotoDevelopmentPreview({ photoSrc }: { photoSrc: string }) {
  return (
    <div className={styles.print} data-portrait-scene>
      <Image src={photoSrc} alt="" fill sizes="(min-width: 960px) 480px, 100vw" loading="eager" />
    </div>
  );
}
