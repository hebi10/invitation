'use client';

import { useEffect, useMemo, useState } from 'react';

import type { InvitationPageSummary } from '@/services';
import { getInvitationPublicAccessState } from '@/lib/invitationPublicAccess';
import type { InvitationProductTier } from '@/types/invitationPage';

import { EmptyState, FilterToolbar, Pagination, StatusBadge } from '.';
import {
  formatDateTime,
  PAGE_CATEGORY_TABS,
  type PageCategoryTabKey,
  type PageEventTypeFilter,
  PAGE_SORT_LABELS,
  PAGE_STATUS_LABELS,
  SHORTCUT_ITEMS,
  type PageSort,
  type PageStatusFilter,
  type ShortcutKey,
  getPageCategoryMeta,
  getPageCategoryCreateWizardHref,
  getAvailableShortcuts,
  getPageCategoryPreviewLinks,
  isImplementedPageCategory,
} from './adminPageUtils';
import styles from '../page.module.css';

const PAGE_SIZE_OPTIONS = [10, 30, 50, 100] as const;

const TIER_OPTIONS: InvitationProductTier[] = ['standard', 'deluxe', 'premium'];

function parsePageSize(value: string) {
  const parsed = Number(value);
  return PAGE_SIZE_OPTIONS.find((option) => option === parsed) ?? PAGE_SIZE_OPTIONS[0];
}

interface AdminPagesTabProps {
  loading: boolean;
  refreshing: boolean;
  summaryLoading: boolean;
  weddingPages: InvitationPageSummary[];
  filteredPages: InvitationPageSummary[];
  pageSearch: string;
  pageEventTypeFilter: PageEventTypeFilter;
  pageShortcutFilter: 'all' | ShortcutKey;
  pageStatusFilter: PageStatusFilter;
  pageSort: PageSort;
  activePageCategory: PageCategoryTabKey;
  chips: Array<{ id: string; label: string; onRemove: () => void }>;
  onQueryChange: (updates: Record<string, string | null>) => void;
  onRefresh: () => void;
  onTogglePublished: (page: InvitationPageSummary, nextPublished: boolean) => void;
  onChangeTier: (page: InvitationPageSummary, nextTier: InvitationProductTier) => void;
  onEnableVariant: (page: InvitationPageSummary, variantKey: ShortcutKey) => void;
  onDisableVariant: (page: InvitationPageSummary, variantKey: ShortcutKey) => void;
  updatingPublishedPageSlug: string | null;
  updatingVariantToken: string | null;
  updatingTierPageSlug: string | null;
  deletingPageSlug: string | null;
  onDeletePage: (page: InvitationPageSummary) => void;
}

