'use client';

import {
  type ReactNode,
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
import { useDialogLayer } from '@/hooks/useDialogLayer';

type PageWizardWorkspaceProps = {
  experience?: boolean;
  setupOnly?: boolean;
  canManageSetup?: boolean;
  setupContent?: ReactNode;
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
  fullPreview?: ReactNode;
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

function OptionalSettings({ invalid, title, children }: { invalid: boolean; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(invalid);

  useEffect(() => {
    if (invalid) setOpen(true);
  }, [invalid]);

  return (
    <details className={styles.optionalSection} open={open} onToggle={event => setOpen(event.currentTarget.open)}>
      <summary>{title} 설정</summary>
      {children}
    </details>
  );
}

export default function PageWizardWorkspace({
  experience = false,
  setupOnly = false,
  canManageSetup = false,
  setupContent,
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
  fullPreview,
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
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const [attemptedSteps, setAttemptedSteps] = useState<Set<WizardStepKey>>(new Set());
  const fullPreviewDialogRef = useRef<HTMLElement | null>(null);
  const attempt = (action: () => void, allSections = false) => {
    const steps = allSections ? sections.flatMap(section => section.steps) : activeSection.steps;
    setAttemptedSteps(previous => new Set([...previous, ...steps.map(step => step.key)]));
    action();
  };
  const previewDialogRef = useRef<HTMLElement | null>(null);
  const mobileNavDialogRef = useRef<HTMLElement | null>(null);
  const activeSectionIndex = sections.findIndex(
    (section) => section.id === activeSection.id
  );
  const isFinalSection = activeSection.id === 'review';
  const activePreviewStep = useMemo(
    () => activeSection.steps.find((step) => Boolean(step.previewSection)) ?? null,
    [activeSection.steps]
  );
  const isDialogOpen = isMobileNavOpen || isFullPreviewOpen || previewStepKey !== null;
  const closeFullPreview = () => setIsFullPreviewOpen(false);
  useDialogLayer(fullPreviewDialogRef, { open: isFullPreviewOpen, onClose: closeFullPreview });

  const closePreview = () => onClosePreview();
  const closeMobileNav = () => setIsMobileNavOpen(false);
  useDialogLayer(previewDialogRef, { open: previewStepKey !== null, onClose: closePreview });
  useDialogLayer(mobileNavDialogRef, { open: isMobileNavOpen, onClose: closeMobileNav });

  const handleSectionSelect = (sectionId: WizardSectionId) => {
    onSelectSection(sectionId);
    setIsMobileNavOpen(false);
  };

  const openPreview = (stepKey: WizardStepKey) => onOpenPreview(stepKey);

  const renderSectionButtons = () => sections.map((section, index) => {
    const validation = getSectionValidation(section);
    const isActive = section.id === activeSection.id;
    const hasMeaningfulInput = section.steps.some((step) =>
      (hasPersistedData || interactedStepKeys.has(step.key) || attemptedSteps.has(step.key)) &&
      hasMeaningfulInputForWizardStep(step.key, {
        formState,
        slugStepState,
        hasStepInteraction: interactedStepKeys.has(step.key),
        hasPersistedData,
      })
    );
    const statusLabel = getWizardSectionStatus({
      isActive,
      valid: validation.valid || !(hasPersistedData || section.steps.some(step => interactedStepKeys.has(step.key) || attemptedSteps.has(step.key))),
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
    <div className={styles.workspace} data-operation-ui data-experience-step={experience ? activeStepKey : undefined}>
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
            <button type="button" className={styles.primaryAction} onClick={() => attempt(onSave, true)} disabled={isSaving}>
              {isSaving ? '저장 중' : saveStatus === 'error' ? '저장 다시 시도' : setupOnly ? (hasPersistedData ? '설정 저장' : '초대장 생성') : '내용 저장'}
            </button>
            {fullPreview || activePreviewStep ? (
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={() => fullPreview ? setIsFullPreviewOpen(true) : activePreviewStep && openPreview(activePreviewStep.key)}
              >
                {fullPreview ? '청첩장 미리보기' : '입력 내용 확인'}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {!setupOnly ? <div className={styles.mobileProgress}>
        <div>
          <span>{activeSectionIndex + 1} / {sections.length}</span>
        </div>
        <button
          type="button"
          className={styles.mobileSectionTrigger}
          aria-expanded={isMobileNavOpen}
          onClick={() => setIsMobileNavOpen(true)}
        >
          전체 작업
        </button>
      </div> : null}

      <div className={`${styles.layout} ${fullPreview ? styles.layoutWithPreview : ''} ${setupOnly ? styles.setupLayout : ''}`}>
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
              <p className={styles.saveHelp}>{canManageSetup ? '내용 저장은 현재 공개 상태를 유지합니다. 공개 여부 변경은 아래 최종 저장 버튼에서 적용됩니다.' : '내용을 저장하면 현재 공개 상태가 유지됩니다. 공개 여부는 관리자가 설정합니다.'}</p>
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
                    {step.previewSection && !fullPreview ? (
                      <button
                        type="button"
                        className={styles.stepPreviewAction}
                        aria-pressed={previewStepKey === step.key}
                        onClick={() => openPreview(step.key)}
                      >
                        입력 내용 확인
                      </button>
                    ) : null}
                  </div>

                  {!validation.valid && (interactedStepKeys.has(step.key) || attemptedSteps.has(step.key)) ? (
                    <div className={styles.validationNotice} role="alert">
                      {validation.messages.length ? <ul>{validation.messages.map(message => <li key={message}>{message}</li>)}</ul> : '입력 내용을 확인해 주세요.'}
                    </div>
                  ) : null}

                  <div className={styles.stepContent}>
                    <fieldset className={styles.editorFields} disabled={isSaving} aria-label={`${step.title} 입력`}>
                    {step.key === 'music' || step.key === 'extra' ? (
                      <OptionalSettings invalid={!validation.valid} title={step.title}>
                        {renderStepContent(step.key)}
                      </OptionalSettings>
                    ) : renderStepContent(step.key)}
                    </fieldset>
                  </div>
                </section>
              );
            })}
          </div>
          {activeSection.id === 'setup' && canManageSetup ? setupContent : null}
        </main>
        {fullPreview ? <aside className={styles.livePreview} aria-label="청첩장 실시간 미리보기">
          <h2>청첩장 미리보기</h2>
          {fullPreview}
        </aside> : null}
      </div>

      <footer className={styles.actionBar}>
        <div className={styles.actionBarInner}>
          <div className={styles.actionContext}><span>{activeSection.title}</span>
            <p>{persistedPublished ? '내용을 저장하면 공개 중인 청첩장에도 바로 반영됩니다.' : '저장한 내용은 최종 공개 전까지 초안으로 유지됩니다.'}</p>
          </div>
          <div className={styles.actionButtons}>
            {!setupOnly ? <button
              type="button"
              className={styles.secondaryAction}
              onClick={onPrevious}
              disabled={activeSectionIndex === 0 || isSaving}
            >
              이전
            </button> : null}
            {isFinalSection ? (
              <button
                type="button"
                className={styles.primaryAction}
                onClick={() => attempt(onFinalConfirm, true)}
                disabled={isSaving}
              >
                {isSaving ? '저장 중' : !canManageSetup ? '내용 저장 완료' : published ? '저장 후 공개' : persistedPublished ? '비공개로 저장' : '초안 저장'}
              </button>
            ) : (
              <button
                type="button"
                className={styles.primaryAction}
                onClick={() => attempt(onNext)}
                disabled={isSaving}
              >
                {isSaving ? '저장 중' : setupOnly ? (hasPersistedData ? '내용 입력으로' : '초대장 생성') : '저장 후 다음'}
              </button>
            )}
          </div>
        </div>
      </footer>
      </div>

      {isMobileNavOpen ? (
        <div className={styles.overlay}>
          <section
            ref={mobileNavDialogRef}
            className={styles.mobileNavDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wizard-mobile-nav-title"
          >
            <header className={styles.dialogHeader}>
              <h2 id="wizard-mobile-nav-title">작업 영역</h2>
              <button
                type="button"
                className={styles.closeAction}
                onClick={closeMobileNav}
                aria-label="작업 영역 닫기"
              >
                <img src="/images/admin/close.webp" width={16} height={16} alt="" />
              </button>
            </header>
            <nav className={styles.mobileNavList} aria-label="모바일 작업 영역">
              {renderSectionButtons()}
            </nav>
          </section>
        </div>
      ) : null}

      {isFullPreviewOpen ? <div className={styles.previewOverlay}>
        <section ref={fullPreviewDialogRef} className={styles.previewPanel} role="dialog" aria-modal="true" aria-labelledby="wizard-full-preview-title">
          <header className={styles.dialogHeader}>
            <h2 id="wizard-full-preview-title">청첩장 미리보기</h2>
            <button type="button" className={styles.closeAction} onClick={closeFullPreview} aria-label="미리보기 닫기"><img src="/images/admin/close.webp" width={16} height={16} alt="" /></button>
          </header>
          <div className={styles.previewContent}>{fullPreview}</div>
        </section>
      </div> : null}
      {previewStepKey ? (
        <div className={styles.previewOverlay}>
          <section
            ref={previewDialogRef}
            className={styles.previewPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wizard-preview-title"
          >
            <header className={styles.dialogHeader}>
              <div>
                <span className={styles.dialogLabel}>입력 내용 확인</span>
                <h2 id="wizard-preview-title">
                  {activeSection.steps.find((step) => step.key === previewStepKey)?.title
                    ?? '초대장 화면'}
                </h2>
              </div>
              <button
                type="button"
                className={styles.closeAction}
                onClick={closePreview}
                aria-label="미리보기 닫기"
              >
                <img src="/images/admin/close.webp" width={16} height={16} alt="" />
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
