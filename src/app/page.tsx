import Link from 'next/link';

import styles from './page.module.css';

const dashboardLinks = [
  {
    href: '/admin',
    title: '관리자 대시보드',
    description: '운영 화면으로 이동',
    external: false,
  },
  {
    href: 'https://kmong.com/gig/686626',
    title: '판매 페이지',
    description: '상품 소개로 이동',
    external: true,
  },
  {
    href: '/my-invitations',
    title: '대시보드',
    description: '내 청첩장 확인',
    external: false,
  },
];

function renderDashboardLink(link: {
  href: string;
  title: string;
  description: string;
  external: boolean;
}) {
  if (link.external) {
    return (
      <a key={link.href} className={styles.primaryCard} href={link.href} target="_blank" rel="noreferrer">
        <strong className={styles.cardTitle}>{link.title}</strong>
        <span className={styles.cardDescription}>{link.description}</span>
      </a>
    );
  }

  return (
    <Link key={link.href} className={styles.primaryCard} href={link.href}>
      <strong className={styles.cardTitle}>{link.title}</strong>
      <span className={styles.cardDescription}>{link.description}</span>
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
            {dashboardLinks.map(renderDashboardLink)}
          </div>
        </section>
      </div>
    </main>
  );
}
