'use client';

import { useEffect, useMemo, useState } from 'react';

import type { ClientPassword, InvitationPageSummary } from '@/services';

import { EmptyState, FilterToolbar, StatusBadge } from '.';
import styles from '../page.module.css';

interface AdminClientPasswordsTabProps {
  loading: boolean;
  pages: InvitationPageSummary[];
  passwords: ClientPassword[];
  savingPageSlug: string | null;
  onRefresh: () => void;
  onSave: (pageSlug: string, password: string) => void;
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
    const allSlugs = new Set<string>([
      ...pages.map((page) => page.slug),
      ...passwords.map((passwordRecord) => passwordRecord.pageSlug),
    ]);

    return [...allSlugs]
      .map((slug) => ({
        slug,
        displayName: pageNameMap.get(slug) ?? slug,
        password: drafts[slug] ?? '',
        hasPassword: passwords.some(
          (passwordRecord) => passwordRecord.pageSlug === slug
        ),
      }))
      .sort((left, right) => left.displayName.localeCompare(right.displayName, 'ko'));
  }, [drafts, pageNameMap, pages, passwords]);

  return (
    <div className={styles.panelStack}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>고객 비밀번호</h2>
          <p className={styles.sectionDescription}>
            방명록 댓글 관리와 <code>/page-editor</code> 접근에 사용하는 페이지별
            고객 비밀번호를 관리합니다.
          </p>
        </div>
        <p className={styles.sectionMeta}>총 {entries.length}개 페이지</p>
      </div>

      <FilterToolbar
        fields={
          <div className={styles.metaStack}>
            <span>
              저장 시 <code>client-passwords</code>와 <code>client-access</code>가
              함께 동기화됩니다.
            </span>
          </div>
        }
        actions={
          <button
            type="button"
            className="admin-button admin-button-secondary"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? '불러오는 중...' : '새로고침'}
          </button>
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
                    <th>비밀번호</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => (
                    <tr key={entry.slug}>
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
                        <StatusBadge tone={entry.hasPassword ? 'success' : 'neutral'}>
                          {entry.hasPassword ? '설정됨' : '미설정'}
                        </StatusBadge>
                      </td>
                      <td>
                        <input
                          className="admin-input"
                          type="text"
                          value={entry.password}
                          placeholder="비밀번호 입력"
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [entry.slug]: event.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>
                        <div className={styles.tableActions}>
                          <button
                            type="button"
                            className="admin-button admin-button-primary"
                            disabled={
                              savingPageSlug === entry.slug ||
                              !entry.password.trim()
                            }
                            onClick={() => onSave(entry.slug, entry.password.trim())}
                          >
                            {savingPageSlug === entry.slug ? '저장 중...' : '저장'}
                          </button>
                          <a
                            className="admin-button admin-button-ghost"
                            href={`/page-editor/${entry.slug}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            편집기 열기
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.mobileList}>
            {entries.map((entry) => (
              <article key={entry.slug} className={styles.mobileCard}>
                <div className={styles.mobileCardHead}>
                  <div>
                    <h3 className={styles.mobileCardTitle}>{entry.displayName}</h3>
                    <p className={styles.mobileCardSlug}>{entry.slug}</p>
                  </div>
                  <StatusBadge tone={entry.hasPassword ? 'success' : 'neutral'}>
                    {entry.hasPassword ? '설정됨' : '미설정'}
                  </StatusBadge>
                </div>

                <input
                  className="admin-input"
                  type="text"
                  value={entry.password}
                  placeholder="비밀번호 입력"
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [entry.slug]: event.target.value,
                    }))
                  }
                />

                <div className={styles.mobileCardActions}>
                  <button
                    type="button"
                    className="admin-button admin-button-primary"
                    disabled={
                      savingPageSlug === entry.slug || !entry.password.trim()
                    }
                    onClick={() => onSave(entry.slug, entry.password.trim())}
                  >
                    {savingPageSlug === entry.slug ? '저장 중...' : '저장'}
                  </button>
                  <a
                    className="admin-button admin-button-ghost"
                    href={`/page-editor/${entry.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    편집기 열기
                  </a>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          title="관리할 페이지가 없습니다."
          description="페이지 목록을 다시 불러온 뒤 비밀번호를 설정해 주세요."
          actionLabel="새로고침"
          onAction={onRefresh}
        />
      )}
    </div>
  );
}
