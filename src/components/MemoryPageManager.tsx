'use client';

import { useEffect, useMemo, useState } from 'react';
import { EmptyState, FilterToolbar, StatusBadge, useAdminOverlay } from '@/app/admin/_components';
import { useAdmin } from '@/contexts';
import { getAllInvitationPages, getComments, type Comment, type InvitationPageSummary } from '@/services';
import {
  buildMemoryPageUrl,
  createMemoryPageDraftFromInvitation,
  createSelectedCommentSnapshot,
  deleteMemoryImageAsset,
  deleteMemoryPage,
  getMemoryPageByPageSlug,
  mergeInvitationGalleryImages,
  publishMemoryPage,
  saveMemoryPage,
  unpublishMemoryPage,
  uploadMemoryImages,
} from '@/services/memoryPageService';
import type { MemoryGalleryCategory, MemoryGalleryImage, MemoryPage } from '@/types/memoryPage';
import styles from './MemoryPageManager.module.css';

const GALLERY_CATEGORY_OPTIONS: Array<{ value: MemoryGalleryCategory; label: string }> = [
  { value: 'preWedding', label: '식전' },
  { value: 'ceremony', label: '본식' },
  { value: 'afterParty', label: '식후' },
  { value: 'snap', label: '스냅' },
  { value: 'etc', label: '기타' },
];

const VISIBILITY_OPTIONS: Array<{ value: MemoryPage['visibility']; label: string }> = [
  { value: 'private', label: '비공개' },
  { value: 'unlisted', label: '링크 전용' },
  { value: 'public', label: '공개' },
];

function normalizeOrder<T extends { order: number }>(items: T[]) {
  return [...items]
    .sort((left, right) => left.order - right.order)
    .map((item, index) => ({ ...item, order: index }));
}

function getVisibilityMeta(page: MemoryPage | null) {
  if (!page || !page.enabled || page.visibility === 'private') {
    return { label: '비공개', tone: 'neutral' as const };
  }

  if (page.visibility === 'unlisted') {
    return { label: '링크 전용', tone: 'warning' as const };
  }

  return { label: '공개', tone: 'success' as const };
}

