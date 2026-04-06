import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import type { InvitationProductTier, InvitationThemeKey } from '@/types/invitationPage';

import styles from '../page.module.css';
import {
  getProductTierDescription,
  getProductTierLabel,
  getThemeDescription,
  getThemeLabel,
  PRODUCT_TIERS,
  type ThemeStepProps,
} from '../pageWizardShared';

export default function ThemeStep({
  formState,
  defaultTheme,
  setDefaultTheme,
  openChoicePanel,
  toggleChoicePanel,
  onProductTierChange,
  setOpenChoicePanel,
}: ThemeStepProps) {
  return (
    <div className={styles.fieldGrid}>
      <section className={styles.choiceSection}>
        <div className={styles.choiceSectionHeader}>
          <span className={styles.choiceSectionBadge}>디자인</span>
          <h3 className={styles.choiceSectionTitle}>메인 디자인 선택</h3>
          <p className={styles.choiceSectionText}>
            청첩장의 전체 분위기와 화면 구성을 고릅니다.
          </p>
        </div>
        <button
          type="button"
          className={`${styles.choiceSelectButton} ${
            openChoicePanel === 'theme' ? styles.choiceSelectButtonActive : ''
          }`}
          aria-expanded={openChoicePanel === 'theme'}
          onClick={() => toggleChoicePanel('theme')}
        >
          <div className={styles.choiceSelectMeta}>
            <span className={styles.choiceSelectLabel}>현재 디자인</span>
            <strong className={styles.choiceSelectValue}>
              {getThemeLabel(defaultTheme)}
            </strong>
            <span className={styles.choiceSelectDescription}>
              {getThemeDescription(defaultTheme)}
            </span>
          </div>
          <span className={styles.choiceSelectArrow}>
            <span className={styles.choiceSelectActionLabel}>
              {openChoicePanel === 'theme' ? '목록 접기' : '옵션 펼치기'}
            </span>
            <span
              className={`${styles.choiceChevron} ${
                openChoicePanel === 'theme' ? styles.choiceChevronOpen : ''
              }`}
              aria-hidden="true"
            >
              ▾
            </span>
          </span>
        </button>
        {openChoicePanel === 'theme' ? (
          <div className={styles.choiceOptions}>
            {(['emotional', 'simple'] as const).map((theme) => {
              const isActive = defaultTheme === theme;

              return (
                <button
                  key={theme}
                  type="button"
                  aria-pressed={isActive}
                  className={`${styles.choiceCard} ${
                    isActive ? styles.choiceCardActive : ''
                  }`}
                  onClick={() => {
                    setDefaultTheme(theme);
                    setOpenChoicePanel(null);
                  }}
                >
                  <div className={styles.choiceCardTop}>
                    <span className={styles.choiceTag}>디자인</span>
                    {isActive ? (
                      <span className={styles.choiceSelectedBadge}>선택됨</span>
                    ) : null}
                  </div>
                  <h3 className={styles.choiceTitle}>{getThemeLabel(theme)}</h3>
                  <p className={styles.choiceText}>{getThemeDescription(theme)}</p>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className={styles.choiceSection}>
        <div className={styles.choiceSectionHeader}>
          <span className={styles.choiceSectionBadge}>서비스</span>
          <h3 className={styles.choiceSectionTitle}>서비스 구성 선택</h3>
          <p className={styles.choiceSectionText}>
            갤러리 수, 공유 방식, 방명록 제공 범위를 고릅니다.
          </p>
        </div>
        <button
          type="button"
          className={`${styles.choiceSelectButton} ${
            openChoicePanel === 'tier' ? styles.choiceSelectButtonActive : ''
          }`}
          aria-expanded={openChoicePanel === 'tier'}
          onClick={() => toggleChoicePanel('tier')}
        >
          <div className={styles.choiceSelectMeta}>
            <span className={styles.choiceSelectLabel}>현재 서비스</span>
            <strong className={styles.choiceSelectValue}>
              {getProductTierLabel(formState.productTier ?? 'premium')}
            </strong>
            <span className={styles.choiceSelectDescription}>
              {getProductTierDescription(formState.productTier ?? 'premium')}
            </span>
          </div>
          <span className={styles.choiceSelectArrow}>
            <span className={styles.choiceSelectActionLabel}>
              {openChoicePanel === 'tier' ? '목록 접기' : '옵션 펼치기'}
            </span>
            <span
              className={`${styles.choiceChevron} ${
                openChoicePanel === 'tier' ? styles.choiceChevronOpen : ''
              }`}
              aria-hidden="true"
            >
              ▾
            </span>
          </span>
        </button>
        {openChoicePanel === 'tier' ? (
          <div className={styles.choiceOptions}>
            {PRODUCT_TIERS.map((tier) => {
              const isActive = formState.productTier === tier;

              return (
                <button
                  key={tier}
                  type="button"
                  aria-pressed={isActive}
                  className={`${styles.choiceCard} ${
                    isActive ? styles.choiceCardActive : ''
                  }`}
                  onClick={() => {
                    onProductTierChange(tier);
                    setOpenChoicePanel(null);
                  }}
                >
                  <div className={styles.choiceCardTop}>
                    <span className={styles.choiceTag}>서비스 플랜</span>
                    {isActive ? (
                      <span className={styles.choiceSelectedBadge}>선택됨</span>
                    ) : null}
                  </div>
                  <h3 className={styles.choiceTitle}>{getProductTierLabel(tier)}</h3>
                  <p className={styles.choiceText}>{getProductTierDescription(tier)}</p>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}
