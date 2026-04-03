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
  savedPassword: string;
  hasPassword: boolean;
  updatedAt: Date | null;
  hasDraftChange: boolean;
};

function getPasswordStatus(entry: PasswordEntry, savingPageSlug: string | null) {
  if (savingPageSlug === entry.slug) {
    return {
      label: '저장 중',
      tone: 'primary' as const,
      description: '현재 입력값을 저장하고 있습니다.',
    };
  }

  if (entry.hasDraftChange && entry.password.trim()) {
    return {
      label: '입력 중',
      tone: 'warning' as const,
      description: '저장 전 임시 입력 상태입니다.',
    };
  }

  if (entry.hasPassword) {
    return {
      label: '저장 완료',
      tone: 'success' as const,
      description: entry.updatedAt
        ? `마지막 저장 ${formatDateTime(entry.updatedAt)}`
        : '비밀번호가 저장되어 있습니다.',
    };
  }

  return {
    label: '미설정',
    tone: 'neutral' as const,
    description: '비밀번호를 저장하면 고객 편집기를 열 수 있습니다.',
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
    setDrafts(
      passwords.reduce<Record<string, string>>((accumulator, passwordRecord) => {
        accumulator[passwordRecord.pageSlug] = passwordRecord.password;
        return accumulator;
      }, {})
    );
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
        const savedPassword = record?.password ?? '';
        const draftPassword = drafts[slug] ?? savedPassword;

        return {
          slug,
          displayName: pageNameMap.get(slug) ?? slug,
          password: draftPassword,
          savedPassword,
          hasPassword: Boolean(record?.password),
          updatedAt: record?.updatedAt ?? null,
          hasDraftChange: draftPassword !== savedPassword,
        };
      })
      .filter((entry) =>
        `${entry.displayName} ${entry.slug}`
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase())
      )
      .sort((left, right) => left.displayName.localeCompare(right.displayName, 'ko'));
  }, [drafts, pageNameMap, pages, passwords, searchQuery]);

  return (
    <div className={styles.panelStack}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>고객 비밀번호</h2>
          <p className={styles.sectionDescription}>
            페이지별 고객 비밀번호를 저장하고, 저장 완료 상태일 때만 편집기로 안전하게
            이동할 수 있습니다.
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
                placeholder="이름 또는 slug로 찾기"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <div className={styles.metaStack}>
              <span className={styles.toolbarNote}>
                기본은 숨김 상태로 표시되며, 저장이 완료된 뒤에만 편집기 열기를
                권장합니다.
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
              {loading ? '불러오는 중..' : '새로고침'}
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
            <div className={styles.tableScroll}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>페이지</th>
                    <th>상태</th>
                    <th>비밀번호 입력</th>
                    <th>주요 작업</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => {
                    const status = getPasswordStatus(entry, savingPageSlug);
                    const canSave =
                      Boolean(entry.password.trim()) && entry.hasDraftChange;
                    const canOpenEditor = entry.hasPassword && !entry.hasDraftChange;
                    const isVisible = visibleRows[entry.slug] ?? false;

                    return (
                      <tr key={entry.slug} className={styles.tableRowInteractive}>
                        <td>
                          <div className={styles.tablePrimary}>
                            <span className={styles.rowNumber}>
                              {entries.length - index}
                            </span>
                            <div>
                              <p className={styles.tableTitle}>{entry.displayName}</p>
                              <p className={styles.tableSubtext}>{entry.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className={styles.statusCell}>
                            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                            <span className={styles.tableSubtext}>
                              {status.description}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.passwordFieldGroup}>
                            <div className={styles.inlineInputGroup}>
                              <input
                                className="admin-input"
                                type={isVisible ? 'text' : 'password'}
                                value={entry.password}
                                placeholder="비밀번호 입력"
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
                              {entry.hasDraftChange
                                ? '저장 전에는 편집기로 이동할 수 없습니다.'
                                : entry.hasPassword
                                  ? '저장된 비밀번호를 기준으로 고객 편집기가 열립니다.'
                                  : '아직 저장된 비밀번호가 없습니다.'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.actionStack}>
                            <div className={styles.tableActions}>
                              <button
                                type="button"
                                className="admin-button admin-button-primary"
                                disabled={savingPageSlug === entry.slug || !canSave}
                                onClick={() => onSave(entry.slug, entry.password.trim())}
                              >
                                {savingPageSlug === entry.slug ? '저장 중..' : '저장'}
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
                                  저장 후 편집
                                </button>
                              )}
                            </div>
                            <span className={styles.actionHint}>
                              {canOpenEditor
                                ? '저장된 비밀번호 기준으로 고객 편집기를 엽니다.'
                                : '먼저 비밀번호를 저장하면 편집기를 바로 열 수 있습니다.'}
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
              const canSave = Boolean(entry.password.trim()) && entry.hasDraftChange;
              const canOpenEditor = entry.hasPassword && !entry.hasDraftChange;
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

                  <div className={styles.passwordFieldGroup}>
                    <div className={styles.inlineInputGroup}>
                      <input
                        className="admin-input"
                        type={isVisible ? 'text' : 'password'}
                        value={entry.password}
                        placeholder="비밀번호 입력"
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
                    <span className={styles.inlineMetaText}>{status.description}</span>
                  </div>

                  <div className={styles.actionStack}>
                    <div className={styles.mobileCardActions}>
                      <button
                        type="button"
                        className="admin-button admin-button-primary"
                        disabled={savingPageSlug === entry.slug || !canSave}
                        onClick={() => onSave(entry.slug, entry.password.trim())}
                      >
                        {savingPageSlug === entry.slug ? '저장 중..' : '저장'}
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
                          저장 후 편집
                        </button>
                      )}
                    </div>
                    <span className={styles.actionHint}>
                      {canOpenEditor
                        ? '저장 완료 상태입니다.'
                        : '입력값을 저장한 뒤 고객 편집기를 열어 주세요.'}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <EmptyState
          title="조건에 맞는 페이지가 없습니다."
          description="페이지 검색 조건을 다시 확인한 뒤 비밀번호를 저장해 주세요."
          highlights={[
            '비밀번호는 기본적으로 숨김 상태로 표시됩니다.',
            '저장 완료 상태에서만 고객 편집기로 바로 이동할 수 있습니다.',
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
