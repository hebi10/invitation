'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { InvitationPageSummary } from '@/services/invitationPageService';
import { deleteDisplayPeriod, setDisplayPeriod } from '@/services/displayPeriodService';

import { validateAdminEventPeriodInput } from './adminEventWorkspaceModel';
import { useAdminOverlay } from './AdminOverlayProvider';
import { useAdminWorkGuard } from './AdminWorkGuard';
import styles from '../page.module.css';

interface AdminEventPeriodTabProps {
  page: InvitationPageSummary;
  readOnly?: boolean;
  onUpdated: () => void | Promise<void>;
}

function toDateInputValue(value: Date | null) {
  if (!value) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AdminEventPeriodTab({
  page,
  readOnly = false,
  onUpdated,
}: AdminEventPeriodTabProps) {
  const { showToast } = useAdminOverlay();
  const [enabled, setEnabled] = useState(page.displayPeriodEnabled);
  const [startDate, setStartDate] = useState(toDateInputValue(page.displayPeriodStart));
  const [endDate, setEndDate] = useState(toDateInputValue(page.displayPeriodEnd));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const saveInProgress = useRef(false);
  const loadedSlug = useRef(page.slug);
  const [savedValues, setSavedValues] = useState({
    enabled: page.displayPeriodEnabled,
    startDate: toDateInputValue(page.displayPeriodStart),
    endDate: toDateInputValue(page.displayPeriodEnd),
  });
  const dirty = enabled !== savedValues.enabled ||
    (enabled && (startDate !== savedValues.startDate || endDate !== savedValues.endDate));
  const dirtyRef = useRef(dirty);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);

  useEffect(() => {
    if (loadedSlug.current === page.slug && dirtyRef.current) return;
    loadedSlug.current = page.slug;
    setEnabled(page.displayPeriodEnabled);
    setStartDate(toDateInputValue(page.displayPeriodStart));
    setEndDate(toDateInputValue(page.displayPeriodEnd));
    setSavedValues({ enabled: page.displayPeriodEnabled, startDate: toDateInputValue(page.displayPeriodStart), endDate: toDateInputValue(page.displayPeriodEnd) });
    setError('');
  }, [page.displayPeriodEnabled, page.displayPeriodEnd, page.displayPeriodStart, page.slug]);

  const saveChanges = useCallback(async (): Promise<boolean> => {
    if (readOnly || saveInProgress.current) return false;
    if (!dirty) return true;
    const validationError = validateAdminEventPeriodInput({ enabled, startDate, endDate });
    if (validationError) {
      setError(validationError);
      return false;
    }

    saveInProgress.current = true;
    setSaving(true);
    setError('');
    try {
      if (enabled) {
        await setDisplayPeriod(
          page.slug,
          new Date(`${startDate}T00:00:00`),
          new Date(`${endDate}T23:59:59`),
          true
        );
      } else {
        await deleteDisplayPeriod(page.slug);
      }
      await onUpdated();
      setSavedValues({ enabled, startDate, endDate });
      showToast({
        title: enabled ? '노출 기간을 저장했습니다.' : '기간 제한을 해제했습니다.',
        tone: 'success',
      });
      return true;
    } catch (saveError) {
      console.error(saveError);
      setError('노출 기간을 저장하지 못했습니다.');
      showToast({ title: '노출 기간 저장에 실패했습니다.', tone: 'error' });
      return false;
    } finally {
      saveInProgress.current = false;
      setSaving(false);
    }
  }, [dirty, enabled, endDate, onUpdated, page.slug, readOnly, showToast, startDate]);

  useAdminWorkGuard({ dirty: !readOnly && dirty, busy: saving, save: saveChanges });

  const cancelChanges = () => {
    setEnabled(savedValues.enabled);
    setStartDate(savedValues.startDate);
    setEndDate(savedValues.endDate);
    setError('');
  };

  return (
    <form className={styles.eventManagementForm} onSubmit={(event) => { event.preventDefault(); void saveChanges(); }}>
      <div className={styles.eventManagementHeading}>
        <div>
          <h3>노출 기간</h3>
          <p>기간 제한을 끄면 공개 상태인 동안 계속 노출됩니다.</p>
          <p>{page.published ? '현재 공개 중입니다. 저장한 기간이 노출에 적용됩니다.' : '현재 비공개입니다. 기간을 저장해도 공개 상태는 바뀌지 않습니다.'}</p>
        </div>
      </div>

      <label className={styles.eventManagementToggle}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={readOnly || saving}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        <span>노출 기간 제한 사용</span>
      </label>

      {enabled ? (
        <div className={styles.eventManagementFieldGrid}>
          <label className="admin-field">
            <span className="admin-field-label">시작일</span>
            <input
              className="admin-input"
              type="date"
              value={startDate}
              disabled={readOnly || saving}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">종료일</span>
            <input
              className="admin-input"
              type="date"
              value={endDate}
              disabled={readOnly || saving}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>
      ) : null}

      {error ? <p className={styles.eventManagementError} role="alert">{error}</p> : null}
      <p role="status">{saving ? '변경 내용을 저장하고 있습니다.' : dirty ? '저장하지 않은 변경사항이 있습니다.' : '저장된 설정입니다.'}</p>
      <div className={styles.eventManagementActions}>
        <button type="button" className="admin-button admin-button-secondary" onClick={cancelChanges} disabled={readOnly || saving || !dirty}>
          변경 취소
        </button>
        <button
          type="submit"
          className="admin-button admin-button-primary"
          disabled={readOnly || saving || !dirty}
        >
          {saving ? '저장 중' : error ? '기간 저장 다시 시도' : '기간 저장'}
        </button>
      </div>
    </form>
  );
}
