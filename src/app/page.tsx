import Image from 'next/image';
import Link from 'next/link';

import styles from './page.module.css';

const mainLinks = [
  {
    href: '/shin-minje-kim-hyunji/romantic/',
    label: '샘플 보기',
    description: '하객에게 보이는 실제 화면',
    variant: 'primary',
  },
  {
    href: 'https://kmong.com/gig/686626',
    label: '제작 문의',
    description: '상품 안내와 상담',
    variant: 'secondary',
    external: true,
  },
  {
    href: '/my-invitations',
    label: '내 청첩장',
    description: '보유한 이벤트 관리',
    variant: 'secondary',
  },
  {
    href: '/admin',
    label: '관리자 페이지',
    description: '운영 도구 열기',
    variant: 'secondary',
  },
] as const;

const serviceSteps = [
  {
    title: '정보 입력',
    description: '예식 날짜, 장소, 인사말, 사진을 순서대로 채워 청첩장을 준비합니다.',
  },
  {
    title: '모바일 공유',
    description: '완성된 청첩장은 링크 하나로 가족과 하객에게 바로 전달할 수 있습니다.',
  },
  {
    title: '운영 관리',
    description: '공개 여부, 노출 기간, 방명록, 이미지를 필요할 때마다 관리합니다.',
  },
  {
    title: '추억 보관',
    description: '예식이 끝난 뒤에도 사진과 기록을 모아 추억 페이지로 이어갈 수 있습니다.',
  },
] as const;

const includedFeatures = [
  '예식 일정과 장소 안내',
  '사진 갤러리와 인사말',
  '계좌와 연락처 정보',
  '지도, 공유, 방명록',
  '공개 기간과 비밀번호 관리',
  '예식 후 추억 페이지',
] as const;

const heroFacts = ['청첩장 제작', '공개 상태 관리', '방명록과 사진 관리'] as const;

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span className={styles.brand}>모바일 청첩장</span>
      </header>

      <section className={styles.hero} aria-labelledby="service-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>초대부터 예식 후 기록까지</p>
          <h1 id="service-title" className={styles.title}>
            모바일 청첩장 제작과 운영을 한곳에서
          </h1>
          <p className={styles.description}>
            예식 정보, 사진, 지도, 방명록을 입력하고 공개 상태와 노출 기간을
            관리합니다. 제작 후에도 수정과 공유, 추억 페이지 관리까지 같은
            흐름에서 이어갈 수 있습니다.
          </p>
          <ul className={styles.heroFacts} aria-label="주요 기능">
            {heroFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>

          <div className={styles.heroLinks} aria-label="바로가기">
            {mainLinks.map((link) => (
              link.href !== '/admin' ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className={
                    link.variant === 'primary'
                      ? styles.primaryLink
                      : styles.secondaryLink
                  }
                >
                  <span>{link.label}</span>
                  <small>{link.description}</small>
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={styles.secondaryLink}
                >
                  <span>{link.label}</span>
                  <small>{link.description}</small>
                </Link>
              )
            ))}
          </div>
        </div>

        <aside className={styles.preview} aria-label="청첩장 미리보기">
          <div className={styles.phoneFrame}>
            <Image
              src="/images/intro_romantic.png"
              alt="모바일 청첩장 샘플 이미지"
              width={460}
              height={690}
              priority
              className={styles.previewImage}
            />
          </div>
          <div className={styles.previewText}>
            <strong>하객 화면은 모바일 기준으로 정리됩니다.</strong>
            <span>사진, 일정, 장소, 방명록을 한 흐름으로 확인할 수 있습니다.</span>
          </div>
        </aside>
      </section>

      <section className={styles.section} aria-labelledby="flow-title">
        <div className={styles.sectionHeader}>
          <p>서비스 흐름</p>
          <h2 id="flow-title">처음 만드는 순간부터 예식 후 기록까지 이어집니다.</h2>
        </div>
        <ol className={styles.stepList}>
          {serviceSteps.map((step, index) => (
            <li key={step.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{step.title}</strong>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="features-title">
        <div className={styles.featureBand}>
          <div>
            <p className={styles.bandLabel}>포함 기능</p>
            <h2 id="features-title">청첩장 운영에 필요한 요소를 한 번에 다룹니다.</h2>
          </div>
          <ul className={styles.featureList}>
            {includedFeatures.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
