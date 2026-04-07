'use client';

import { useEffect, useMemo, useState } from 'react';

import type { ClientPassword, InvitationPageSummary } from '@/services';

import { EmptyState, FilterToolbar, StatusBadge } from '.';
import { formatDateTime } from './adminPageUtils';
import styles from '../page.module.css';

interface AdminClientPasswordsTabProps {
  loading: boolean;
  pages: InvitationPageSummary[];
  passwords: ClientPassword[];
  savingPageSlug: string | null;
  onRefresh: () => void;
  onSave: (pageSlug: string, password: string) => void;
}

type PasswordEntry = {
  slug: string;
  displayName: string;
  password: string;
  hasPassword: boolean;
  passwordVersion: number;
  legacyPlaintextStored: boolean;
  updatedAt: Date | null;
};

function getPasswordStatus(entry: PasswordEntry, savingPageSlug: string | null) {
  if (savingPageSlug === entry.slug) {
    return {
      label: '저장 중',
      tone: 'primary' as const,
      description: '새 비밀번호를 저장하고 있습니다.',
    };
  }

  if (entry.password.trim()) {
    return {
      label: '재설정 대기',
      tone: 'warning' as const,
      description: '입력한 값은 저장 전까지 적용되지 않습니다.',
    };
  }

  if (entry.legacyPlaintextStored) {
    return {
      label: '레거시',
      tone: 'warning' as const,
      description: '평문 흔적이 남아 있습니다. 재설정을 권장합니다.',
    };
  }

  if (entry.hasPassword) {
    return {
      label: '설정됨',
      tone: 'success' as const,
      description: entry.updatedAt
        ? `마지막 변경 ${formatDateTime(entry.updatedAt)} · v${entry.passwordVersion}`
        : `비밀번호가 설정되어 있습니다. · v${entry.passwordVersion}`,
    };
  }

  return {
    label: '미설정',
    tone: 'neutral' as const,
    description: '비밀번호를 새로 설정해야 고객 편집 로그인이 가능합니다.',
  };
}

