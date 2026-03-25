'use client';

import React, { useEffect, useState } from 'react';
import { getAllClientPasswords, setClientPassword, deleteClientPassword, type ClientPassword } from '@/services';
import { getWeddingPagesClient, type WeddingPageInfo } from '@/utils';
import { EmptyState, FilterToolbar, StatusBadge, useAdminOverlay } from '@/app/admin/_components';
import { DEFAULT_PASSWORD, type PasswordStatusFilter } from '@/app/admin/_components/adminPageUtils';
import styles from './ClientPasswordManager.module.css';

interface ClientPasswordManagerProps {
  isVisible: boolean;
  statusFilter?: PasswordStatusFilter;
  onDataChanged?: () => void;
}

export default function ClientPasswordManager({
  isVisible,
  statusFilter = 'all',
  onDataChanged,
}: ClientPasswordManagerProps) {
  const [passwords, setPasswords] = useState<ClientPassword[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingPassword, setEditingPassword] = useState<{ pageSlug: string; password: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [localStatusFilter, setLocalStatusFilter] = useState<PasswordStatusFilter>(statusFilter);
  const [weddingPages, setWeddingPages] = useState<WeddingPageInfo[]>([]);
  const { confirm, showToast } = useAdminOverlay();

  useEffect(() => {
    setWeddingPages(getWeddingPagesClient());
  }, []);

  useEffect(() => {
    if (isVisible) {
      void loadPasswords();
    }
  }, [isVisible]);

  useEffect(() => {
    setLocalStatusFilter(statusFilter);
  }, [statusFilter]);

  const loadPasswords = async () => {
    try {
      setIsLoading(true);
      setError('');
      setPasswords(await getAllClientPasswords());
    } catch (loadError) {
      setError('비밀번호 목록을 불러오는데 실패했습니다.');
      console.error('비밀번호 로드 오류:', loadError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (pageSlug: string, passwordValue: string) => {
    if (!passwordValue.trim()) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    try {
      setError('');
      await setClientPassword(pageSlug, passwordValue);
      await loadPasswords();
      setEditingPassword(null);
      setNewPassword('');
      onDataChanged?.();
      showToast({
        title: '비밀번호를 저장했습니다.',
        message: '해당 페이지의 접근 비밀번호가 업데이트되었습니다.',
        tone: 'success',
      });
    } catch (updateError) {
      setError('비밀번호 업데이트에 실패했습니다.');
      console.error('비밀번호 업데이트 오류:', updateError);
      showToast({
        title: '비밀번호 저장에 실패했습니다.',
        message: '잠시 후 다시 시도해주세요.',
        tone: 'error',
      });
    }
  };

  const handleDeletePassword = async (pageSlug: string) => {
    const approved = await confirm({
      title: '비밀번호를 삭제할까요?',
      description: `삭제하면 기본 비밀번호(${DEFAULT_PASSWORD})가 적용됩니다.`,
      confirmLabel: '삭제',
      cancelLabel: '취소',
      tone: 'danger',
    });

    if (!approved) {
      return;
    }

    try {
      setError('');
      await deleteClientPassword(pageSlug);
      await loadPasswords();
      onDataChanged?.();
      showToast({
        title: '비밀번호를 삭제했습니다.',
        message: `기본 비밀번호(${DEFAULT_PASSWORD})가 다시 적용됩니다.`,
        tone: 'success',
      });
    } catch (deleteError) {
      setError('비밀번호 삭제에 실패했습니다.');
      console.error('비밀번호 삭제 오류:', deleteError);
      showToast({
        title: '비밀번호 삭제에 실패했습니다.',
        message: '잠시 후 다시 시도해주세요.',
        tone: 'error',
      });
    }
  };

  const startEditing = (pageSlug: string, currentPassword: string) => {
    setEditingPassword({ pageSlug, password: currentPassword });
    setNewPassword(currentPassword);
  };

  const cancelEditing = () => {
    setEditingPassword(null);
    setNewPassword('');
    setError('');
  };

  const getPasswordForPage = (pageSlug: string) => {
    const found = passwords.find((passwordItem) => passwordItem.pageSlug === pageSlug);
    return found ? found.password : DEFAULT_PASSWORD;
  };

  const hasPasswordInDB = (pageSlug: string) => passwords.some((passwordItem) => passwordItem.pageSlug === pageSlug);

  const filteredPages = [...weddingPages].reverse().filter((page) => {
    const hasCustomPassword = hasPasswordInDB(page.slug);
    const matchesStatus =
      localStatusFilter === 'all' ||
      (localStatusFilter === 'default' && !hasCustomPassword) ||
      (localStatusFilter === 'custom' && hasCustomPassword);
    const matchesSearch = `${page.displayName} ${page.slug} ${page.venue ?? ''}`.toLowerCase().includes(searchQuery.trim().toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const filterChips = [
    searchQuery
      ? {
          id: 'password-search',
          label: `검색: ${searchQuery}`,
          onRemove: () => setSearchQuery(''),
        }
      : null,
    localStatusFilter !== 'all'
      ? {
          id: 'password-status',
          label: `상태: ${localStatusFilter === 'default' ? '기본 비밀번호 사용' : '커스텀 비밀번호'}`,
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
          <h3 className={styles.title}>클라이언트 비밀번호 관리</h3>
          <p className={styles.subtitle}>페이지별 접근 비밀번호를 확인하고 기본값 사용 여부를 빠르게 점검할 수 있습니다.</p>
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
                placeholder="이름, slug, 장소로 검색"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>

            <label className="admin-field">
              <span className="admin-field-label">상태</span>
              <select className="admin-select" value={localStatusFilter} onChange={(event) => setLocalStatusFilter(event.target.value as PasswordStatusFilter)}>
                <option value="all">전체</option>
                <option value="default">기본 비밀번호 사용</option>
                <option value="custom">커스텀 비밀번호</option>
              </select>
            </label>
          </>
        }
        actions={
          <button type="button" className="admin-button admin-button-secondary" onClick={() => void loadPasswords()} disabled={isLoading}>
            {isLoading ? '새로고침 중...' : '새로고침'}
          </button>
        }
        chips={filterChips}
      />

      {error ? <div className={styles.errorMessage}>{error}</div> : null}

      {isLoading ? (
        <div className={styles.loading}>비밀번호 목록을 불러오는 중입니다.</div>
      ) : filteredPages.length > 0 ? (
        <div className={styles.passwordList}>
          {filteredPages.map((page) => {
            const hasCustomPassword = hasPasswordInDB(page.slug);
            const passwordValue = getPasswordForPage(page.slug);
            const passwordData = passwords.find((item) => item.pageSlug === page.slug);

            return (
              <div key={page.slug} className={styles.passwordItem}>
                <div className={styles.pageInfo}>
                  <div className={styles.pageInfoTop}>
                    <div>
                      <h4 className={styles.pageName}>{page.displayName}</h4>
                      <p className={styles.pageSlug}>{page.slug}</p>
                    </div>
                    <StatusBadge tone={hasCustomPassword ? 'success' : 'warning'}>
                      {hasCustomPassword ? '커스텀 설정' : '기본값 사용'}
                    </StatusBadge>
                  </div>

                  {(page.date || page.venue) ? (
                    <div className={styles.pageDetails}>
                      {page.date ? <span>{page.date}</span> : null}
                      {page.venue ? <span>{page.venue}</span> : null}
                    </div>
                  ) : null}
                </div>

                <div className={styles.passwordSection}>
                  {editingPassword?.pageSlug === page.slug ? (
                    <div className={styles.editForm}>
                      <input
                        type="text"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="새 비밀번호를 입력하세요"
                        className="admin-input"
                      />
                      <div className={styles.actionButtons}>
                        <button type="button" className="admin-button admin-button-primary" onClick={() => void handleUpdatePassword(page.slug, newPassword)}>
                          저장
                        </button>
                        <button type="button" className="admin-button admin-button-ghost" onClick={cancelEditing}>
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.passwordDisplay}>
                      <div className={styles.passwordValue}>
                        <span className={styles.password}>{passwordValue}</span>
                        {!hasCustomPassword ? <StatusBadge tone="warning">기본 비밀번호</StatusBadge> : null}
                      </div>

                      <div className={styles.actionButtons}>
                        <button
                          type="button"
                          className="admin-button admin-button-secondary"
                          onClick={() => startEditing(page.slug, passwordValue)}
                        >
                          {hasCustomPassword ? '수정' : '설정'}
                        </button>
                        {hasCustomPassword ? (
                          <button type="button" className="admin-button admin-button-danger" onClick={() => void handleDeletePassword(page.slug)}>
                            삭제
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.updateInfo}>
                  {passwordData ? `마지막 업데이트: ${passwordData.updatedAt.toLocaleDateString('ko-KR')}` : `설정된 값이 없어 기본 비밀번호(${DEFAULT_PASSWORD})를 사용합니다.`}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="조건에 맞는 페이지가 없습니다."
          description="검색어를 조정하거나 상단 카드에서 다른 상태로 이동해보세요."
          actionLabel="검색 초기화"
          onAction={() => setSearchQuery('')}
        />
      )}

      <div className={styles.notice}>
        비밀번호가 설정되지 않은 페이지는 기본값 <code>{DEFAULT_PASSWORD}</code>를 사용합니다. 운영 중에는 기본값 사용 페이지를 먼저 줄이는 것이 안전합니다.
      </div>
    </div>
  );
}
