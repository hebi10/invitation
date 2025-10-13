'use client';

import styles from './Greeting.module.css';

interface GreetingProps {
  message: string;
  author?: string;
}

export default function Greeting({ message, author }: GreetingProps) {
  // 메시지를 문장별로 나누어 더 자연스러운 줄바꿈 처리
  const formatMessage = (text: string) => {
    // <br> 태그를 먼저 \n으로 변환 (HTML 태그 지원)
    const normalizedText = text.replace(/<br\s*\/?>/gi, '\n');
    
    return normalizedText
      .split('\n')
      .map((line, index) => (
        <span key={index} className={styles.messageLine}>
          {line}
          {index < normalizedText.split('\n').length - 1 && <br />}
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
