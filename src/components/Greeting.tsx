'use client';

import styles from './Greeting.module.css';

interface GreetingProps {
  message: string;
  author?: string;
}

export default function Greeting({ message, author }: GreetingProps) {
  // 메시지를 문장별로 나누어 더 자연스러운 줄바꿈 처리
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
      <div className={styles.messageWrapper}>
        <p className={styles.message}>
          {formatMessage(message)}
        </p>
      </div>
      {author && (
        <div className={styles.authorWrapper}>
          <p className={styles.author}>- {author} -</p>
        </div>
      )}
    </section>
  );
}
