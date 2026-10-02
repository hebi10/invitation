import Link from 'next/link';
import { SAMPLE_INVITATION_PATH } from '@/config/homeWeddingSample';

import ExperienceStartButton from './_components/ExperienceStartButton';
import { getHomeLinkRenderProps } from './_components/homeInteractionPolicy';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>모바일 청첩장</Link>
        <nav className={styles.headerActions} aria-label="서비스 메뉴">
          <Link href="/my-invitations">내 청첩장</Link>
          <Link href="/admin">운영 관리</Link>
        </nav>
      </header>
      <section className={styles.hero} aria-labelledby="service-title">
        <div className={styles.heroCopy}>
          <h1 id="service-title" className={styles.title}>소중한 날을 담아,<br />한 장의 청첩장으로.</h1>
          <p className={styles.description}>사진과 인사말, 예식 일정과 오시는 길을 담으세요. 링크로 전하고, 필요한 내용은 직접 수정할 수 있습니다.</p>
          <div className={styles.heroLinks}>
            <Link href={SAMPLE_INVITATION_PATH} className={styles.primaryLink}>청첩장 샘플 보기</Link>
            <a href="https://kmong.com/gig/686626" {...getHomeLinkRenderProps(true)} className={styles.secondaryLink}>제작 문의 <span>새 창</span></a>
          </div>
          <Link href="/my-invitations" className={styles.textLink}>이미 제작하셨나요? 내 청첩장 관리</Link>
          <ExperienceStartButton />
        </div>
        <div className={styles.preview}>
          <div className={styles.phone}>
            <div className={styles.phoneSpeaker} aria-hidden="true" />
            <iframe
              src={`${SAMPLE_INVITATION_PATH}?embed=1`}
              title="기본형 청첩장 · 화면 안에서 스크롤하며 둘러보기"
              className={styles.phoneScreen}
              aria-describedby="preview-instruction"
            />
          </div>
          <p id="preview-instruction" className={styles.previewCaption}>화면 안에서 스크롤하며 청첩장을 둘러보세요.</p>
          <a href={SAMPLE_INVITATION_PATH} target="_blank" rel="noopener noreferrer" className={styles.previewOpen}>청첩장 크게 보기 · 새 창</a>
        </div>
      </section>
      <section className={styles.workspace} aria-labelledby="workspace-title">
        <div className={styles.sectionIntro}>
          <h2 id="workspace-title">수정부터 운영까지 이어지는 청첩장</h2>
          <p>고객의 편집 화면과 공개 청첩장, 관리자 화면이 이렇게 연결됩니다.</p>
        </div>
        <ol className={styles.workflow}>
          <li>
            <h3>고객이 내용 수정</h3>
            <p>연결된 청첩장에서 이름과 예식 일정, 사진을 직접 수정합니다.</p>
          </li>
          <li>
            <h3>청첩장에서 결과 확인</h3>
            <p>저장한 내용이 반영된 청첩장을 확인하고 링크로 전합니다.</p>
          </li>
          <li>
            <h3>관리자가 운영</h3>
            <p>이벤트의 공개 상태와 고객 연결을 관리하고 방명록을 확인합니다.</p>
          </li>
        </ol>
      </section>
      <footer className={styles.footer}>
        <span>모바일 청첩장</span>
        <Link href="/login">로그인</Link>
      </footer>
    </main>
  );
}
