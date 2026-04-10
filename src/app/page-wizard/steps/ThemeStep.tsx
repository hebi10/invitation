import { useEffect } from 'react';

import styles from '../page.module.css';
import {
  buildInvitationVariants,
  createInvitationVariantAvailability,
  getAvailableInvitationVariantKeys,
  type InvitationVariantKey,
} from '@/lib/invitationVariants';
import { INVITATION_THEME_KEYS } from '@/lib/invitationThemes';
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
  updateForm,
  defaultTheme,
  setDefaultTheme,
  openChoicePanel,
  toggleChoicePanel,
  onProductTierChange,
  setOpenChoicePanel,
  isSelectionLocked,
}: ThemeStepProps) {
  useEffect(() => {
    if (isSelectionLocked && openChoicePanel) {
      setOpenChoicePanel(null);
    }
  }, [isSelectionLocked, openChoicePanel, setOpenChoicePanel]);

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
          onClick={() => {
            if (!isSelectionLocked) {
              toggleChoicePanel('theme');
            }
          }}
          disabled={isSelectionLocked}
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
            {INVITATION_THEME_KEYS.map((theme) => {
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
                    updateForm((draft) => {
                      const currentAvailableVariantKeys = getAvailableInvitationVariantKeys(
                        draft.variants
                      );
                      const nextAvailableVariantKeys =
                        currentAvailableVariantKeys.length > 1
                          ? currentAvailableVariantKeys
                          : [theme];

                      draft.variants = buildInvitationVariants(
                        draft.slug,
                        draft.displayName,
                        {
                          availability: createInvitationVariantAvailability(
                            nextAvailableVariantKeys as InvitationVariantKey[]
                          ),
                        }
                      );
                    });
                    setOpenChoicePanel(null);
                  }}
                  disabled={isSelectionLocked}
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

        {isSelectionLocked ? (
          <p className={styles.fieldHint}>
            변경을 원하시면 관리자에게 문의해주세요.
          </p>
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

        {isSelectionLocked ? (
          <p className={styles.fieldHint}>
            변경을 원하시면 관리자에게 문의해주세요.
          </p>
        ) : null}
      </section>
    </div>
  );
}
