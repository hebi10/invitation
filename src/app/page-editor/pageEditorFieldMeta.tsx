import type { StepDefinition } from './pageEditorContent';
import {
  MAX_REPEATABLE_ITEMS,
  type StepReview,
} from './pageEditorDerivedState';
import styles from './page.module.css';

export function getStepCriteriaText(step: StepDefinition, review: StepReview) {
  if (step.isOptional) {
    if (step.key === 'gallery') {
      return '선택 항목 · 대표 이미지 1장만 정해도 충분합니다.';
    }

    if (step.key === 'gift') {
      return `선택 항목 · 계좌와 안내는 최대 ${MAX_REPEATABLE_ITEMS}개까지 입력할 수 있습니다.`;
    }

    return '선택 항목 · 필요한 경우에만 입력해 주세요.';
  }

  return `완료 기준 · 필수 ${review.completedRequiredCount}/${review.requiredCount}`;
}

export function getStepSummaryText(step: StepDefinition, review: StepReview) {
  if (step.isOptional) {
    return review.warnings.length > 0 ? '선택 항목 확인 필요' : '선택 항목';
  }

  return `필수 ${review.completedRequiredCount}/${review.requiredCount}`;
}

export function renderFieldMeta(
  label: string,
  requirement: 'required' | 'optional',
  hint?: string
) {
  return (
    <>
      <span className={styles.labelRow}>
        <span className={styles.label}>{label}</span>
        <span
          className={
            requirement === 'required'
              ? styles.fieldBadgeRequired
              : styles.fieldBadgeOptional
          }
        >
          {requirement === 'required' ? '필수' : '선택'}
        </span>
      </span>
      {hint ? <span className={styles.fieldHint}>{hint}</span> : null}
    </>
  );
}
