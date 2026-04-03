'use client';

import { useEffect, useMemo, useState } from 'react';

import { useAdmin } from '@/contexts';
import {
  uploadImage,
  deleteImage,
  getAllPageImages,
  getAllManagedInvitationPages,
  type InvitationPageSummary,
  type UploadedImage,
} from '@/services';
import {
  EmptyState,
  FilterToolbar,
  StatusBadge,
  useAdminOverlay,
} from '@/app/admin/_components';

import styles from './ImageManager.module.css';

export default function ImageManager() {
  const { isAdminLoggedIn } = useAdmin();
  const { confirm, showToast } = useAdminOverlay();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPage, setSelectedPage] = useState('');
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [images, setImages] = useState<Record<string, UploadedImage[]>>({});
  const [pages, setPages] = useState<InvitationPageSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const [nextImages, nextPages] = await Promise.all([
        getAllPageImages(),
        getAllManagedInvitationPages(),
      ]);
      setImages(nextImages);
      setPages(nextPages);
      if (!selectedPage && nextPages.length > 0) {
        setSelectedPage(nextPages[0].slug);
      }
    } catch (loadError) {
      console.error(loadError);
      setError('이미지 데이터를 불러오지 못했습니다.');
      showToast({
        title: '이미지 목록을 불러오지 못했습니다.',
        tone: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdminLoggedIn) {
      return;
    }

    void loadData();
  }, [isAdminLoggedIn]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      setSelectedFiles([]);
      setPreviewUrls([]);
      return;
    }

    previewUrls.forEach((url) => URL.revokeObjectURL(url));

    const nextFiles = Array.from(files);
    const nextPreviewUrls = nextFiles.map((file) => URL.createObjectURL(file));
    setSelectedFiles(nextFiles);
    setPreviewUrls(nextPreviewUrls);
    setError('');
  };

  const handleUpload = async () => {
    if (!selectedFiles.length || !selectedPage) {
      setError('업로드할 파일과 청첩장 페이지를 먼저 선택해 주세요.');
      return;
    }

    try {
      setIsUploading(true);
      setError('');
      const progressMap = Object.fromEntries(
        selectedFiles.map((file) => [file.name, false])
      );
      setUploadProgress(progressMap);

      await Promise.all(
        selectedFiles.map(async (file) => {
          await uploadImage(file, selectedPage);
          setUploadProgress((prev) => ({ ...prev, [file.name]: true }));
        })
      );

      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setSelectedFiles([]);
      setPreviewUrls([]);
      setUploadProgress({});
      await loadData();
      showToast({
        title: '이미지 업로드가 완료되었습니다.',
        message: `${selectedFiles.length}개 파일`,
        tone: 'success',
      });
    } catch (uploadError) {
      console.error(uploadError);
      setError('이미지 업로드에 실패했습니다.');
      showToast({
        title: '이미지 업로드에 실패했습니다.',
        tone: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (imagePath: string) => {
    const approved = await confirm({
      title: '이미지를 삭제할까요?',
      description: '삭제 후에는 되돌릴 수 없습니다.',
      confirmLabel: '삭제',
      cancelLabel: '취소',
      tone: 'danger',
    });

    if (!approved) {
      return;
    }

    try {
      await deleteImage(imagePath);
      await loadData();
      showToast({
        title: '이미지를 삭제했습니다.',
        tone: 'success',
      });
    } catch (deleteError) {
      console.error(deleteError);
      setError('이미지 삭제에 실패했습니다.');
      showToast({
        title: '이미지 삭제에 실패했습니다.',
        tone: 'error',
      });
    }
  };

  const pageMap = useMemo(
    () => new Map(pages.map((page) => [page.slug, page] as const)),
    [pages]
  );

  const selectedPageSummary = selectedPage ? pageMap.get(selectedPage) ?? null : null;

  const filteredPageSlugs = useMemo(() => {
    return Object.keys(images)
      .sort((left, right) => left.localeCompare(right, 'ko'))
      .filter((pageSlug) => {
        const pageName = pageMap.get(pageSlug)?.displayName || pageSlug;
        return `${pageName} ${pageSlug}`
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase());
      });
  }, [images, pageMap, searchQuery]);

  if (!isAdminLoggedIn) {
    return (
      <div className={styles.container}>
        <div className={styles.lockedState}>관리자만 이미지를 관리할 수 있습니다.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>청첩장 이미지 관리</h2>
          <p className={styles.description}>
            페이지를 선택한 뒤 이미지를 업로드하거나 기존 이미지를 교체할 수 있습니다.
          </p>
        </div>
      </div>

      <div className={styles.uploadSection}>
        <div className={styles.uploadRow}>
          <label className="admin-field">
            <span className="admin-field-label">대상 페이지</span>
            <select
              className="admin-select"
              value={selectedPage}
              onChange={(event) => setSelectedPage(event.target.value)}
            >
              <option value="">페이지를 선택해 주세요.</option>
              {pages.map((page) => (
                <option key={page.slug} value={page.slug}>
                  {page.displayName} ({page.slug})
                </option>
              ))}
            </select>
          </label>

          <div className={styles.uploadActions}>
            <input
              className={styles.fileInput}
              id="file-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
            />
            <label className="admin-button admin-button-ghost" htmlFor="file-upload">
              이미지 선택
            </label>
            <button
              className="admin-button admin-button-primary"
              onClick={() => void handleUpload()}
              disabled={isUploading || selectedFiles.length === 0}
              type="button"
            >
              {isUploading ? '업로드 중..' : `업로드${selectedFiles.length > 0 ? ` (${selectedFiles.length})` : ''}`}
            </button>
          </div>
        </div>

        <div className={styles.uploadGuide}>
          <div className={styles.uploadGuideItem}>
            <span className={styles.uploadGuideLabel}>선택한 페이지</span>
            <strong className={styles.uploadGuideValue}>
              {selectedPageSummary
                ? `${selectedPageSummary.displayName} (${selectedPageSummary.slug})`
                : '아직 선택하지 않음'}
            </strong>
          </div>
          <div className={styles.uploadGuideItem}>
            <span className={styles.uploadGuideLabel}>업로드 파일</span>
            <strong className={styles.uploadGuideValue}>
              {selectedFiles.length > 0 ? `${selectedFiles.length}개 선택됨` : '선택된 파일 없음'}
            </strong>
          </div>
          <div className={styles.uploadGuideItem}>
            <span className={styles.uploadGuideLabel}>권장 형식</span>
            <strong className={styles.uploadGuideValue}>JPG / PNG, 세로 1080px 이상</strong>
          </div>
          <div className={styles.uploadGuideItem}>
            <span className={styles.uploadGuideLabel}>업로드 안내</span>
            <strong className={styles.uploadGuideValue}>파일을 고른 뒤 업로드 버튼으로 반영</strong>
          </div>
        </div>

        {selectedFiles.length > 0 ? (
          <div className={styles.uploadInfo}>
            현재 선택한 파일은 업로드 전까지 임시 상태입니다. 페이지를 다시 확인한 뒤
            업로드하세요.
          </div>
        ) : null}

        {isUploading && Object.keys(uploadProgress).length > 0 ? (
          <div className={styles.uploadProgress}>
            {Object.entries(uploadProgress).map(([fileName, completed]) => (
              <div key={fileName} className={styles.progressItem}>
                <span className={styles.fileName}>{fileName}</span>
                <StatusBadge tone={completed ? 'success' : 'primary'}>
                  {completed ? '완료' : '업로드 중'}
                </StatusBadge>
              </div>
            ))}
          </div>
        ) : null}

        {previewUrls.length > 0 ? (
          <div className={styles.previewGrid}>
            {previewUrls.map((url, index) => (
              <div key={url} className={styles.previewItem}>
                <img className={styles.previewImage} src={url} alt={`Preview ${index + 1}`} />
                <p className={styles.previewFileName}>{selectedFiles[index]?.name}</p>
                <button
                  type="button"
                  className="admin-button admin-button-ghost"
                  onClick={() => {
                    URL.revokeObjectURL(url);
                    setSelectedFiles((prev) =>
                      prev.filter((_, fileIndex) => fileIndex !== index)
                    );
                    setPreviewUrls((prev) =>
                      prev.filter((_, urlIndex) => urlIndex !== index)
                    );
                  }}
                >
                  제거
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <FilterToolbar
        fields={
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
        }
        actions={
          <>
            <button
              type="button"
              className="admin-button admin-button-secondary"
              onClick={() => void loadData()}
              disabled={isLoading}
            >
              {isLoading ? '새로고침 중..' : '새로고침'}
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
                  id: 'image-search',
                  label: `검색: ${searchQuery}`,
                  onRemove: () => setSearchQuery(''),
                },
              ]
            : []
        }
      />

      {error ? <div className={styles.errorMessage}>{error}</div> : null}

      {isLoading ? (
        <div className={styles.loadingMessage}>
          페이지별 이미지 목록을 불러오는 중입니다.
        </div>
      ) : filteredPageSlugs.length > 0 ? (
        <div className={styles.pageSections}>
          {filteredPageSlugs.map((pageSlug) => {
            const pageName = pageMap.get(pageSlug)?.displayName || pageSlug;
            const pageImages = images[pageSlug] || [];
            const isExpanded = expandedPages[pageSlug] ?? false;

            return (
              <section key={pageSlug} className={styles.pageSection}>
                <button
                  type="button"
                  className={styles.pageSectionHeader}
                  onClick={() =>
                    setExpandedPages((prev) => ({ ...prev, [pageSlug]: !prev[pageSlug] }))
                  }
                >
                  <div>
                    <h3 className={styles.pageSectionTitle}>{pageName}</h3>
                    <p className={styles.pageSectionSlug}>{pageSlug}</p>
                  </div>
                  <span className={styles.imageCount}>{pageImages.length}개</span>
                </button>

                {isExpanded ? (
                  <div className={styles.imageGrid}>
                    {pageImages.map((image) => (
                      <div key={image.path} className={styles.imageCard}>
                        <div className={styles.imageWrapper}>
                          <img className={styles.image} src={image.url} alt={image.name} />
                        </div>
                        <div className={styles.imageInfo}>
                          <p className={styles.imageName}>{image.name}</p>
                          <button
                            type="button"
                            className="admin-button admin-button-danger"
                            onClick={() => void handleDelete(image.path)}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={
            Object.keys(images).length === 0
              ? '아직 등록된 이미지가 없습니다.'
              : '현재 조건과 맞는 이미지가 없습니다.'
          }
          description={
            Object.keys(images).length === 0
              ? '페이지를 선택해 이미지를 업로드하면 이곳에서 목록을 바로 관리할 수 있습니다.'
              : '검색 조건을 넓히거나 현재 조건으로 다시 조회해 보세요.'
          }
          highlights={
            Object.keys(images).length === 0
              ? [
                  '페이지를 먼저 고른 뒤 이미지를 선택하고 업로드 버튼으로 반영합니다.',
                  '업로드 전에는 선택한 파일 수와 대상 페이지를 꼭 다시 확인하세요.',
                ]
              : [
                  '검색 초기화를 누르면 전체 페이지 이미지 목록으로 돌아갑니다.',
                  '새로고침은 현재 조건을 유지한 채 다시 조회합니다.',
                ]
          }
          actionLabel={searchQuery ? '검색 초기화' : '새로고침'}
          onAction={searchQuery ? () => setSearchQuery('') : () => void loadData()}
          secondaryActionLabel={searchQuery ? '현재 조건 새로고침' : undefined}
          onSecondaryAction={searchQuery ? () => void loadData() : undefined}
        />
      )}
    </div>
  );
}
