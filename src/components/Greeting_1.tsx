'use client';

import styles from './Greeting_1.module.css';

interface GreetingProps {
  message: string;
  author?: string;
}

export default function Greeting_1({ message, author }: GreetingProps) {
  const formatMessage = (text: string) => {
    return text
      .split('\n')
      .map((line, index) => (
        <span key={index} className={styles.messageLine}>
          {line}
          {index < text.split('\n').length - 1 && <br />}
        </span>
      ));
  };

  return (
    <section className={styles.container}>
      <div className={styles.card}>
        <div className={styles.messageWrapper}>
          <p className={styles.message}>
            {formatMessage(message)}
          </p>
        </div>
        {author && (
          <div className={styles.authorWrapper}>
            <p className={styles.author}>{author}</p>
          </div>
        )}
      </div>
    </section>
  );
}
