'use client';

import styles from './Greeting.module.css';

interface GreetingProps {
  message: string;
  author?: string;
}

export default function Greeting({ message, author }: GreetingProps) {
  return (
    <section className={styles.container}>
      <p className={styles.message}>{message}</p>
      {author && <p className={styles.author}>- {author} -</p>}
    </section>
  );
}
