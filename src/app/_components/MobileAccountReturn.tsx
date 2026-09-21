import { MOBILE_ACCOUNT_RETURN_URL } from '@/lib/mobileAccountReturn';
import styles from '@/app/my-invitations/page.module.css';

export default function MobileAccountReturn({ passwordReset = false }: { passwordReset?: boolean }) {
  return (
    <section className={styles.authIntro} aria-label="앱으로 돌아가기 안내">
      <p className={styles.description}>
        {passwordReset
          ? '받은 이메일의 링크에서 비밀번호 변경을 마친 뒤 앱으로 돌아가 새 비밀번호로 로그인해 주세요.'
          : '이메일로 가입하셨다면 받은 편지함의 인증 링크를 먼저 확인해 주세요. 가입과 인증을 마친 뒤 앱에서 같은 계정으로 로그인하면 제작을 이어갈 수 있습니다.'}
      </p>
      <div className={styles.heroActions}>
        <a className={styles.backLink} href={MOBILE_ACCOUNT_RETURN_URL}>앱으로 돌아가 로그인</a>
      </div>
      <p className={styles.description}>앱이 열리지 않으면 브라우저를 닫거나 앱 전환으로 모바일 청첩장 앱에 돌아가 주세요.</p>
    </section>
  );
}
