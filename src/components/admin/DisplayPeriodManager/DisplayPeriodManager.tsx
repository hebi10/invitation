'use client';

import { useAdminWorkGuard } from '@/app/admin/_components/AdminWorkGuard';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  deleteDisplayPeriod,
  getAllDisplayPeriods,
  setDisplayPeriod,
  type DisplayPeriod,
} from '@/services/displayPeriodService';
import {
  getAllManagedInvitationPages,
  type InvitationPageSummary,
} from '@/services/invitationPageService';
import {
  EmptyState,
  FilterToolbar,
  StatusBadge,
  useAdminOverlay,
} from '@/app/admin/_components';
import type { EventTypeKey } from '@/lib/eventTypes';
import {
  DUE_SOON_DAYS,
  getPeriodStatusMeta,
  type PeriodStatusFilter,
} from '@/app/admin/_components/adminPageUtils';

import styles from './DisplayPeriodManager.module.css';

interface DisplayPeriodManagerProps {
  isVisible: boolean;
  statusFilter?: PeriodStatusFilter;
  eventTypeFilter?: EventTypeKey | null;
  initialPageSlug?: string;
  onDataChanged?: () => void;
}

type FormState = {
  pageSlug: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function createFormState(page: InvitationPageSummary, period?: DisplayPeriod | null): FormState {
  const startDate = period?.startDate ?? page.displayPeriodStart ?? new Date();
  const endDate =
    period?.endDate ??
    page.displayPeriodEnd ??
    addDays(startDate, 7);

  return {
    pageSlug: page.slug,
    startDate: toDateInputValue(startDate),
    endDate: toDateInputValue(endDate),
    isActive: period?.isActive ?? true,
  };
}

function matchesStatusFilter(
  filter: PeriodStatusFilter,
  period: DisplayPeriod | undefined
) {
  if (filter === 'all') {
    return true;
  }

  if (!period) {
    return filter === 'inactive';
  }

  const now = new Date();

  if (!period.isActive) {
    return filter === 'inactive';
  }

  if (now < period.startDate) {
    return filter === 'scheduled';
  }

  if (now > period.endDate) {
    return filter === 'expired';
  }

  if (
    now >= period.startDate &&
    now <= period.endDate &&
    Math.ceil((period.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) <=
      DUE_SOON_DAYS
  ) {
    return filter === 'dueSoon' || filter === 'active';
  }

  return filter === 'active';
}

export default function DisplayPeriodManager({
  isVisible,
  statusFilter = 'all',
  eventTypeFilter = 'wedding',
  initialPageSlug,
  onDataChanged,
}: DisplayPeriodManagerProps) {
  const [saving, setSaving] = useState(false);
  const [initialForm, setInitialForm] = useState('');
  const [periods, setPeriods] = useState<DisplayPeriod[]>([]);
  const [pages, setPages] = useState<InvitationPageSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [editingPageSlug, setEditingPageSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [localStatusFilter, setLocalStatusFilter] = useState<PeriodStatusFilter>(statusFilter);
  const [formData, setFormData] = useState<FormState>({
    pageSlug: '',
    startDate: '',
    endDate: '',
    isActive: true,
  });
  const { confirm, showToast } = useAdminOverlay();
  const appliedInitialPageSlugRef = useRef<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setLoadError('');
      const [nextPeriods, nextPages] = await Promise.all([
        getAllDisplayPeriods(),
        getAllManagedInvitationPages(),
      ]);
      setPeriods(nextPeriods);
      setPages(nextPages);
    } catch (loadDataError) {
      console.error(loadDataError);
      setLoadError('노출 기간 데이터를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    void loadData();
  }, [isVisible]);

  useEffect(() => {
    setLocalStatusFilter(statusFilter);
  }, [statusFilter]);

  const dirty = Boolean(editingPageSlug && JSON.stringify(formData) !== initialForm);
  const resetForm = () => {
    setEditingPageSlug(null);
    setFormError('');
    setFormData({
      pageSlug: '',
      startDate: '',
      endDate: '',
      isActive: true,
    });
  };

  const handleSubmit = async (event?: React.FormEvent): Promise<boolean> => {
    event?.preventDefault();
    if (saving) return false;

    if (!formData.pageSlug || !formData.startDate || !formData.endDate) {
      setFormError('시작일과 종료일을 모두 입력해 주세요.');
      return false;
    }

    const startDate = new Date(`${formData.startDate}T00:00:00`);
    const endDate = new Date(`${formData.endDate}T23:59:59`);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || formData.startDate >= formData.endDate) {
      setFormError('종료일은 시작일보다 뒤여야 합니다.');
      return false;
    }

    try {
      setSaving(true);
      setFormError('');
      await setDisplayPeriod(
        formData.pageSlug,
        startDate,
        endDate,
        formData.isActive
      );
      await loadData();
      resetForm();
      onDataChanged?.();
      showToast({
        title: '노출 기간이 저장되었습니다.',
        tone: 'success',
      });
      return true;
    } catch (submitError) {
      console.error(submitError);
      setFormError('노출 기간 저장에 실패했습니다.');
      showToast({
        title: '노출 기간 저장에 실패했습니다.',
        tone: 'error',
      });
      return false;
    } finally { setSaving(false); }
  };

  useAdminWorkGuard({ dirty, busy: saving, save: () => handleSubmit() });

  const handleDelete = async (pageSlug: string) => {
    const approved = await confirm({
      title: '기간 제한을 해제할까요?',
      description: `${pages.find((page) => page.slug === pageSlug)?.displayName ?? pageSlug}의 기간 제한을 해제합니다. 공개 설정이 켜져 있으면 계속 노출됩니다.`,
      confirmLabel: '기간 제한 해제',
      cancelLabel: '취소',
      tone: 'danger',
    });

    if (!approved) {
      return;
    }

    try {
      setSaving(true);
      await deleteDisplayPeriod(pageSlug);
      await loadData();
      if (editingPageSlug === pageSlug) {
        resetForm();
      }
      onDataChanged?.();
      showToast({
        title: '기간 제한을 해제했습니다.',
        tone: 'success',
      });
    } catch (deleteError) {
      console.error(deleteError);
      setLoadError('기간 제한 해제에 실패했습니다.');
      showToast({
        title: '기간 제한 해제에 실패했습니다.',
        tone: 'error',
      });
    } finally { setSaving(false); }
  };

  const periodsByPage = useMemo(
    () => new Map(periods.map((period) => [period.pageSlug, period])),
    [periods]
  );

  useEffect(() => {
    if (
      !initialPageSlug ||
      appliedInitialPageSlugRef.current === initialPageSlug
    ) {
      return;
    }

    const selectedPage = pages.find((page) => page.slug === initialPageSlug);
    if (!selectedPage) {
      return;
    }

    appliedInitialPageSlugRef.current = initialPageSlug;
    setEditingPageSlug(selectedPage.slug);
    setFormError('');
    setFormData(createFormState(selectedPage, periodsByPage.get(selectedPage.slug)));
    setInitialForm(JSON.stringify(createFormState(selectedPage, periodsByPage.get(selectedPage.slug))));
  }, [initialPageSlug, pages, periodsByPage]);

  const filteredPages = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return pages.filter((page) => {
      const matchesEventType = !eventTypeFilter || page.eventType === eventTypeFilter;
      const period = periodsByPage.get(page.slug);
      const matchesSearch = `${page.displayName} ${page.slug} ${page.venue ?? ''}`
        .toLowerCase()
        .includes(normalizedQuery);

      return matchesEventType && matchesSearch && matchesStatusFilter(localStatusFilter, period);
    });
  }, [eventTypeFilter, localStatusFilter, pages, periodsByPage, searchQuery]);

  const chips = [
    searchQuery
      ? {
          id: 'period-search',
          label: `검색: ${searchQuery}`,
          onRemove: () => setSearchQuery(''),
        }
      : null,
    localStatusFilter !== 'all'
      ? {
          id: 'period-status',
          label: `상태: ${localStatusFilter}`,
          onRemove: () => setLocalStatusFilter('all'),
        }
      : null,
  ].filter(Boolean) as Array<{ id: string; label: string; onRemove?: () => void }>;

  if (!isVisible) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>노출 기간 관리</h2>
          <p className={styles.description}>
            이벤트 공개 기간 데이터를 카드 단위로 바로 편집합니다.
          </p>
        </div>
        <StatusBadge tone="neutral">총 {filteredPages.length}개 페이지</StatusBadge>
      </div>

      <FilterToolbar
        fields={
          <>
            <label className="admin-field">
              <span className="admin-field-label">검색</span>
              <input
                className="admin-input"
                type="search"
                placeholder="이름, slug, 장소 검색"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>

            <label className="admin-field">
              <span className="admin-field-label">상태</span>
              <select
                className="admin-select"
                value={localStatusFilter}
                onChange={(event) =>
                  setLocalStatusFilter(event.target.value as PeriodStatusFilter)
                }
              >
                <option value="all">전체</option>
                <option value="dueSoon">곧 종료</option>
                <option value="active">노출 중</option>
                <option value="scheduled">시작 전</option>
                <option value="expired">만료</option>
                <option value="inactive">비활성</option>
              </select>
            </label>
          </>
        }
        actions={
          <button
            type="button"
            className="admin-button admin-button-secondary"
            onClick={() => void loadData()}
            disabled={isLoading}
          >
            {isLoading ? '불러오는 중...' : '새로고침'}
          </button>
        }
        chips={chips}
      />

      {loadError ? <div className={styles.errorMessage}>{loadError}</div> : null}

      {isLoading ? (
        <div className={styles.loading}>노출 기간 목록을 불러오는 중입니다.</div>
      ) : filteredPages.length > 0 ? (
        <div className={styles.periodsList}>
          {filteredPages.map((page) => {
            const period = periodsByPage.get(page.slug);
            const status = period
              ? getPeriodStatusMeta(period)
              : {
                  label: '비활성',
                  tone: 'neutral' as const,
                  description: '기간 제한이 설정되지 않았습니다.',
                };
            const isEditing = editingPageSlug === page.slug;

            return (
              <div
                key={page.slug}
                className={`${styles.periodItem} ${
                  isEditing ? styles.periodItemEditing : ''
                } ${styles[`periodItem${status.tone.charAt(0).toUpperCase()}${status.tone.slice(1)}`] ?? ''}`}
              >
                <div className={styles.periodHeader}>
                  <div>
                    <h4 className={styles.periodPageName}>{page.displayName}</h4>
                    <p className={styles.periodSlug}>{page.slug}</p>
                  </div>
                  <div className={styles.periodBadges}>
                    <StatusBadge tone={page.published ? 'success' : 'neutral'}>
                      {page.published ? '기본 공개' : '비공개'}
                    </StatusBadge>
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </div>
                </div>

                <p className={styles.periodDescription}>{status.description}</p>

                {period ? (
                  <div className={styles.periodMeta}>
                    <span>시작일 {period.startDate.toLocaleDateString('ko-KR')}</span>
                    <span>종료일 {period.endDate.toLocaleDateString('ko-KR')}</span>
                    <span>{period.isActive ? '활성' : '비활성'}</span>
                  </div>
                ) : (
                  <div className={styles.periodMeta}>
                    <span>기간 제한 없음</span>
                  </div>
                )}

                <div className={styles.periodActions}>
                  <button
                    type="button"
                    className="admin-button admin-button-secondary"
                    disabled={saving}
                    onClick={async () => {
                      if (dirty && !(await confirm({ title: '변경사항을 버릴까요?', description: '입력한 노출 기간을 저장하지 않고 다른 설정을 엽니다.', confirmLabel: '변경 버리기', cancelLabel: '계속 편집', tone: 'danger' }))) return;
                      setEditingPageSlug(page.slug);
                      setFormError('');
                      setFormData(createFormState(page, period));
                      setInitialForm(JSON.stringify(createFormState(page, period)));
                    }}
                  >
                    {period ? '수정' : '기간 설정'}
                  </button>
                  {period ? (
                    <button
                      type="button"
                      className="admin-button admin-button-danger"
                      disabled={saving}
                      onClick={() => void handleDelete(period.pageSlug)}
                    >
                      기간 제한 해제
                    </button>
                  ) : null}
                </div>

                {isEditing ? (
                  <form className={styles.inlineEditor} onSubmit={handleSubmit}>
                    <fieldset disabled={saving} className={styles.workFields}>
                    <div className={styles.inlineEditorHeader}>
                      <div>
                        <h5 className={styles.inlineEditorTitle}>
                          {period ? '노출 기간 수정' : '노출 기간 설정'}
                        </h5>
                        <p className={styles.inlineEditorHint}>
                          {page.displayName} ({page.slug})
                        </p>
                      </div>
                      <StatusBadge tone="primary">{dirty ? '저장 필요' : '기간 설정'}</StatusBadge>
                    </div>

                    <div className={styles.formGrid}>
                      <label className="admin-field">
                        <span className="admin-field-label">시작일</span>
                        <input
                          type="date"
                          value={formData.startDate}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              startDate: event.target.value,
                            }))
                          }
                          className="admin-input"
                          required
                        />
                      </label>

                      <label className="admin-field">
                        <span className="admin-field-label">종료일</span>
                        <input
                          type="date"
                          value={formData.endDate}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              endDate: event.target.value,
                            }))
                          }
                          className="admin-input"
                          required
                        />
                      </label>
                    </div>

                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            isActive: event.target.checked,
                          }))
                        }
                      />
                      기간 제한 사용
                    </label>

                    {formError ? <div className={styles.inlineError}>{formError}</div> : null}

                    <div className={styles.formActions}>
                      <button type="submit" className="admin-button admin-button-primary">
                        {saving ? '저장 중' : '저장'}
                      </button>
                      <button
                        type="button"
                        className="admin-button admin-button-ghost"
                        onClick={async () => { if (!dirty || await confirm({ title: '변경사항을 버릴까요?', description: '입력한 노출 기간을 저장하지 않습니다.', confirmLabel: '변경 버리기', cancelLabel: '계속 편집', tone: 'danger' })) resetForm(); }}
                      >
                        취소
                      </button>
                    </div>
                    </fieldset>
                  </form>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="조건에 맞는 페이지가 없습니다."
          description="검색어 또는 상태 필터를 조정해서 다시 확인해 주세요."
          actionLabel="검색 초기화"
          onAction={() => setSearchQuery('')}
        />
      )}
    </div>
  );
}
