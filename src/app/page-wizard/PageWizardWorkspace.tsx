'use client';

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type {
  StepValidation,
  SlugStepState,
  WizardStepKey,
} from './pageWizardData';
import type {
  WizardSection,
  WizardSectionId,
  WizardSectionValidation,
} from './pageWizardSections';
import {
  getWizardSaveStatusLabel,
  buildWizardReviewFacts,
  getWizardSectionStatus,
  hasMeaningfulInputForWizardStep,
  type WizardSaveStatus,
} from './pageWizardWorkspaceState';
import type { InvitationPageSeed } from '@/types/invitationPage';
import styles from './PageWizardWorkspace.module.css';

type PageWizardWorkspaceProps = {
  title: string;
  subtitle: string;
  sections: WizardSection[];
  activeSection: WizardSection;
  activeStepKey: WizardStepKey;
  getSectionValidation: (section: WizardSection) => WizardSectionValidation;
  getStepValidation: (stepKey: WizardStepKey) => StepValidation;
  formState: InvitationPageSeed;
  slugStepState: SlugStepState;
  interactedStepKeys: ReadonlySet<WizardStepKey>;
  hasPersistedData: boolean;
  saveStatus: WizardSaveStatus;
  lastSavedAt: Date | null;
  persistedPublished: boolean;
  notice: ReactNode;
  isSaving: boolean;
  published: boolean;
  previewStepKey: WizardStepKey | null;
  renderStepContent: (stepKey: WizardStepKey) => ReactNode;
  renderStepPreview: (stepKey: WizardStepKey) => ReactNode;
  onSelectSection: (sectionId: WizardSectionId) => void;
  onOpenPreview: (stepKey: WizardStepKey) => void;
  onClosePreview: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onFinalConfirm: () => void;
  onSave: () => void;
};

const DIRECTION_CONTRACT = `<!--
THESIS: 초대장 편집기는 장식 화면이 아니라 누락 없이 정보를 완성하는 작업 공간이다.
OWN-WORLD: 중립 배경, 먹색 글자, 파란 단일 강조, 시스템 고딕, 1px 구분선, 6~8px 제어 반경.
STORY: 현재 위치와 오류를 확인하고, 관련 정보를 입력하고, 필요할 때 미리본 뒤 저장한다.
FIRST VIEWPORT: 상단 작업 바, 왼쪽 목차, 중앙 입력, 하단 주요 동작.
FORM: Operate 모드의 2열 데스크톱·단일 열 모바일 편집 워크스페이스.
-->`;

