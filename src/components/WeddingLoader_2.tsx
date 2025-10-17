import styles from './WeddingLoader_2.module.css';

interface WeddingLoaderProps {
  message?: string;
}

export default function WeddingLoader_2({ message = '로딩 중...' }: WeddingLoaderProps) {
  return (
    <div className={styles.container}>
      <div className={styles.loader}>
        <div className={styles.ring}></div>
        <div className={styles.ring}></div>
        <div className={styles.ring}></div>
      </div>
      <p className={styles.message}>{message}</p>
    </div>
  );
}
