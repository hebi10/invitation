'use client';

import { useEffect, useMemo, useState } from 'react';
import { deleteDisplayPeriod, getAllDisplayPeriods, getAllInvitationPages, setDisplayPeriod, type DisplayPeriod, type InvitationPageSummary } from '@/services';
import { EmptyState, FilterToolbar, StatusBadge, useAdminOverlay } from '@/app/admin/_components';
import { getPeriodStatusMeta, type PeriodStatusFilter } from '@/app/admin/_components/adminPageUtils';
import styles from './DisplayPeriodManager.module.css';

interface DisplayPeriodManagerProps {
  isVisible: boolean;
  statusFilter?: PeriodStatusFilter;
  onDataChanged?: () => void;
}

export default function DisplayPeriodManager({
  isVisible,
  statusFilter = 'all',
  onDataChanged,
}: DisplayPeriodManagerProps) {
  const [periods, setPeriods] = useState<DisplayPeriod[]>([]);
  const [pages, setPages] = useState<InvitationPageSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingPeriod, setEditingPeriod] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [localStatusFilter, setLocalStatusFilter] = useState<PeriodStatusFilter>(statusFilter);
  const [formData, setFormData] = useState({
    pageSlug: '',
    startDate: '',
    endDate: '',
    isActive: true,
  });
  const { confirm, showToast } = useAdminOverlay();

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const [nextPeriods, nextPages] = await Promise.all([getAllDisplayPeriods(), getAllInvitationPages()]);
      setPeriods(nextPeriods);
      setPages(nextPages);
    } catch (loadError) {
      console.error(loadError);
      setError('노출 기간 데이터를 불러오지 못했습니다.');
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

  const resetForm = () => {
    setFormData({
      pageSlug: '',
      startDate: '',
      endDate: '',
      isActive: true,
    });
    setEditingPeriod(null);
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.pageSlug || !formData.startDate || !formData.endDate) {
      setError('페이지와 날짜를 모두 입력해주세요.');
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (startDate >= endDate) {
      setError('종료일은 시작일보다 뒤여야 합니다.');
      return;
    }

    try {
      setError('');
      await setDisplayPeriod(formData.pageSlug, startDate, endDate, formData.isActive);
      await loadData();
      resetForm();
      onDataChanged?.();
      showToast({
        title: editingPeriod ? '노출 기간을 수정했습니다.' : '노출 기간을 저장했습니다.',
        tone: 'success',
      });
    } catch (submitError) {
      console.error(submitError);
      setError('노출 기간 저장에 실패했습니다.');
      showToast({
        title: '노출 기간 저장에 실패했습니다.',
        tone: 'error',
      });
    }
  };

  const handleDelete = async (pageSlug: string) => {
    const approved = await confirm({
      title: '노출 기간을 삭제할까요?',
      description: '삭제하면 기간 제한이 해제됩니다.',
      confirmLabel: '삭제',
      cancelLabel: '취소',
      tone: 'danger',
    });

    if (!approved) {
      return;
    }

    try {
      await deleteDisplayPeriod(pageSlug);
      await loadData();
      onDataChanged?.();
      showToast({
        title: '노출 기간을 삭제했습니다.',
        tone: 'success',
      });
    } catch (deleteError) {
      console.error(deleteError);
      setError('노출 기간 삭제에 실패했습니다.');
      showToast({
        title: '노출 기간 삭제에 실패했습니다.',
        tone: 'error',
      });
    }
  };

  const startEditing = (period: DisplayPeriod) => {
    setEditingPeriod(period.pageSlug);
    setFormData({
      pageSlug: period.pageSlug,
      startDate: period.startDate.toISOString().split('T')[0],
      endDate: period.endDate.toISOString().split('T')[0],
      isActive: period.isActive,
    });
  };

  const periodsByPage = useMemo(() => new Map(periods.map((period) => [period.pageSlug, period])), [periods]);

  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      const period = periodsByPage.get(page.slug);
      const status = period ? getPeriodStatusMeta(period) : { label: '비활성' };
      const matchesSearch = `${page.displayName} ${page.slug} ${page.venue ?? ''}`.toLowerCase().includes(searchQuery.trim().toLowerCase());
      const matchesStatus =
        localStatusFilter === 'all' ||
        (localStatusFilter === 'dueSoon' && status.label === '곧 종료') ||
        (localStatusFilter === 'active' && status.label === '노출 중') ||
        (localStatusFilter === 'scheduled' && status.label === '시작 전') ||
        (localStatusFilter === 'expired' && status.label === '만료') ||
        (localStatusFilter === 'inactive' && status.label === '비활성');

      return matchesSearch && matchesStatus;
    });
  }, [localStatusFilter, pages, periodsByPage, searchQuery]);

  const chips = [
    searchQuery ? { id: 'period-search', label: `검색: ${searchQuery}`, onRemove: () => setSearchQuery('') } : null,
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
          <p className={styles.description}>invitation-pages 문서의 displayPeriod 필드를 직접 관리합니다.</p>
        </div>
        <StatusBadge tone="neutral">총 {filteredPages.length}개 페이지</StatusBadge>
      </div>

      <FilterToolbar
        fields={
          <>
            <label className="admin-field">
              <span className="admin-field-label">검색</span>
              <input className="admin-input" type="search" placeholder="이름, slug, 장소 검색" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
            </label>

            <label className="admin-field">
              <span className="admin-field-label">상태</span>
              <select className="admin-select" value={localStatusFilter} onChange={(event) => setLocalStatusFilter(event.target.value as PeriodStatusFilter)}>
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
          <button type="button" className="admin-button admin-button-secondary" onClick={() => void loadData()} disabled={isLoading}>
            {isLoading ? '새로고침 중...' : '새로고침'}
          </button>
        }
        chips={chips}
      />

      {error ? <div className={styles.errorMessage}>{error}</div> : null}

      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>{editingPeriod ? '노출 기간 수정' : '노출 기간 추가'}</h3>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className="admin-field">
            <span className="admin-field-label">페이지</span>
            <select
              value={formData.pageSlug}
              onChange={(event) => setFormData((prev) => ({ ...prev, pageSlug: event.target.value }))}
              className="admin-select"
              disabled={Boolean(editingPeriod)}
              required
            >
              <option value="">페이지를 선택하세요</option>
              {pages.map((page) => (
                <option key={page.slug} value={page.slug}>
                  {page.displayName} ({page.slug})
                </option>
              ))}
            </select>
          </label>

          <div className={styles.formGrid}>
            <label className="admin-field">
              <span className="admin-field-label">시작일</span>
              <input type="date" value={formData.startDate} onChange={(event) => setFormData((prev) => ({ ...prev, startDate: event.target.value }))} className="admin-input" required />
            </label>

            <label className="admin-field">
              <span className="admin-field-label">종료일</span>
              <input type="date" value={formData.endDate} onChange={(event) => setFormData((prev) => ({ ...prev, endDate: event.target.value }))} className="admin-input" required />
            </label>
          </div>

          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={formData.isActive} onChange={(event) => setFormData((prev) => ({ ...prev, isActive: event.target.checked }))} />
            기간 제한 사용
          </label>

          <div className={styles.formActions}>
            <button type="submit" className="admin-button admin-button-primary">
              {editingPeriod ? '수정 저장' : '기간 저장'}
            </button>
            {editingPeriod ? (
              <button type="button" className="admin-button admin-button-ghost" onClick={resetForm}>
                취소
              </button>
            ) : null}
          </div>
        </form>
      </div>

      {isLoading ? (
        <div className={styles.loading}>노출 기간 목록을 불러오는 중입니다.</div>
      ) : filteredPages.length > 0 ? (
        <div className={styles.periodsList}>
          {filteredPages.map((page) => {
            const period = periodsByPage.get(page.slug);
            const status = period
              ? getPeriodStatusMeta(period)
              : { label: '비활성', tone: 'neutral' as const, description: '기간 제한이 설정되지 않았습니다.' };

            return (
              <div key={page.slug} className={styles.periodItem}>
                <div className={styles.periodHeader}>
                  <div>
                    <h4 className={styles.periodPageName}>{page.displayName}</h4>
                    <p className={styles.periodSlug}>{page.slug}</p>
                  </div>
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
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
                  {period ? (
                    <>
                      <button type="button" className="admin-button admin-button-secondary" onClick={() => startEditing(period)}>
                        수정
                      </button>
                      <button type="button" className="admin-button admin-button-danger" onClick={() => void handleDelete(period.pageSlug)}>
                        삭제
                      </button>
                    </>
                  ) : (
                    <button type="button" className="admin-button admin-button-secondary" onClick={() => setFormData((prev) => ({ ...prev, pageSlug: page.slug }))}>
                      기간 설정
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="조건에 맞는 페이지가 없습니다."
          description="검색어나 상태 필터를 조정해 다시 확인해주세요."
          actionLabel="검색 초기화"
          onAction={() => setSearchQuery('')}
        />
      )}
    </div>
  );
}