export default function MemoryPageManager() {
  const { isAdminLoggedIn } = useAdmin();
  const { confirm, showToast } = useAdminOverlay();

  const [pages, setPages] = useState<InvitationPageSummary[]>([]);
  const [selectedPageSlug, setSelectedPageSlug] = useState('');
  const [draft, setDraft] = useState<MemoryPage | null>(null);
  const [sourceComments, setSourceComments] = useState<Comment[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadCategory, setUploadCategory] = useState<MemoryGalleryCategory>('ceremony');
  const [commentSearch, setCommentSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exists, setExists] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdminLoggedIn) {
      return;
    }

    void (async () => {
      try {
        const nextPages = await getAllInvitationPages();
        setPages(nextPages);
        if (nextPages.length > 0) {
          setSelectedPageSlug((current) => current || nextPages[0].slug);
        }
      } catch (loadError) {
        console.error(loadError);
        setError('청첩장 목록을 불러오지 못했습니다.');
      }
    })();
  }, [isAdminLoggedIn]);

  useEffect(() => {
    if (!selectedPageSlug || !isAdminLoggedIn) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError('');
      try {
        const [existingPage, comments] = await Promise.all([getMemoryPageByPageSlug(selectedPageSlug), getComments(selectedPageSlug)]);
        if (cancelled) {
          return;
        }

        setSourceComments(comments);
        if (existingPage) {
          setDraft(existingPage);
          setExists(true);
        } else {
          setDraft(await createMemoryPageDraftFromInvitation(selectedPageSlug));
          setExists(false);
        }
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setError('추억 페이지 데이터를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedPageSlug, isAdminLoggedIn]);

  const visibilityMeta = getVisibilityMeta(draft);
  const previewPath = draft ? buildMemoryPageUrl(draft.pageSlug) : '';
  const filteredComments = useMemo(() => {
    const query = commentSearch.trim().toLowerCase();
    if (!query) {
      return sourceComments;
    }

    return sourceComments.filter((comment) => `${comment.author} ${comment.message}`.toLowerCase().includes(query));
  }, [commentSearch, sourceComments]);

  const setField = <K extends keyof MemoryPage>(field: K, value: MemoryPage[K]) => {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  };

  const persist = async (mode: 'save' | 'publish') => {
    if (!draft) {
      return;
    }

    try {
      setSaving(true);
      const savedDraft = await saveMemoryPage({
        ...draft,
        seoNoIndex: draft.visibility === 'private' || draft.visibility === 'unlisted' ? true : draft.seoNoIndex,
      });
      const nextDraft =
        mode === 'publish'
          ? await publishMemoryPage(savedDraft.pageSlug, savedDraft.visibility === 'private' ? 'public' : savedDraft.visibility)
          : savedDraft;
      setDraft(nextDraft);
      setExists(true);
      showToast({ title: mode === 'publish' ? '추억 페이지를 공개했습니다.' : '추억 페이지를 저장했습니다.', tone: 'success' });
    } catch (saveError) {
      console.error(saveError);
      showToast({ title: '추억 페이지 저장에 실패했습니다.', tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async () => {
    if (!draft) {
      return;
    }

    try {
      setSaving(true);
      setDraft(await unpublishMemoryPage(draft.pageSlug));
      showToast({ title: '추억 페이지를 비공개로 전환했습니다.', tone: 'success' });
    } catch (unpublishError) {
      console.error(unpublishError);
      showToast({ title: '비공개 전환에 실패했습니다.', tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePage = async () => {
    if (!draft) {
      return;
    }

    const approved = await confirm({
      title: '추억 페이지를 삭제할까요?',
      description: 'memory-pages 문서와 직접 업로드한 이미지를 함께 삭제합니다.',
      confirmLabel: '삭제',
      cancelLabel: '취소',
      tone: 'danger',
    });

    if (!approved) {
      return;
    }

    try {
      await deleteMemoryPage(draft.pageSlug);
      setDraft(await createMemoryPageDraftFromInvitation(draft.pageSlug));
      setExists(false);
      showToast({ title: '추억 페이지를 삭제했습니다.', tone: 'success' });
    } catch (deleteError) {
      console.error(deleteError);
      showToast({ title: '추억 페이지 삭제에 실패했습니다.', tone: 'error' });
    }
  };

  const handleImportInvitationImages = async () => {
    if (!draft) {
      return;
    }

    try {
      const nextGalleryImages = await mergeInvitationGalleryImages(draft.pageSlug, draft.galleryImages);
      setDraft({
        ...draft,
        galleryImages: nextGalleryImages,
        heroImage: draft.heroImage ?? nextGalleryImages[0] ?? null,
        heroThumbnailUrl: (draft.heroImage ?? nextGalleryImages[0])?.url ?? '',
      });
      showToast({ title: '청첩장 이미지를 가져왔습니다.', tone: 'success' });
    } catch (importError) {
      console.error(importError);
      showToast({ title: '청첩장 이미지 가져오기에 실패했습니다.', tone: 'error' });
    }
  };

  const handleUploadImages = async () => {
    if (!draft || selectedFiles.length === 0) {
      return;
    }

    try {
      setUploading(true);
      const uploadedImages = await uploadMemoryImages(draft.pageSlug, selectedFiles, uploadCategory, draft.galleryImages.length);
      const nextGalleryImages = normalizeOrder([...draft.galleryImages, ...uploadedImages]);
      setDraft({
        ...draft,
        galleryImages: nextGalleryImages,
        heroImage: draft.heroImage ?? nextGalleryImages[0] ?? null,
        heroThumbnailUrl: (draft.heroImage ?? nextGalleryImages[0])?.url ?? '',
      });
      setSelectedFiles([]);
      showToast({ title: '이미지를 업로드했습니다.', tone: 'success' });
    } catch (uploadError) {
      console.error(uploadError);
      showToast({ title: '이미지 업로드에 실패했습니다.', tone: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (image: MemoryGalleryImage) => {
    if (!draft) {
      return;
    }

    try {
      await deleteMemoryImageAsset(image);
      const nextGalleryImages = normalizeOrder(draft.galleryImages.filter((item) => item.id !== image.id));
      setDraft({
        ...draft,
        galleryImages: nextGalleryImages,
        heroImage: draft.heroImage?.id === image.id ? nextGalleryImages[0] ?? null : draft.heroImage,
        heroThumbnailUrl: draft.heroImage?.id === image.id ? nextGalleryImages[0]?.url ?? '' : draft.heroThumbnailUrl,
      });
    } catch (deleteError) {
      console.error(deleteError);
      showToast({ title: '이미지 제거에 실패했습니다.', tone: 'error' });
    }
  };

  const addCommentToSelection = (comment: Comment) => {
    if (!draft || draft.selectedComments.some((item) => item.sourceCommentId === comment.id)) {
      return;
    }

    setDraft({
      ...draft,
      selectedComments: normalizeOrder([...draft.selectedComments, createSelectedCommentSnapshot(comment, draft.selectedComments.length)]),
    });
  };

  if (!isAdminLoggedIn) {
    return <div className={styles.lockedState}>관리자만 추억 페이지를 관리할 수 있습니다.</div>;
  }

  if (loading || !draft) {
    return <div className={styles.loadingState}>추억 페이지 데이터를 불러오는 중입니다.</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>추억 페이지 관리</h2>
          <p className={styles.description}>고정 경로 `/memory/[pageSlug]/` 기준으로 공개 상태와 내용을 관리합니다.</p>
        </div>
        <StatusBadge tone={visibilityMeta.tone}>{visibilityMeta.label}</StatusBadge>
      </div>

      <FilterToolbar
        fields={
          <>
            <label className="admin-field">
              <span className="admin-field-label">청첩장 페이지</span>
              <select className="admin-select" value={selectedPageSlug} onChange={(event) => setSelectedPageSlug(event.target.value)}>
                {pages.map((page) => (
                  <option key={page.slug} value={page.slug}>
                    {page.displayName} ({page.slug})
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span className="admin-field-label">댓글 검색</span>
              <input className="admin-input" type="search" placeholder="작성자 또는 내용 검색" value={commentSearch} onChange={(event) => setCommentSearch(event.target.value)} />
            </label>
          </>
        }
        actions={
          <div className={styles.inlineActions}>
            <button type="button" className="admin-button admin-button-secondary" onClick={() => void handleImportInvitationImages()}>
              청첩장 이미지 가져오기
            </button>
            <button type="button" className="admin-button admin-button-ghost" onClick={() => window.open(previewPath, '_blank', 'noopener,noreferrer')}>
              미리보기
            </button>
          </div>
        }
        chips={[
          { id: 'memory-path', label: previewPath || '-' },
          { id: 'memory-exists', label: exists ? '저장된 초안' : '새 초안' },
        ]}
      />

      {error ? <div className={styles.errorMessage}>{error}</div> : null}

      <section className={styles.panel}>
        <div className={styles.formGrid}>
          <label className="admin-field">
            <span className="admin-field-label">공개 상태</span>
            <select className="admin-select" value={draft.visibility} onChange={(event) => setField('visibility', event.target.value as MemoryPage['visibility'])}>
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={`${styles.fullSpan} admin-field`}>
            <span className="admin-field-label">제목</span>
            <input className="admin-input" value={draft.title} onChange={(event) => setField('title', event.target.value)} />
          </label>

          <label className={`${styles.fullSpan} admin-field`}>
            <span className="admin-field-label">서브타이틀</span>
            <input className="admin-input" value={draft.subtitle} onChange={(event) => setField('subtitle', event.target.value)} />
          </label>

          <label className={`${styles.fullSpan} admin-field`}>
            <span className="admin-field-label">소개 문구</span>
            <textarea className="admin-textarea" rows={4} value={draft.introMessage} onChange={(event) => setField('introMessage', event.target.value)} />
          </label>

          <label className={`${styles.fullSpan} admin-field`}>
            <span className="admin-field-label">감사 문구</span>
            <textarea className="admin-textarea" rows={4} value={draft.thankYouMessage} onChange={(event) => setField('thankYouMessage', event.target.value)} />
          </label>

          <label className="admin-field">
            <span className="admin-field-label">SEO Title</span>
            <input className="admin-input" value={draft.seoTitle} onChange={(event) => setField('seoTitle', event.target.value)} />
          </label>

          <label className="admin-field">
            <span className="admin-field-label">SEO noindex</span>
            <select className="admin-select" value={draft.seoNoIndex ? 'true' : 'false'} onChange={(event) => setField('seoNoIndex', event.target.value === 'true')}>
              <option value="false">Off</option>
              <option value="true">On</option>
            </select>
          </label>

          <label className={`${styles.fullSpan} admin-field`}>
            <span className="admin-field-label">SEO Description</span>
            <textarea className="admin-textarea" rows={3} value={draft.seoDescription} onChange={(event) => setField('seoDescription', event.target.value)} />
          </label>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h3 className={styles.panelTitle}>이미지</h3>
            <p className={styles.panelDescription}>대표 이미지를 지정하고 직접 업로드 이미지를 추가할 수 있습니다.</p>
          </div>
        </div>

        <div className={styles.uploadRow}>
          <label className="admin-field">
            <span className="admin-field-label">카테고리</span>
            <select className="admin-select" value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value as MemoryGalleryCategory)}>
              {GALLERY_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.inlineActions}>
            <input className={styles.fileInput} id="memory-upload" type="file" accept="image/*" multiple onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))} />
            <label className="admin-button admin-button-ghost" htmlFor="memory-upload">
              파일 선택
            </label>
            <button type="button" className="admin-button admin-button-primary" onClick={() => void handleUploadImages()} disabled={uploading || selectedFiles.length === 0}>
              {uploading ? '업로드 중...' : `업로드${selectedFiles.length > 0 ? ` (${selectedFiles.length})` : ''}`}
            </button>
          </div>
        </div>

        {draft.galleryImages.length > 0 ? (
          <div className={styles.galleryGrid}>
            {normalizeOrder(draft.galleryImages).map((image) => (
              <article key={image.id} className={styles.galleryCard}>
                <img className={styles.galleryImage} src={image.url} alt={image.name} />
                <p>{image.name}</p>
                <div className={styles.inlineActions}>
                  <button type="button" className="admin-button admin-button-secondary" onClick={() => setField('heroImage', image)}>
                    대표 지정
                  </button>
                  <button type="button" className="admin-button admin-button-danger" onClick={() => void handleRemoveImage(image)}>
                    제거
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="등록된 이미지가 없습니다." description="청첩장 이미지 가져오기 또는 업로드로 갤러리를 채워주세요." />
        )}
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h3 className={styles.panelTitle}>선택 댓글</h3>
            <p className={styles.panelDescription}>공개할 댓글만 직접 골라 추억 페이지에 표시합니다.</p>
          </div>
        </div>

        <div className={styles.commentColumns}>
          <div className={styles.commentPanel}>
            <div className={styles.commentListScrollable}>
              {filteredComments.map((comment) => (
                <article key={comment.id} className={styles.commentCard}>
                  <div className={styles.commentCardHeader}>
                    <strong>{comment.author}</strong>
                    <StatusBadge tone="neutral">{comment.pageSlug}</StatusBadge>
                  </div>
                  <p className={styles.commentMessage}>{comment.message}</p>
                  <button type="button" className="admin-button admin-button-ghost" onClick={() => addCommentToSelection(comment)}>
                    선택 댓글 추가
                  </button>
                </article>
              ))}
            </div>
          </div>

          <div className={styles.commentPanel}>
            <div className={styles.commentListScrollable}>
              {draft.selectedComments.length > 0 ? (
                normalizeOrder(draft.selectedComments).map((comment) => (
                  <article key={comment.id} className={styles.commentCard}>
                    <div className={styles.commentCardHeader}>
                      <strong>{comment.author}</strong>
                      <StatusBadge tone={comment.isVisible ? 'success' : 'neutral'}>{comment.isVisible ? '노출' : '숨김'}</StatusBadge>
                    </div>
                    <p className={styles.commentMessage}>{comment.message}</p>
                    <div className={styles.inlineActions}>
                      <button
                        type="button"
                        className="admin-button admin-button-secondary"
                        onClick={() =>
                          setField(
                            'selectedComments',
                            draft.selectedComments.map((item) => (item.id === comment.id ? { ...item, isVisible: !item.isVisible } : item))
                          )
                        }
                      >
                        {comment.isVisible ? '숨김' : '노출'}
                      </button>
                      <button
                        type="button"
                        className="admin-button admin-button-danger"
                        onClick={() => setField('selectedComments', normalizeOrder(draft.selectedComments.filter((item) => item.id !== comment.id)))}
                      >
                        제거
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState title="선택된 댓글이 없습니다." description="왼쪽 목록에서 공개할 댓글을 추가해주세요." />
              )}
            </div>
          </div>
        </div>
      </section>

      <div className={styles.footerBar}>
        <div className={styles.footerMeta}>
          <span className={styles.footerLabel}>공유 주소</span>
          <strong>{previewPath || '-'}</strong>
        </div>
        <div className={styles.footerActions}>
          {draft.enabled ? (
            <button type="button" className="admin-button admin-button-ghost" onClick={() => void handleUnpublish()} disabled={saving}>
              비공개 전환
            </button>
          ) : null}
          <button type="button" className="admin-button admin-button-danger" onClick={() => void handleDeletePage()} disabled={saving}>
            삭제
          </button>
          <button type="button" className="admin-button admin-button-primary" onClick={() => void persist('save')} disabled={saving}>
            {saving ? '저장 중...' : exists ? '저장' : '초안 생성'}
          </button>
          <button type="button" className="admin-button admin-button-secondary" onClick={() => void persist('publish')} disabled={saving}>
            공개
          </button>
        </div>
      </div>
    </div>
  );
}
