import styles from './page.module.css';

export default function MemoryPageNotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.stateCard}>
          <h1 className={styles.stateTitle}>추억 페이지를 찾을 수 없습니다.</h1>
          <p className={styles.stateDescription}>아직 공개되지 않았거나 주소가 잘못되었습니다. 관리자에서 생성 후 공개하면 같은 주소에서 다시 확인할 수 있습니다.</p>
        </div>
      </div>
    </main>
  );
}
