import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import WeddingCover from '@/app/_components/public-invitations/wedding/WeddingCover';
import { sampleWeddingPage, SAMPLE_WEDDING_COVER } from '@/config/homeWeddingSample';
import { useDialogLayer } from '@/hooks/useDialogLayer';
import type { InvitationThemeKey } from '@/types/invitationPage';
import WeddingWizardPreview from '../WeddingWizardPreview';
import themeStyles from './ThemeStep.module.css';

import styles from '../page.module.css';
import {
  buildInvitationVariants,
  createInvitationVariantAvailability,
  getAvailableInvitationVariantKeys,
  type InvitationVariantKey,
} from '@/lib/invitationVariants';
import {
  GENERAL_EVENT_DEFAULT_THEME,
  getGeneralEventTheme,
  type GeneralEventThemeKey,
  normalizeGeneralEventThemeKey,
} from '@/app/_components/generalEvent/generalEventThemes';
import {
  getProductTierDescription,
  getProductTierLabel,
  getThemeDescription,
  getThemeLabel,
  PRODUCT_TIERS,
  type ThemeStepProps,
} from '../pageWizardShared';
import { getSelectableThemeKeysForEventType } from '../pageWizardEventConfig';

function ThemePreview({ theme, label }: { theme: string; label: string }) {
  return (
    <div className={styles.themePreview} data-theme-preview={theme} aria-hidden="true">
      <span className={styles.themePreviewKicker}>디자인 미리보기</span>
      <span className={styles.themePreviewTitle}>{label}</span>
      <span className={styles.themePreviewRule} />
    </div>
  );
}

function WeddingThemeChoices({
  formState, updateForm, defaultTheme, setDefaultTheme, isSelectionLocked,
}: Pick<ThemeStepProps, 'formState' | 'updateForm' | 'defaultTheme' | 'setDefaultTheme' | 'isSelectionLocked'>) {
  const [previewTheme, setPreviewTheme] = useState<InvitationThemeKey | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogLayer(dialogRef, { open: previewTheme !== null, onClose: () => setPreviewTheme(null) });
  const themes = getSelectableThemeKeysForEventType('wedding');

  const selectTheme = (theme: InvitationThemeKey) => {
    if (isSelectionLocked) return;
    setDefaultTheme(theme);
    if (theme === defaultTheme) return;
    updateForm((draft) => {
      const currentKeys = getAvailableInvitationVariantKeys(draft.variants);
      draft.variants = buildInvitationVariants(draft.slug, draft.displayName, {
        availability: createInvitationVariantAvailability(
          (currentKeys.length > 1 ? currentKeys : [theme]) as InvitationVariantKey[],
        ),
      });
    });
  };

  return (
    <section className={styles.choiceSection}>
      <div className={styles.choiceSectionHeader}>
        <h3 className={styles.choiceSectionTitle}>청첩장 디자인</h3>
        <p className={styles.choiceSectionText}>
          같은 예시 사진과 이름으로 실제 표지를 비교해 보세요. ‘크게 보기’에서는 입력한 내용으로 전체 청첩장을 볼 수 있습니다.
        </p>
        <p className={styles.fieldHint}>
          {isSelectionLocked
            ? '첫 저장이 완료되어 디자인과 서비스는 이 화면에서 변경할 수 없습니다. 현재 디자인의 미리보기는 계속 사용할 수 있습니다.'
            : '디자인과 서비스는 첫 저장 후 이 화면에서 바꿀 수 없습니다. 저장 전에 확인해 주세요.'}
        </p>
      </div>
      <div className={themeStyles.grid}>
        {themes.filter((theme) => !isSelectionLocked || theme === defaultTheme).map((theme) => {
          const selected = theme === defaultTheme;
          const label = getThemeLabel(theme);
          return (
            <article key={theme} className={themeStyles.card} data-selected={selected}>
              <div className={themeStyles.coverWindow} aria-hidden="true">
                <div className={themeStyles.coverCanvas} data-theme={theme}>
                  <WeddingCover theme={theme} page={sampleWeddingPage} imageUrl={SAMPLE_WEDDING_COVER} time="오후 2:00" titleId={'wizard-theme-cover-' + theme} />
                </div>
              </div>
              <div className={themeStyles.details}>
                <h4 className={themeStyles.title}>{label}{selected ? <span>선택됨</span> : null}</h4>
                <p className={themeStyles.description}>{getThemeDescription(theme)}</p>
                <div className={themeStyles.actions}>
                  <button type="button" className={themeStyles.previewButton} onClick={() => setPreviewTheme(theme)} aria-label={label + ' 크게 보기'}>크게 보기</button>
                  <button type="button" className={themeStyles.selectButton} aria-pressed={selected} disabled={isSelectionLocked} onClick={() => selectTheme(theme)} aria-label={label + ' 선택'}>{selected ? '선택됨' : '선택'}</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {previewTheme && createPortal(
        <div className={themeStyles.backdrop} onClick={(event) => { if (event.target === event.currentTarget) setPreviewTheme(null); }}>
          <div className={themeStyles.dialog} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="wizard-theme-dialog-title">
            <div className={themeStyles.dialogHeader}>
              <h3 id="wizard-theme-dialog-title">{getThemeLabel(previewTheme)} 미리보기</h3>
              <button type="button" onClick={() => setPreviewTheme(null)} data-dialog-initial-focus>닫기</button>
            </div>
            <p className={themeStyles.dialogHint}>미리보기를 열어도 선택한 디자인은 바뀌지 않습니다.</p>
            <WeddingWizardPreview formState={formState} theme={previewTheme} />
          </div>
        </div>, document.body,
      )}
    </section>
  );
}

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
  const selectableThemeKeys = getSelectableThemeKeysForEventType(eventType);

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
            <div className={`${styles.choiceOptions} ${styles.themeOptions}`}>
              {(selectableThemeKeys as GeneralEventThemeKey[]).map((themeKey) => {
                const theme = getGeneralEventTheme(themeKey);
                const isActive = selectedGeneralEventTheme === themeKey;

                return (
                  <button
                    key={themeKey}
                    type="button"
                    aria-pressed={isActive}
                    className={`${styles.choiceCard} ${styles.themeCard} ${
                      isActive ? styles.choiceCardActive : ''
                    }`}
                    onClick={() => {
                      setDefaultTheme(themeKey);
                      if (!isActive) {
                        updateForm((draft) => {
                          if (draft.pageData) {
                            draft.pageData.generalEventTheme = themeKey;
                          }
                        });
                      }
                      setOpenChoicePanel(null);
                    }}
                    disabled={isSelectionLocked}
                  >
                    <ThemePreview theme={themeKey} label={theme.label} />
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
      {eventType === 'wedding' ? (
        <WeddingThemeChoices formState={formState} updateForm={updateForm} defaultTheme={defaultTheme} setDefaultTheme={setDefaultTheme} isSelectionLocked={isSelectionLocked} />
      ) : (
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
          <div className={`${styles.choiceOptions} ${styles.themeOptions}`}>
            {selectableThemeKeys.map((theme) => {
              const isActive = defaultTheme === theme;

              return (
                <button
                  key={theme}
                  type="button"
                  aria-pressed={isActive}
                  className={`${styles.choiceCard} ${styles.themeCard} ${
                    isActive ? styles.choiceCardActive : ''
                  }`}
                  onClick={() => {
                    setDefaultTheme(theme);
                    if (!isActive) {
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
                    }
                    setOpenChoicePanel(null);
                  }}
                  disabled={isSelectionLocked}
                >
                  <ThemePreview theme={theme} label={getThemeLabel(theme)} />
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
      )}

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
