import Link from 'next/link';

import styles from './page.module.css';

const primaryLinks = [
  {
    href: '/admin',
    title: '관리자 대시보드',
    description: '운영 화면으로 이동',
  },
  {
    href: '/page-wizard',
    title: '청첩장 만들기',
    description: '새 초안 시작',
  },
  {
    href: '/my-invitations',
    title: '사용자 페이지',
    description: '고객 화면 확인',
  },
];

const secondaryLinks = [
  {
    href: '/page-editor',
    label: '고객 편집기',
    external: false,
  },
  {
    href: 'https://kmong.com/gig/686626',
    label: '판매 페이지',
    external: true,
  },
  {
    href: 'https://hebi10.notion.site/Nextjs-Firebase-23f8b702e1b880e08f14fc063e851791?pvs=74',
    label: '작업 문서',
    external: true,
  },
];

function renderSecondaryLink(link: {
  href: string;
  label: string;
  external: boolean;
}) {
  if (link.external) {
    return (
      <a key={link.href} className={styles.secondaryLink} href={link.href} target="_blank" rel="noreferrer">
        {link.label}
      </a>
    );
  }

  return (
    <Link key={link.href} className={styles.secondaryLink} href={link.href}>
      {link.label}
    </Link>
  );
}

export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Mobile Invitation</span>
          <h1 className={styles.title}>모바일 청첩장 서비스</h1>
          <p className={styles.description}>
            청첩장을 만들고, 수정하고, 공개하고, 운영하는 흐름을 한 곳에서 관리합니다.
          </p>

          <div className={styles.keywordRow} aria-label="주요 기능">
            <span className={styles.keyword}>관리</span>
            <span className={styles.keyword}>생성</span>
            <span className={styles.keyword}>수정</span>
            <span className={styles.keyword}>공개</span>
          </div>

          <div className={styles.primaryGrid}>
            {primaryLinks.map((link) => (
              <Link key={link.href} className={styles.primaryCard} href={link.href}>
                <strong className={styles.cardTitle}>{link.title}</strong>
                <span className={styles.cardDescription}>{link.description}</span>
              </Link>
            ))}
          </div>

          <div className={styles.secondaryRow}>{secondaryLinks.map(renderSecondaryLink)}</div>
        </section>
      </div>
    </main>
  );
}
