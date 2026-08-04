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
  WizardStepKey,
} from './pageWizardData';
import type {
  WizardSection,
  WizardSectionId,
  WizardSectionValidation,
} from './pageWizardSections';
import type { WizardSaveStatus } from './pageWizardWorkspaceState';
import styles from './PageWizardWorkspace.module.css';

type PageWizardWorkspaceProps = {
  title: string;
  subtitle: string;
  sections: WizardSection[];
  activeSection: WizardSection;
  activeStepKey: WizardStepKey;
  getSectionValidation: (section: WizardSection) => WizardSectionValidation;
  getStepValidation: (stepKey: WizardStepKey) => StepValidation;
  saveStatus: WizardSaveStatus;
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
};

const DIRECTION_CONTRACT = `<!--
THESIS: 초대장 편집기는 장식 화면이 아니라 누락 없이 정보를 완성하는 작업 공간이다.
OWN-WORLD: 중립 배경, 먹색 글자, 파란 단일 강조, 시스템 고딕, 1px 구분선, 6~8px 제어 반경.
STORY: 현재 위치와 오류를 확인하고, 관련 정보를 입력하고, 필요할 때 미리본 뒤 저장한다.
FIRST VIEWPORT: 상단 작업 바, 왼쪽 목차, 중앙 입력, 하단 주요 동작.
FORM: Operate 모드의 2열 데스크톱·단일 열 모바일 편집 워크스페이스.
-->`;

const SAVE_STATUS_LABELS: Record<WizardSaveStatus, string> = {
  idle: '아직 저장되지 않음',
  dirty: '변경사항 있음',
  saving: '저장 중',
  saved: '저장됨',
  error: '저장 실패',
};

export default function PageWizardWorkspace({
  title,
  subtitle,
  sections,
  activeSection,
  activeStepKey,
  getSectionValidation,
  getStepValidation,
  saveStatus,
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
    const statusLabel = isActive
      ? '현재 작업'
      : validation.valid
        ? '완료'
        : validation.invalidStepKeys.length > 0
          ? `확인 필요 ${validation.invalidStepKeys.length}개`
          : '미입력';

    return (
      <button
        key={section.id}
        type="button"
        className={`${styles.sectionButton} ${isActive ? styles.sectionButtonActive : ''}`}
        aria-current={isActive ? 'step' : undefined}
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
    <div className={styles.workspace}>
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
            <span
              className={`${styles.saveStatus} ${styles[`saveStatus_${saveStatus}`]}`}
              role="status"
              aria-live="polite"
            >
              {SAVE_STATUS_LABELS[saveStatus]}
            </span>
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
          <strong>{activeSection.title}</strong>
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

          <div className={styles.stepList}>
            {activeSection.steps.map((step) => {
              const validation = getStepValidation(step.key);
              const isActiveStep = step.key === activeStepKey;

              return (
                <section
                  key={step.key}
                  className={styles.stepSection}
                  data-step-key={step.key}
                  aria-labelledby={`wizard-step-${step.key}`}
                  tabIndex={-1}
                >
                  <div className={styles.stepHeadingRow}>
                    <div>
                      <h3 id={`wizard-step-${step.key}`}>{step.title}</h3>
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
                  ) : isActiveStep ? (
                    <p className={styles.activeStepHint}>현재 입력 중인 항목입니다.</p>
                  ) : null}

                  <div className={styles.stepContent}>
                    {renderStepContent(step.key)}
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
                {published ? '저장 후 공개' : '초안 저장'}
              </button>
            ) : (
              <button
                type="button"
                className={styles.primaryAction}
                onClick={onNext}
                disabled={isSaving}
              >
                {isSaving ? '저장 중' : '다음 작업'}
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