export default function AdminClientPasswordsTab({
  loading,
  pages,
  passwords,
  savingPageSlug,
  onRefresh,
  onSave,
}: AdminClientPasswordsTabProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [visibleRows, setVisibleRows] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setDrafts({});
  }, [passwords]);

  const pageNameMap = useMemo(
    () => new Map(pages.map((page) => [page.slug, page.displayName] as const)),
    [pages]
  );

  const entries = useMemo(() => {
    const passwordRecordMap = new Map(
      passwords.map((passwordRecord) => [passwordRecord.pageSlug, passwordRecord] as const)
    );
    const allSlugs = new Set<string>([
      ...pages.map((page) => page.slug),
      ...passwords.map((passwordRecord) => passwordRecord.pageSlug),
    ]);

    return [...allSlugs]
      .map<PasswordEntry>((slug) => {
        const record = passwordRecordMap.get(slug) ?? null;

        return {
          slug,
          displayName: pageNameMap.get(slug) ?? slug,
          password: drafts[slug] ?? '',
          hasPassword: record?.hasPassword ?? false,
          passwordVersion: record?.passwordVersion ?? 0,
          legacyPlaintextStored: record?.legacyPlaintextStored ?? false,
          updatedAt: record?.updatedAt ?? null,
        };
      })
      .filter((entry) =>
        `${entry.displayName} ${entry.slug}`
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase())
      )
      .sort((left, right) => left.displayName.localeCompare(right.displayName, 'ko'));
  }, [drafts, pageNameMap, pages, passwords, searchQuery]);

  const renderPasswordInput = (entry: PasswordEntry, isVisible: boolean) => (
    <div className={styles.passwordFieldGroup}>
      <div className={styles.inlineInputGroup}>
        <input
          className="admin-input"
          type={isVisible ? 'text' : 'password'}
          value={entry.password}
          placeholder="새 비밀번호 입력"
          onChange={(event) =>
            setDrafts((current) => ({
              ...current,
              [entry.slug]: event.target.value,
            }))
          }
        />
        <button
          type="button"
          className="admin-button admin-button-ghost"
          onClick={() =>
            setVisibleRows((current) => ({
              ...current,
              [entry.slug]: !current[entry.slug],
            }))
          }
        >
          {isVisible ? '숨기기' : '보기'}
        </button>
      </div>
      <span className={styles.inlineMetaText}>
        현재 비밀번호는 다시 표시되지 않습니다. 저장하면 새 비밀번호로 재설정됩니다.
      </span>
    </div>
  );

  return (
    <div className={styles.panelStack}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>고객 비밀번호</h2>
          <p className={styles.sectionDescription}>
            평문 조회를 제거하고 재설정만 허용합니다. 저장된 비밀번호는 해시로만 보관됩니다.
          </p>
        </div>
        <p className={styles.sectionMeta}>현재 {entries.length}개 페이지</p>
      </div>

      <FilterToolbar
        fields={
          <>
            <label className="admin-field">
              <span className="admin-field-label">페이지 검색</span>
              <input
                className="admin-input"
                type="search"
                placeholder="이름 또는 slug 검색"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <div className={styles.metaStack}>
              <span className={styles.toolbarNote}>
                비밀번호는 재설정만 가능하며, 기존 값은 관리자에게도 다시 노출되지 않습니다.
              </span>
            </div>
          </>
        }
        actions={
          <>
            <button
              type="button"
              className="admin-button admin-button-secondary"
              onClick={onRefresh}
              disabled={loading}
            >
              {loading ? '불러오는 중...' : '새로고침'}
            </button>
            {searchQuery ? (
              <button
                type="button"
                className="admin-button admin-button-ghost"
                onClick={() => setSearchQuery('')}
              >
                검색 초기화
              </button>
            ) : null}
          </>
        }
        chips={
          searchQuery
            ? [
                {
                  id: 'password-search',
                  label: `검색: ${searchQuery}`,
                  onRemove: () => setSearchQuery(''),
                },
              ]
            : []
        }
      />

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>비밀번호 목록을 불러오는 중입니다.</p>
        </div>
      ) : entries.length > 0 ? (
        <>
          <div className={styles.tableCard}>
            <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="비밀번호 테이블">
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>페이지</th>
                    <th>상태</th>
                    <th>새 비밀번호</th>
                    <th>주요 작업</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const status = getPasswordStatus(entry, savingPageSlug);
                    const canSave = Boolean(entry.password.trim());
                    const canOpenEditor = true;
                    const isVisible = visibleRows[entry.slug] ?? false;

                    return (
                      <tr key={entry.slug} className={styles.tableRowInteractive}>
                        <td>
                          <div className={styles.tablePrimary}>
                            <span className={styles.rowNumber}>{entries.length}</span>
                            <div>
                              <p className={styles.tableTitle}>{entry.displayName}</p>
                              <p className={styles.tableSubtext}>{entry.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className={styles.statusCell}>
                            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                            <span className={styles.tableSubtext}>{status.description}</span>
                          </div>
                        </td>
                        <td>{renderPasswordInput(entry, isVisible)}</td>
                        <td>
                          <div className={styles.actionStack}>
                            <div className={styles.tableActions}>
                              <button
                                type="button"
                                className="admin-button admin-button-primary"
                                disabled={savingPageSlug === entry.slug || !canSave}
                                onClick={() => onSave(entry.slug, entry.password.trim())}
                              >
                                {savingPageSlug === entry.slug
                                  ? '저장 중...'
                                  : entry.hasPassword
                                    ? '재설정'
                                    : '설정'}
                              </button>
                              {canOpenEditor ? (
                                <a
                                  className="admin-button admin-button-ghost"
                                  href={`/page-editor/${entry.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  편집기 열기
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  className="admin-button admin-button-ghost"
                                  disabled
                                >
                                  비밀번호 필요
                                </button>
                              )}
                            </div>
                            <span className={styles.actionHint}>
                              {entry.hasPassword
                                ? '현재 비밀번호는 볼 수 없고 새 비밀번호로만 교체할 수 있습니다.'
                                : '비밀번호를 한 번 설정하면 고객 편집 로그인이 활성화됩니다.'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.mobileList}>
            {entries.map((entry) => {
              const status = getPasswordStatus(entry, savingPageSlug);
              const canSave = Boolean(entry.password.trim());
              const canOpenEditor = true;
              const isVisible = visibleRows[entry.slug] ?? false;

              return (
                <article key={entry.slug} className={styles.mobileCard}>
                  <div className={styles.mobileCardHead}>
                    <div>
                      <h3 className={styles.mobileCardTitle}>{entry.displayName}</h3>
                      <p className={styles.mobileCardSlug}>{entry.slug}</p>
                    </div>
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </div>

                  {renderPasswordInput(entry, isVisible)}

                  <div className={styles.actionStack}>
                    <span className={styles.tableSubtext}>{status.description}</span>
                    <div className={styles.mobileCardActions}>
                      <button
                        type="button"
                        className="admin-button admin-button-primary"
                        disabled={savingPageSlug === entry.slug || !canSave}
                        onClick={() => onSave(entry.slug, entry.password.trim())}
                      >
                        {savingPageSlug === entry.slug
                          ? '저장 중...'
                          : entry.hasPassword
                            ? '재설정'
                            : '설정'}
                      </button>
                      {canOpenEditor ? (
                        <a
                          className="admin-button admin-button-ghost"
                          href={`/page-editor/${entry.slug}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          편집기 열기
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="admin-button admin-button-ghost"
                          disabled
                        >
                          비밀번호 필요
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <EmptyState
          title="조건에 맞는 페이지가 없습니다."
          description="페이지 검색 조건을 다시 확인하거나 비밀번호 상태를 새로고침해 주세요."
          highlights={[
            '현재 비밀번호는 표시하지 않고 재설정만 허용합니다.',
            '저장 후에는 해시 정보와 마지막 변경 시각만 남습니다.',
          ]}
          actionLabel={searchQuery ? '검색 초기화' : '새로고침'}
          onAction={searchQuery ? () => setSearchQuery('') : onRefresh}
          secondaryActionLabel={searchQuery ? '새로고침' : undefined}
          onSecondaryAction={searchQuery ? onRefresh : undefined}
        />
      )}
    </div>
  );
}
