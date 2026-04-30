import { useEffect } from 'react';

import {
  BIRTHDAY_THEME_KEYS,
  BIRTHDAY_THEME_PREVIEW_CANDIDATES,
  DEFAULT_BIRTHDAY_THEME,
  getBirthdayThemeDescription,
  getBirthdayThemeLabel,
  normalizeBirthdayThemeKey,
  type BirthdayThemeKey,
} from '@/app/_components/birthday/birthdayThemes';

import styles from '../page.module.css';
import {
  getProductTierDescription,
  getProductTierLabel,
  PRODUCT_TIERS,
  type ThemeStepProps,
} from '../pageWizardShared';

export default function BirthdayThemeStep({
  formState,
  updateForm,
  openChoicePanel,
  toggleChoicePanel,
  onProductTierChange,
  setOpenChoicePanel,
  setDefaultTheme,
  isSelectionLocked,
}: ThemeStepProps) {
  const selectedTheme = normalizeBirthdayThemeKey(
    formState.pageData?.birthdayTheme,
    DEFAULT_BIRTHDAY_THEME
  );

  useEffect(() => {
    if (isSelectionLocked && openChoicePanel) {
      setOpenChoicePanel(null);
    }
  }, [isSelectionLocked, openChoicePanel, setOpenChoicePanel]);

  const handleThemeSelect = (theme: BirthdayThemeKey) => {
    setDefaultTheme(theme);
    updateForm((draft) => {
      draft.pageData = {
        ...draft.pageData,
        birthdayTheme: theme,
      };
    });
    setOpenChoicePanel(null);
  };

  return (
    <div className={styles.fieldGrid}>
      <section className={styles.choiceSection}>
        <div className={styles.choiceSectionHeader}>
          <span className={styles.choiceSectionBadge}>생일 디자인</span>
          <h3 className={styles.choiceSectionTitle}>초대장 분위기 선택</h3>
          <p className={styles.choiceSectionText}>
            생일 공개 페이지에 적용할 전용 디자인을 선택합니다. 1차 운영 디자인은 미니멀과
            플로럴 두 가지입니다.
          </p>
        </div>
        <button
          type="button"
          className={`${styles.choiceSelectButton} ${
            openChoicePanel === 'theme' ? styles.choiceSelectButtonActive : ''
          }`}
          aria-expanded={openChoicePanel === 'theme'}
          onClick={() => {
            if (!isSelectionLocked) {
              toggleChoicePanel('theme');
            }
          }}
          disabled={isSelectionLocked}
        >
          <div className={styles.choiceSelectMeta}>
            <span className={styles.choiceSelectLabel}>현재 생일 디자인</span>
            <strong className={styles.choiceSelectValue}>
              {getBirthdayThemeLabel(selectedTheme)}
            </strong>
            <span className={styles.choiceSelectDescription}>
              {getBirthdayThemeDescription(selectedTheme)}
            </span>
          </div>
          <span className={styles.choiceSelectArrow}>
            <span
              className={`${styles.choiceChevron} ${
                openChoicePanel === 'theme' ? styles.choiceChevronOpen : ''
              }`}
              aria-hidden="true"
            >
              ↓
            </span>
          </span>
        </button>
        {openChoicePanel === 'theme' ? (
          <div className={styles.choiceOptions}>
            {BIRTHDAY_THEME_KEYS.map((theme) => {
              const isActive = selectedTheme === theme;

              return (
                <button
                  key={theme}
                  type="button"
                  aria-pressed={isActive}
                  className={`${styles.choiceCard} ${
                    isActive ? styles.choiceCardActive : ''
                  }`}
                  onClick={() => handleThemeSelect(theme)}
                  disabled={isSelectionLocked}
                >
                  <div className={styles.choiceCardTop}>
                    <span className={styles.choiceTag}>공개 운영</span>
                    {isActive ? (
                      <span className={styles.choiceSelectedBadge}>선택됨</span>
                    ) : null}
                  </div>
                  <h3 className={styles.choiceTitle}>{getBirthdayThemeLabel(theme)}</h3>
                  <p className={styles.choiceText}>{getBirthdayThemeDescription(theme)}</p>
                </button>
              );
            })}
          </div>
        ) : null}

        <p className={styles.fieldHint}>
          후속 후보: {BIRTHDAY_THEME_PREVIEW_CANDIDATES.join(', ')}
        </p>
        {isSelectionLocked ? (
          <p className={styles.fieldHint}>
            변경을 원하시면 관리자에게 문의해 주세요.
          </p>
        ) : null}
      </section>

      <section className={styles.choiceSection}>
        <div className={styles.choiceSectionHeader}>
          <span className={styles.choiceSectionBadge}>서비스</span>
          <h3 className={styles.choiceSectionTitle}>서비스 구성 선택</h3>
          <p className={styles.choiceSectionText}>
            사진 수, 음악, 방명록 같은 생일 초대장 운영 범위를 선택합니다.
          </p>
        </div>
        <button
          type="button"
          className={`${styles.choiceSelectButton} ${
            openChoicePanel === 'tier' ? styles.choiceSelectButtonActive : ''
          }`}
          aria-expanded={openChoicePanel === 'tier'}
          onClick={() => {
            if (!isSelectionLocked) {
              toggleChoicePanel('tier');
            }
          }}
          disabled={isSelectionLocked}
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
            <span
              className={`${styles.choiceChevron} ${
                openChoicePanel === 'tier' ? styles.choiceChevronOpen : ''
              }`}
              aria-hidden="true"
            >
              ↓
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
                  disabled={isSelectionLocked}
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