export default function AdminPagesTab({
  loading,
  refreshing,
  summaryLoading,
  weddingPages,
  filteredPages,
  pageSearch,
  pageEventTypeFilter: _pageEventTypeFilter,
  pageShortcutFilter,
  pageStatusFilter,
  pageSort,
  activePageCategory,
  chips,
  onQueryChange,
  onRefresh,
  onTogglePublished,
  onChangeTier,
  onEnableVariant,
  onDisableVariant,
  updatingPublishedPageSlug,
  updatingVariantToken,
  updatingTierPageSlug,
  deletingPageSlug,
  onDeletePage,
}: AdminPagesTabProps) {

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    PAGE_SIZE_OPTIONS[0]
  );
  const [selectedVariantByPage, setSelectedVariantByPage] = useState<Record<
    string,
    ShortcutKey | ''
  >>({});

  const totalPages = Math.max(1, Math.ceil(filteredPages.length / pageSize));
  const categoryLabel = getPageCategoryMeta(activePageCategory).label;
  const isWeddingCategory = activePageCategory === 'invitation';
  const isBirthdayCategory = activePageCategory === 'birthday';
  const usesShortcutVariants = activePageCategory === 'invitation';
  const createWizardHref = getPageCategoryCreateWizardHref(activePageCategory);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const currentInvitationPages = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredPages.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredPages, pageSize]);
  const activeFutureCategory = !isImplementedPageCategory(activePageCategory)
    ? PAGE_CATEGORY_TABS.find(
    (
      tab
    ): tab is Extract<
      (typeof PAGE_CATEGORY_TABS)[number],
      { title: string; description: string }
    > => tab.key === activePageCategory && 'title' in tab
      )
    : undefined;

  return (
    <div className={styles.panelStack}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>{categoryLabel} 페이지</h2>
          <p className={styles.sectionDescription}>
            공개 상태와 생성된 페이지 미리보기를 한곳에서 확인할 수 있습니다.
          </p>
        </div>
        <p className={styles.sectionMeta}>
          {summaryLoading
            ? '요약 불러오는 중'
            : `전체 ${weddingPages.length}개 중 ${filteredPages.length}개 표시`}
        </p>
      </div>

      {activeFutureCategory ? (
        <div className={styles.todoPanel}>
          <span className={styles.todoBadge}>TODO</span>
          <h3 className={styles.todoTitle}>{activeFutureCategory.title}</h3>
          <p className={styles.todoDescription}>{activeFutureCategory.description}</p>
                    <ul className={styles.todoList}>
            <li>?? ??? ??</li>
            <li>?? ?? ??? ?? ??</li>
            <li>?? ? ?? ?? ??</li>
          </ul>
        </div>
      ) : (
        <>
      <div className={styles.createPanelActions}>
        <p className={styles.createPanelMeta}>
          새 페이지 생성은 모바일 생성 흐름에서 시작합니다. 상세 편집으로 들어가기 전에
          템플릿, 패키지, slug와 기본 정보를 먼저 설정해 주세요.
        </p>
        <div className={styles.tableActions}>
          <a href="/page-editor" className="admin-button admin-button-primary" target="_blank" rel="noreferrer">
            새 페이지 관리자 생성
          </a>
          <a
            href={createWizardHref}
            className="admin-button admin-button-secondary"
            target="_blank"
            rel="noreferrer"
          >
            새 페이지 모바일 생성
          </a>
        </div>
      </div>

      {isWeddingCategory ? (
        <div className={styles.shortcutStrip}>
        {SHORTCUT_ITEMS.map((shortcut) => {
          const count = weddingPages.filter(
            (page) => page.variants?.[shortcut.key]?.available
          ).length;
          const isActive = pageShortcutFilter === shortcut.key;

          return (
            <button
              key={shortcut.key}
              type="button"
              className={`${styles.shortcutPill} ${
                isActive ? styles.shortcutPillActive : ''
              }`}
              onClick={() =>
                onQueryChange({ shortcut: isActive ? null : shortcut.key })
              }
            >
              <span>{shortcut.label}</span>
              <strong>{count}</strong>
            </button>
          );
        })}
        </div>
      ) : null}

      <FilterToolbar
        fields={
          <>
            <label className="admin-field">
              <span className="admin-field-label">검색</span>
              <input
                className="admin-input"
                type="search"
                placeholder="제목, slug 또는 예식장명으로 검색"
                value={pageSearch}
                onChange={(event) =>
                  onQueryChange({ pageQ: event.target.value || null })
                }
              />
            </label>

            {isWeddingCategory ? (
              <label className="admin-field">
              <span className="admin-field-label">연결 상태</span>
              <select
                className="admin-select"
                value={pageStatusFilter}
                onChange={(event) =>
                  onQueryChange({ pageStatus: event.target.value })
                }
              >
                {Object.entries(PAGE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              </label>
            ) : null}

            {isWeddingCategory ? (
              <label className="admin-field">
              <span className="admin-field-label">미리보기 유형</span>
              <select
                className="admin-select"
                value={pageShortcutFilter}
                onChange={(event) =>
                  onQueryChange({ shortcut: event.target.value })
                }
              >
                <option value="all">전체 미리보기</option>
                {SHORTCUT_ITEMS.map((shortcut) => (
                  <option key={shortcut.key} value={shortcut.key}>
                    {shortcut.label}
                  </option>
                ))}
              </select>
              </label>
            ) : null}

            <label className="admin-field">
              <span className="admin-field-label">정렬</span>
              <select
                className="admin-select"
                value={pageSort}
                onChange={(event) =>
                  onQueryChange({ pageSort: event.target.value })
                }
              >
                {Object.entries(PAGE_SORT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </>
        }
        actions={
          <>
            <button
              type="button"
              className="admin-button admin-button-secondary"
              onClick={onRefresh}
              disabled={loading || refreshing}
            >
              {refreshing ? '새로고침 중' : loading ? '불러오는 중' : '새로고침'}
            </button>
            <button
              type="button"
              className="admin-button admin-button-ghost"
              onClick={() =>
                onQueryChange({
                  pageQ: null,
                  shortcut: null,
                  pageStatus: null,
                  pageSort: null,
                })
              }
            >
              필터 초기화
            </button>
          </>
        }
        chips={chips}
      />

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>{categoryLabel} 페이지를 불러오는 중입니다.</p>
        </div>
      ) : filteredPages.length > 0 ? (
        <>
          <div className={styles.tableActions}>
            <label className="admin-field">
              <span className="admin-field-label">페이지당 개수</span>
              <select
                className="admin-select"
                value={String(pageSize)}
                onChange={(event) => {
                  setPageSize(parsePageSize(event.target.value));
                  setCurrentPage(1);
                }}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}개
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.tableCard}>
            <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="청첩장 테이블">
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>페이지</th>
                    <th>{isBirthdayCategory ? '파티 정보' : '예식 정보'}</th>
                    <th>미리보기</th>
                    <th>공개 상태</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {currentInvitationPages.map((page, index) => {
                    const links = getAvailableShortcuts(page);
                    const categoryPreviewLinks = getPageCategoryPreviewLinks(
                      activePageCategory,
                      page
                    );
                    const previewAccess = getInvitationPublicAccessState(page);
                    const isUpdatingPublished = updatingPublishedPageSlug === page.slug;
                    const isDeletingPage = deletingPageSlug === page.slug;
                    const selectedVariantKey = selectedVariantByPage[page.slug] ?? '';
                    const selectedVariant = links.find(
                      (link) => link.key === selectedVariantKey
                    );
                    const selectedMissingShortcut = SHORTCUT_ITEMS.find(
                      (shortcut) => shortcut.key === selectedVariantKey
                    );
                    const isSelectedVariantUpdating =
                      !!selectedVariantKey &&
                      updatingVariantToken === `${page.slug}:${selectedVariantKey}`;
                    const missingShortcuts = SHORTCUT_ITEMS.filter(
                      (shortcut) => !page.variants?.[shortcut.key]?.available
                    );

                    return (
                      <tr key={page.slug} className={styles.tableRowInteractive}>
                        <td>
                          <div className={styles.tablePrimary}>
                            <span className={styles.rowNumber}>
                              {filteredPages.length - ((currentPage - 1) * pageSize + index)}
                            </span>
                            <div>
                              <a
                                href={`/page-editor/${page.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.primaryCellLink}
                              >
                                <p className={styles.tableTitle}>{page.displayName}</p>
                                <p className={styles.tableSubtext}>{page.slug}</p>
                                {page.createdAt ? (
                                  <p className={styles.tableSubtext}>
                                    {formatDateTime(page.createdAt)}
                                  </p>
                                ) : null}
                              </a>
                              <select
                                className="admin-select"
                                value={page.productTier}
                                disabled={updatingTierPageSlug === page.slug}
                                onChange={(event) =>
                                  onChangeTier(page, event.target.value as InvitationProductTier)
                                }
                                aria-label={`${page.displayName} 서비스 등급`}
                              >
                                {TIER_OPTIONS.map((tier) => (
                                  <option key={tier} value={tier}>
                                    {tier.toUpperCase()}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className={styles.metaStack}>
                            <span>{page.date || '날짜 미정'}</span>
                            <span className={styles.tableSubtext}>
                              {page.venue || (isBirthdayCategory ? '파티 장소 정보 없음' : '예식장 정보 없음')}
                            </span>
                          </div>
                        </td>
                        <td>
                          {!usesShortcutVariants ? (
                            <div className={styles.actionStack}>
                              {categoryPreviewLinks.map((link, linkIndex) => (
                                <a
                                  key={`${page.slug}-${link.key}`}
                                  href={link.path}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={
                                    linkIndex === 0
                                      ? 'admin-button admin-button-primary'
                                      : 'admin-button admin-button-secondary'
                                  }
                                >
                                  {link.label} 열기
                                </a>
                              ))}
                            </div>
                          ) : (
                            <div className={styles.variantPreviewGrid}>
                            {!previewAccess.isPublic ? (
                              <div className={styles.previewWarningCard}>
                                <span className={styles.previewWarningLabel}>
                                  {previewAccess.adminLabel}
                                </span>
                                <span className={styles.previewWarningText}>
                                  {previewAccess.adminDescription}
                                </span>
                            </div>
                              ) : null}
                            <select
                              className="admin-select"
                              value={selectedVariantKey}
                              aria-label={`${page.displayName} 디자인 미리보기 선택`}
                              onChange={(event) => {
                                const value = event.currentTarget.value as ShortcutKey | '';
                                setSelectedVariantByPage((previous) => ({
                                  ...previous,
                                  [page.slug]: value,
                                }));
                              }}
                            >
                              <option value="" disabled>
                                디자인을 선택하세요
                              </option>
                              {links.length > 0 ? (
                                <optgroup label="생성된 디자인">
                                  {links.map((link) => (
                                    <option
                                      key={`${page.slug}-existing-${link.key}`}
                                      value={link.key}
                                      disabled={updatingVariantToken === `${page.slug}:${link.key}`}
                                    >
                                      {link.label}
                                    </option>
                                  ))}
                                </optgroup>
                              ) : null}
                              {missingShortcuts.length > 0 ? (
                                <optgroup label="미생성 디자인">
                                  {missingShortcuts.map((shortcut) => (
                                    <option
                                      key={`${page.slug}-create-${shortcut.key}`}
                                      value={shortcut.key}
                                      disabled={
                                        updatingVariantToken === `${page.slug}:${shortcut.key}`
                                      }
                                    >
                                      {shortcut.label}
                                    </option>
                                  ))}
                                </optgroup>
                              ) : null}
                              {links.length === 0 && missingShortcuts.length === 0 ? (
                                <option value="" disabled>
                                  선택 가능한 디자인이 없습니다.
                                </option>
                              ) : null}
                            </select>
                            {selectedVariantKey ? (
                              <div className={styles.actionStack}>
                                <p className={styles.tableSubtext}>
                                  선택: {selectedVariant ? selectedVariant.label : selectedMissingShortcut?.label}
                                </p>
                                <p className={styles.tableSubtext}>
                                  상태: {selectedVariant ? '생성됨' : '미생성'}
                                </p>
                                {selectedVariant ? (
                                  <>
                                    <button
                                      type="button"
                                      className="admin-button admin-button-primary"
                                      disabled={isSelectedVariantUpdating}
                                      onClick={() => {
                                        if (selectedVariant.path) {
                                          window.open(selectedVariant.path, '_blank', 'noopener,noreferrer');
                                        }
                                      }}
                                    >
                                      열기
                                    </button>
                                    <button
                                      type="button"
                                      className="admin-button admin-button-secondary"
                                      disabled={isSelectedVariantUpdating}
                                      onClick={() =>
                                        onDisableVariant(page, selectedVariantKey as ShortcutKey)
                                      }
                                    >
                                      제거
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    className="admin-button admin-button-primary"
                                    disabled={isSelectedVariantUpdating}
                                    onClick={() =>
                                      onEnableVariant(page, selectedVariantKey as ShortcutKey)
                                    }
                                  >
                                    생성
                                  </button>
                                )}
                              </div>
                            ) : null}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className={styles.statusCell}>
                            <StatusBadge tone={page.published ? 'success' : 'neutral'}>
                              {page.published ? '공개' : '비공개'}
                            </StatusBadge>
                            <select
                              className={`admin-select ${styles.statusSelect}`}
                              value={page.published ? 'published' : 'private'}
                              disabled={isUpdatingPublished}
                              onChange={(event) =>
                                onTogglePublished(
                                  page,
                                  event.target.value === 'published'
                                )
                              }
                              aria-label={`${page.displayName} 공개 상태`}
                            >
                              <option value="published">공개</option>
                              <option value="private">비공개</option>
                            </select>
                          </div>
                        </td>
                        <td>
                          <div className={styles.actionStack}>
                            <div className={styles.tableActions}>
                              <a
                                href={`/page-editor/${page.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="admin-button admin-button-primary"
                              >
                                에디터
                              </a>
                              <a
                                href={`/page-wizard/${page.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="admin-button admin-button-secondary"
                              >
                                모바일
                              </a>
                              <button
                                type="button"
                                className="admin-button admin-button-danger"
                                disabled={isDeletingPage}
                                onClick={() => onDeletePage(page)}
                              >
                                {isDeletingPage ? '완전 삭제 중' : '완전 삭제'}
                              </button>
                            </div>
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
            {currentInvitationPages.map((page) => {
              const links = getAvailableShortcuts(page);
              const categoryPreviewLinks = getPageCategoryPreviewLinks(
                activePageCategory,
                page
              );
              const isDeletingPage = deletingPageSlug === page.slug;
              const selectedVariantKey = selectedVariantByPage[page.slug] ?? '';
              const selectedVariant = links.find((link) => link.key === selectedVariantKey);
              const selectedMissingShortcut = SHORTCUT_ITEMS.find(
                (shortcut) => shortcut.key === selectedVariantKey
              );
              const isSelectedVariantUpdating =
                !!selectedVariantKey &&
                updatingVariantToken === `${page.slug}:${selectedVariantKey}`;
              const missingShortcuts = SHORTCUT_ITEMS.filter(
                (shortcut) => !page.variants?.[shortcut.key]?.available
              );

              return (
                <article key={page.slug} className={styles.mobileCard}>
                  <div className={styles.mobileCardHead}>
                    <div>
                      <h3 className={styles.mobileCardTitle}>{page.displayName}</h3>
                      <p className={styles.mobileCardSlug}>{page.slug}</p>
                      {page.createdAt ? (
                        <p className={styles.tableSubtext}>
                          {formatDateTime(page.createdAt)}
                        </p>
                      ) : null}
                      <select
                        className="admin-select"
                        value={page.productTier}
                        disabled={updatingTierPageSlug === page.slug}
                        onChange={(event) =>
                          onChangeTier(page, event.target.value as InvitationProductTier)
                        }
                        aria-label={`${page.displayName} 서비스 등급`}
                      >
                        {TIER_OPTIONS.map((tier) => (
                          <option key={tier} value={tier}>
                            {tier.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.statusCell}>
                      <StatusBadge tone={page.published ? 'success' : 'neutral'}>
                        {page.published ? '공개' : '비공개'}
                      </StatusBadge>
                      <select
                        className={`admin-select ${styles.statusSelect}`}
                        value={page.published ? 'published' : 'private'}
                        disabled={updatingPublishedPageSlug === page.slug}
                        onChange={(event) =>
                          onTogglePublished(
                            page,
                            event.target.value === 'published'
                          )
                        }
                        aria-label={`${page.displayName} 공개 상태`}
                      >
                        <option value="published">공개</option>
                        <option value="private">비공개</option>
                      </select>
                    </div>
                  </div>
                  {!usesShortcutVariants ? (
                    <div className={styles.mobileCardActions}>
                      {categoryPreviewLinks.map((link, linkIndex) => (
                        <a
                          key={`${page.slug}-mobile-${link.key}`}
                          href={link.path}
                          target="_blank"
                          rel="noreferrer"
                          className={
                            linkIndex === 0
                              ? 'admin-button admin-button-primary'
                              : 'admin-button admin-button-secondary'
                          }
                        >
                          {link.label} 열기
                        </a>
                      ))}
                    </div>
                  ) : (
                    <>
                      <select
                        className="admin-select"
                        value={selectedVariantKey}
                        aria-label={`${page.displayName} 모바일 디자인 미리보기 선택`}
                        onChange={(event) => {
                          const value = event.currentTarget.value as ShortcutKey | '';
                          setSelectedVariantByPage((previous) => ({
                            ...previous,
                            [page.slug]: value,
                          }));
                        }}
                      >
                        <option value="" disabled>
                          디자인을 선택하세요
                        </option>
                        {links.length > 0 ? (
                          <optgroup label="생성된 디자인">
                            {links.map((link) => (
                              <option
                                key={`${page.slug}-mobile-existing-${link.key}`}
                                value={link.key}
                                disabled={
                                  updatingVariantToken === `${page.slug}:${link.key}`
                                }
                              >
                                {link.label}
                              </option>
                            ))}
                          </optgroup>
                        ) : null}
                        {missingShortcuts.length > 0 ? (
                          <optgroup label="미생성 디자인">
                            {missingShortcuts.map((shortcut) => (
                              <option
                                key={`${page.slug}-mobile-create-${shortcut.key}`}
                                value={shortcut.key}
                                disabled={
                                  updatingVariantToken === `${page.slug}:${shortcut.key}`
                                }
                              >
                                {shortcut.label}
                              </option>
                            ))}
                          </optgroup>
                        ) : null}
                        {links.length === 0 && missingShortcuts.length === 0 ? (
                          <option value="" disabled>
                            선택 가능한 디자인이 없습니다.
                          </option>
                        ) : null}
                      </select>
                      {selectedVariantKey ? (
                      <div className={styles.actionStack}>
                        <p className={styles.tableSubtext}>
                          선택: {selectedVariant ? selectedVariant.label : selectedMissingShortcut?.label}
                        </p>
                        <p className={styles.tableSubtext}>
                          상태: {selectedVariant ? '생성됨' : '미생성'}
                        </p>
                        {selectedVariant ? (
                          <>
                            <button
                              type="button"
                              className="admin-button admin-button-primary"
                              disabled={isSelectedVariantUpdating}
                              onClick={() => {
                                if (selectedVariant.path) {
                                  window.open(selectedVariant.path, '_blank', 'noopener,noreferrer');
                                }
                              }}
                            >
                              열기
                            </button>
                            <button
                              type="button"
                              className="admin-button admin-button-secondary"
                              disabled={isSelectedVariantUpdating}
                              onClick={() =>
                                onDisableVariant(page, selectedVariantKey as ShortcutKey)
                              }
                            >
                              제거
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="admin-button admin-button-primary"
                            disabled={isSelectedVariantUpdating}
                            onClick={() =>
                              onEnableVariant(page, selectedVariantKey as ShortcutKey)
                            }
                          >
                            생성
                          </button>
                        )}
                      </div>
                      ) : null}
                    </>
                  )}

                  <div className={styles.actionStack}>
                    <div className={styles.mobileCardActions}>
                      <a
                        href={`/page-editor/${page.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="admin-button admin-button-primary"
                      >
                        에디터
                      </a>
                      <a
                        href={`/page-wizard/${page.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="admin-button admin-button-secondary"
                      >
                        모바일
                      </a>
                      <button
                        type="button"
                        className="admin-button admin-button-danger"
                        disabled={isDeletingPage}
                        onClick={() => onDeletePage(page)}
                      >
                        {isDeletingPage ? '완전 삭제 중' : '완전 삭제'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredPages.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </>
      ) : (
        <EmptyState
          title="현재 필터 조건에 맞는 청첩장 페이지가 없습니다."
          description="검색어 또는 필터 조건이 너무 좁을 수 있습니다. 필터를 조정하거나 목록을 새로고침해 주세요."
          highlights={[
            '이 목록에서 바로 에디터 또는 모바일로 기존 페이지를 열 수 있습니다.',
            '생성된 디자인별 미리보기를 통해 실제 공개 가능한 경로를 바로 확인할 수 있습니다.',
          ]}
          actionLabel="필터 초기화"
          onAction={() =>
            onQueryChange({
              pageQ: null,
              shortcut: null,
              pageStatus: null,
              pageSort: null,
            })
          }
          secondaryActionLabel="현재 화면 새로고침"
          onSecondaryAction={onRefresh}
        />
      )}
        </>
      )}
    </div>
  );
}