export default function PageWizardWorkspace({
  title,
  subtitle,
  sections,
  activeSection,
  activeStepKey,
  getSectionValidation,
  getStepValidation,
  formState,
  slugStepState,
  interactedStepKeys,
  hasPersistedData,
  saveStatus,
  lastSavedAt,
  persistedPublished,
  notice,
  isSaving,
  published,
  previewStepKey,
  renderStepContent,
  renderStepPreview,
  onSelectSection,
  onOpenPreview,
  onClosePreview,
  onPrevious,
  onNext,
  onFinalConfirm,
  onSave,
}: PageWizardWorkspaceProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mobileNavTriggerRef = useRef<HTMLButtonElement | null>(null);
  const previewCloseRef = useRef<HTMLButtonElement | null>(null);
  const mobileNavCloseRef = useRef<HTMLButtonElement | null>(null);
  const activeSectionIndex = sections.findIndex(
    (section) => section.id === activeSection.id
  );
  const isFinalSection = activeSectionIndex === sections.length - 1;
  const activePreviewStep = useMemo(
    () => activeSection.steps.find((step) => Boolean(step.previewSection)) ?? null,
    [activeSection.steps]
  );
  const isDialogOpen = isMobileNavOpen || previewStepKey !== null;

  const closePreview = useCallback(() => {
    onClosePreview();
    requestAnimationFrame(() => previewTriggerRef.current?.focus());
  }, [onClosePreview]);

  const closeMobileNav = useCallback(() => {
    setIsMobileNavOpen(false);
    requestAnimationFrame(() => mobileNavTriggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!previewStepKey) {
      return;
    }

    previewCloseRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePreview();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closePreview, previewStepKey]);

  useEffect(() => {
    if (!isMobileNavOpen) {
      return;
    }

    mobileNavCloseRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMobileNav();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeMobileNav, isMobileNavOpen]);

  const handleSectionSelect = (sectionId: WizardSectionId) => {
    onSelectSection(sectionId);
    setIsMobileNavOpen(false);
  };

  const openPreview = (
    stepKey: WizardStepKey,
    trigger: HTMLButtonElement
  ) => {
    previewTriggerRef.current = trigger;
    onOpenPreview(stepKey);
  };

  const renderSectionButtons = () => sections.map((section, index) => {
    const validation = getSectionValidation(section);
    const isActive = section.id === activeSection.id;
    const hasMeaningfulInput = section.steps.some((step) =>
      hasMeaningfulInputForWizardStep(step.key, {
        formState,
        slugStepState,
        hasStepInteraction: interactedStepKeys.has(step.key),
        hasPersistedData,
      })
    );
    const statusLabel = getWizardSectionStatus({
      isActive,
      valid: validation.valid,
      hasMeaningfulInput,
      invalidStepCount: validation.invalidStepKeys.length,
    });

    return (
      <button
        key={section.id}
        type="button"
        className={`${styles.sectionButton} ${isActive ? styles.sectionButtonActive : ''}`}
        aria-current={isActive ? 'step' : undefined}
        disabled={isSaving}
        onClick={() => handleSectionSelect(section.id)}
      >
        <span className={styles.sectionIndex}>{index + 1}</span>
        <span className={styles.sectionButtonText}>
          <strong>{section.title}</strong>
          <span>{statusLabel}</span>
        </span>
      </button>
    );
  });

  return (
    <div className={styles.workspace} data-operation-ui>
      <div
        hidden
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }}
      />

      <div
        inert={isDialogOpen ? true : undefined}
        aria-hidden={isDialogOpen ? true : undefined}
      >
      <header className={styles.topBar}>
        <div className={styles.topBarInner}>
          <div className={styles.identity}>
            <span className={styles.productLabel}>초대장 편집</span>
            <div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
          </div>
          <div className={styles.topActions}>
            <span className={styles.publicationStatus}>
              {persistedPublished ? '공개 중' : '비공개 초안'}
            </span>
            <span
              className={`${styles.saveStatus} ${styles[`saveStatus_${saveStatus}`]}`}
              role="status"
              aria-live="polite"
            >
              {getWizardSaveStatusLabel(saveStatus)}
            </span>
            {lastSavedAt ? (
              <time className={styles.savedTime} dateTime={lastSavedAt.toISOString()}>
                {lastSavedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </time>
            ) : null}
            <button type="button" className={styles.primaryAction} onClick={onSave} disabled={isSaving}>
              {isSaving ? '저장 중' : saveStatus === 'error' ? '저장 다시 시도' : '내용 저장'}
            </button>
            {activePreviewStep ? (
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={(event) => openPreview(activePreviewStep.key, event.currentTarget)}
              >
                미리보기
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className={styles.mobileProgress}>
        <div>
          <span>{activeSectionIndex + 1} / {sections.length}</span>
        </div>
        <button
          ref={mobileNavTriggerRef}
          type="button"
          className={styles.mobileSectionTrigger}
          aria-expanded={isMobileNavOpen}
          onClick={() => setIsMobileNavOpen(true)}
        >
          전체 작업
        </button>
      </div>

      <div className={styles.layout}>
        <aside className={styles.desktopNav}>
          <nav className={styles.sectionNav} aria-label="작업 영역">
            <p className={styles.navHeading}>작업 영역</p>
            {renderSectionButtons()}
          </nav>
        </aside>

        <main className={styles.content}>
          {notice}

          <header className={styles.sectionHeader}>
            <span className={styles.sectionPosition}>
              {activeSectionIndex + 1} / {sections.length}
            </span>
            <h2>{activeSection.title}</h2>
            <p>{activeSection.description}</p>
          </header>

          {isFinalSection ? (
            <section className={styles.reviewSummary} aria-label="입력 내용 검토">
              <h3>공유 전 확인</h3>
              <dl className={styles.reviewFacts}>
                {buildWizardReviewFacts(formState, getStepValidation('images').valid).map((fact) => (
                  <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>
                ))}
                <div><dt>저장 후 공개 상태</dt><dd>{published ? '공개' : '비공개'}</dd></div>
              </dl>
              {formState.metadata.images.wedding ? (
                <img className={styles.reviewImage} src={formState.metadata.images.wedding} alt="등록한 대표 이미지 확인" />
              ) : null}
              <div className={styles.reviewChecks}>
                {sections.filter((section) => section.id !== 'review').map((section) => {
                  const validation = getSectionValidation(section);
                  return (
                    <button key={section.id} type="button" disabled={isSaving} onClick={() => handleSectionSelect(section.id)} className={styles.reviewCheck}>
                      <strong>{section.title}</strong>
                      <span>{validation.valid ? '입력 확인 · 수정' : validation.messages[0] || '필수 입력 확인'}</span>
                    </button>
                  );
                })}
              </div>
              <p className={styles.saveHelp}>내용 저장은 현재 공개 상태를 유지합니다. 공개 여부 변경은 아래 최종 저장 버튼에서 적용됩니다.</p>
            </section>
          ) : null}

          <div className={styles.stepList}>
            {activeSection.steps.map((step) => {
              const validation = getStepValidation(step.key);
              const isActiveStep = step.key === activeStepKey;
              const isOnlyStepWithSectionTitle =
                activeSection.steps.length === 1 && step.title === activeSection.title;

              return (
                <section
                  key={step.key}
                  className={styles.stepSection}
                  data-step-key={step.key}
                  aria-labelledby={`wizard-step-${step.key}`}
                  aria-current={isActiveStep ? 'step' : undefined}
                  tabIndex={-1}
                >
                  <div className={styles.stepHeadingRow}>
                    <div className={isOnlyStepWithSectionTitle ? styles.stepHeadingCopyCompact : undefined}>
                      <h3
                        id={`wizard-step-${step.key}`}
                        className={isOnlyStepWithSectionTitle ? styles.visuallyHidden : undefined}
                      >
                        {step.title}
                      </h3>
                      <p>{step.description}</p>
                    </div>
                    {step.previewSection ? (
                      <button
                        type="button"
                        className={styles.stepPreviewAction}
                        aria-pressed={previewStepKey === step.key}
                        onClick={(event) => openPreview(step.key, event.currentTarget)}
                      >
                        미리보기
                      </button>
                    ) : null}
                  </div>

                  {!validation.valid ? (
                    <div className={styles.validationNotice} role="alert">
                      {validation.messages[0] ?? '입력 내용을 확인해 주세요.'}
                    </div>
                  ) : null}

                  <div className={styles.stepContent}>
                    <fieldset className={styles.editorFields} disabled={isSaving} aria-label={`${step.title} 입력`}>
                    {step.key === 'music' || step.key === 'extra' ? (
                      <details className={styles.optionalSection} open={!validation.valid}>
                        <summary>{step.title} 설정</summary>
                        {renderStepContent(step.key)}
                      </details>
                    ) : renderStepContent(step.key)}
                    </fieldset>
                  </div>
                </section>
              );
            })}
          </div>
        </main>
      </div>

      <footer className={styles.actionBar}>
        <div className={styles.actionBarInner}>
          <span className={styles.actionContext}>{activeSection.title}</span>
          <div className={styles.actionButtons}>
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={onPrevious}
              disabled={activeSectionIndex === 0 || isSaving}
            >
              이전
            </button>
            {isFinalSection ? (
              <button
                type="button"
                className={styles.primaryAction}
                onClick={onFinalConfirm}
                disabled={isSaving}
              >
                {isSaving ? '저장 중' : published ? '저장 후 공개' : persistedPublished ? '비공개로 저장' : '초안 저장'}
              </button>
            ) : (
              <button
                type="button"
                className={styles.primaryAction}
                onClick={onNext}
                disabled={isSaving}
              >
                {isSaving ? '저장 중' : '저장 후 다음'}
              </button>
            )}
          </div>
        </div>
      </footer>
      </div>

      {isMobileNavOpen ? (
        <div className={styles.overlay}>
          <section
            className={styles.mobileNavDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wizard-mobile-nav-title"
          >
            <header className={styles.dialogHeader}>
              <h2 id="wizard-mobile-nav-title">작업 영역</h2>
              <button
                ref={mobileNavCloseRef}
                type="button"
                className={styles.closeAction}
                onClick={closeMobileNav}
                aria-label="작업 영역 닫기"
              >
                닫기
              </button>
            </header>
            <nav className={styles.mobileNavList} aria-label="모바일 작업 영역">
              {renderSectionButtons()}
            </nav>
          </section>
        </div>
      ) : null}

      {previewStepKey ? (
        <div className={styles.previewOverlay}>
          <section
            className={styles.previewPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wizard-preview-title"
          >
            <header className={styles.dialogHeader}>
              <div>
                <span className={styles.dialogLabel}>미리보기</span>
                <h2 id="wizard-preview-title">
                  {activeSection.steps.find((step) => step.key === previewStepKey)?.title
                    ?? '초대장 화면'}
                </h2>
              </div>
              <button
                ref={previewCloseRef}
                type="button"
                className={styles.closeAction}
                onClick={closePreview}
                aria-label="미리보기 닫기"
              >
                닫기
              </button>
            </header>
            <div className={styles.previewContent}>
              {renderStepPreview(previewStepKey)}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
