import Image from 'next/image';
import Link from 'next/link';

import ExperienceStartButton from './_components/ExperienceStartButton';
import { getHomeLinkRenderProps } from './_components/homeInteractionPolicy';

import styles from './page.module.css';

const salesHref = 'https://kmong.com/gig/686626';

const mainLinks = [
  {
    href: salesHref,
    label: '제작 문의',
    description: '상품 안내와 상담 · 새 창',
    variant: 'primary',
    external: true,
  },
  {
    href: '/kim-shinlang-na-sinbu/romantic/',
    label: '샘플 보기',
    description: '하객에게 보이는 실제 화면',
    variant: 'secondary',
    external: false,
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

const heroFacts = ['모바일 초대장 제작', '제작 후 직접 수정', '예식 후 기록 보관'] as const;

const operationSignals = [
  {
    label: '공개 상태',
    value: '공개 중',
  },
  {
    label: '방명록',
    value: '한곳에서 관리',
  },
  {
    label: '사진과 일정',
    value: '언제든 수정',
  },
] as const;

function MainActions({ className }: { className: string }) {
  return (
    <div className={className} aria-label="주요 바로가기">
      {mainLinks.map((link) =>
        link.external === true ? (
          <a
            key={link.href}
            href={link.href}
            {...getHomeLinkRenderProps(true)}
            className={styles.primaryLink}
          >
            <span>{link.label}</span>
            <small>{link.description}</small>
          </a>
        ) : (
          <Link key={link.href} href={link.href} className={styles.secondaryLink}>
            <span>{link.label}</span>
            <small>{link.description}</small>
          </Link>
        )
      )}
    </div>
  );
}

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="모바일 청첩장 홈">
          모바일 청첩장
        </Link>
        <nav className={styles.headerActions} aria-label="고객 메뉴">
          <Link href="/my-invitations">내 청첩장</Link>
          <Link href="/admin">관리자</Link>
        </nav>
      </header>

      <section className={styles.hero} aria-labelledby="service-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>초대장을 만드는 날부터, 추억을 남기는 날까지</p>
          <h1 id="service-title" className={styles.title}>
            예쁜 초대장을 넘어,
            <br />
            오래 관리되는 청첩장
          </h1>
          <p className={styles.description}>
            예식 정보와 사진을 담아 공유하고, 공개 상태와 방명록을 직접
            관리하세요. 제작 이후의 수정부터 예식 후 기록까지 한 흐름으로
            이어집니다.
          </p>
          <ul className={styles.heroFacts} aria-label="주요 기능">
            {heroFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>

          <MainActions className={styles.heroLinks} />
        </div>

        <aside className={styles.preview} aria-label="청첩장과 운영 화면 미리보기">
          <div className={styles.previewStage}>
            <div className={styles.phoneFrame}>
              <div className={styles.phoneTop} aria-hidden="true">
                <span />
              </div>
              <div className={styles.invitationScreen}>
                <Image
                  src="/images/intro_romantic.png"
                  alt="야외 웨딩 아치가 담긴 로맨틱 청첩장 표지"
                  width={460}
                  height={690}
                  priority
                  className={styles.previewImage}
                />
                <div className={styles.invitationCopy}>
                  <span>WEDDING INVITATION</span>
                  <strong>김신랑 · 나신부</strong>
                  <p>2026. 04. 14 · 오후 3시</p>
                  <small>더케이웨딩홀</small>
                </div>
              </div>
            </div>

            <div className={styles.operationPanel}>
              <div className={styles.operationHeader}>
                <div>
                  <span>제작 후 관리</span>
                  <strong>한 페이지에서 계속</strong>
                </div>
                <span className={styles.liveStatus}>
                  <i aria-hidden="true" /> 공개 중
                </span>
              </div>
              <dl className={styles.operationList}>
                {operationSignals.map((signal) => (
                  <div key={signal.label}>
                    <dt>{signal.label}</dt>
                    <dd>{signal.value}</dd>
                  </div>
                ))}
              </dl>
              <p>초대장을 전달한 뒤에도 필요한 내용을 바로 반영할 수 있습니다.</p>
            </div>
          </div>
          <div className={styles.previewText}>
            <strong>하객에게는 단정하게, 주인공에게는 관리하기 쉽게.</strong>
            <span>실제 샘플 화면과 제작 이후의 운영 흐름을 함께 보여드립니다.</span>
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

      <section className={styles.section} aria-labelledby="demo-title">
        <div className={styles.demoBand}>
          <div>
            <p className={styles.bandLabel}>운영 데모</p>
            <h2 id="demo-title">제작 이후의 관리 흐름도 직접 확인할 수 있습니다.</h2>
            <p>
              공용 체험 데이터로 관리자 화면부터 고객 연결까지 살펴보세요.
              개인정보 없이 안전하게 둘러볼 수 있습니다.
            </p>
          </div>
          <div className={styles.demoAction}>
            <ExperienceStartButton />
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="final-cta-title">
        <div className={styles.finalCta}>
          <div>
            <p>초대의 시작부터 예식 후 기록까지</p>
            <h2 id="final-cta-title">우리의 이야기가 오래 이어지는 청첩장을 준비하세요.</h2>
          </div>
          <MainActions className={styles.finalActions} />
        </div>
      </section>

      <footer className={styles.footer}>
        <span>모바일 청첩장</span>
        <nav aria-label="서비스 메뉴">
          <Link href="/my-invitations">내 청첩장</Link>
          <Link href="/admin">관리자</Link>
        </nav>
      </footer>
    </main>
  );
}
