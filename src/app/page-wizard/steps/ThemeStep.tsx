import { useEffect } from 'react';

import styles from '../page.module.css';
import {
  buildInvitationVariants,
  createInvitationVariantAvailability,
  getAvailableInvitationVariantKeys,
  type InvitationVariantKey,
} from '@/lib/invitationVariants';
import { INVITATION_THEME_KEYS } from '@/lib/invitationThemes';
import { getSelectableFirstBirthdayThemeKeys } from '@/app/_components/firstBirthday/firstBirthdayThemes';
import {
  GENERAL_EVENT_DEFAULT_THEME,
  GENERAL_EVENT_THEME_KEYS,
  getGeneralEventTheme,
  normalizeGeneralEventThemeKey,
} from '@/app/_components/generalEvent/generalEventThemes';
import { OPENING_THEME_KEYS } from '@/app/_components/opening/openingThemes';
import {
  getProductTierDescription,
  getProductTierLabel,
  getThemeDescription,
  getThemeLabel,
  PRODUCT_TIERS,
  type ThemeStepProps,
} from '../pageWizardShared';

export default function ThemeStep({
  eventType,
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
  const selectedGeneralEventTheme = normalizeGeneralEventThemeKey(
    formState.pageData?.generalEventTheme,
    GENERAL_EVENT_DEFAULT_THEME
  );
  const selectableThemeKeys =
    eventType === 'first-birthday'
      ? getSelectableFirstBirthdayThemeKeys()
      : eventType === 'opening'
        ? [...OPENING_THEME_KEYS]
      : INVITATION_THEME_KEYS.filter(
            (theme) =>
              !theme.startsWith('first-birthday-') && !theme.startsWith('opening-')
          );

  useEffect(() => {
    if (isSelectionLocked && openChoicePanel) {
      setOpenChoicePanel(null);
    }
  }, [isSelectionLocked, openChoicePanel, setOpenChoicePanel]);

  if (eventType === 'general-event') {
    const selectedTheme = getGeneralEventTheme(selectedGeneralEventTheme);

    return (
      <div className={styles.fieldGrid}>
        <section className={styles.choiceSection}>
          <div className={styles.choiceSectionHeader}>
            <span className={styles.choiceSectionBadge}>디자인</span>
            <h3 className={styles.choiceSectionTitle}>행사 초대장 디자인 선택</h3>
            <p className={styles.choiceSectionText}>
              행사 성격에 맞는 공개 페이지 분위기를 고릅니다. 선택한 디자인은 기본 공개
              주소와 미리보기 route에 반영됩니다.
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
              <strong className={styles.choiceSelectValue}>{selectedTheme.label}</strong>
              <span className={styles.choiceSelectDescription}>
                {selectedTheme.key === 'general-event-vivid'
                  ? '파티, 네트워킹, 브랜드 이벤트에 어울리는 강한 색감의 구성입니다.'
                  : '기념식, 세미나, 공식 행사에 어울리는 차분한 구성입니다.'}
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
              {GENERAL_EVENT_THEME_KEYS.map((themeKey) => {
                const theme = getGeneralEventTheme(themeKey);
                const isActive = selectedGeneralEventTheme === themeKey;

                return (
                  <button
                    key={themeKey}
                    type="button"
                    aria-pressed={isActive}
                    className={`${styles.choiceCard} ${
                      isActive ? styles.choiceCardActive : ''
                    }`}
                    onClick={() => {
                      updateForm((draft) => {
                        if (draft.pageData) {
                          draft.pageData.generalEventTheme = themeKey;
                        }
                      });
                      setDefaultTheme(themeKey);
                      setOpenChoicePanel(null);
                    }}
                    disabled={isSelectionLocked}
                  >
                    <div className={styles.choiceCardTop}>
                      <span className={styles.choiceTag}>일반 행사</span>
                      {isActive ? (
                        <span className={styles.choiceSelectedBadge}>선택됨</span>
                      ) : null}
                    </div>
                    <h3 className={styles.choiceTitle}>{theme.label}</h3>
                    <p className={styles.choiceText}>
                      {themeKey === 'general-event-vivid'
                        ? '비비드 컬러와 파티 무드로 활기 있는 행사 초대장을 만듭니다.'
                        : '다크 톤과 골드 포인트로 격식 있는 행사 초대장을 만듭니다.'}
                    </p>
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
        </section>
      </div>
    );
  }

  return (
    <div className={styles.fieldGrid}>
      <section className={styles.choiceSection}>
        <div className={styles.choiceSectionHeader}>
          <span className={styles.choiceSectionBadge}>디자인</span>
          <h3 className={styles.choiceSectionTitle}>메인 디자인 선택</h3>
          <p className={styles.choiceSectionText}>
            {eventType === 'opening'
              ? '개업 초대장의 전체 분위기와 화면 구성을 고릅니다.'
              : eventType === 'first-birthday'
                ? '돌잔치 초대장의 전체 분위기와 화면 구성을 고릅니다.'
              : '청첩장의 전체 분위기와 화면 구성을 고릅니다.'}
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
            {selectableThemeKeys.map((theme) => {
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
