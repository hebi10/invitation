'use client';

import React, { useEffect, useState } from 'react';
import { useAdmin } from '@/contexts';
import { uploadImage, deleteImage, getAllPageImages, type UploadedImage } from '@/services';
import { getWeddingPagesClient, type WeddingPageInfo } from '@/utils';
import { EmptyState, FilterToolbar, useAdminOverlay } from '@/app/admin/_components';
import styles from './ImageManager.module.css';

export default function ImageManager() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>('');
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [images, setImages] = useState<{ [pageSlug: string]: UploadedImage[] }>({});
  const [weddingPages, setWeddingPages] = useState<WeddingPageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [fileName: string]: boolean }>({});
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPages, setExpandedPages] = useState<{ [pageSlug: string]: boolean }>({});
  const { isAdminLoggedIn } = useAdmin();
  const { confirm, showToast } = useAdminOverlay();

  useEffect(() => {
    const pages = getWeddingPagesClient();
    setWeddingPages(pages);

    if (pages.length > 0) {
      setSelectedPage(pages[0].slug);
    }
  }, []);

  useEffect(() => {
    if (isAdminLoggedIn) {
      void loadAllImages();
    }
  }, [isAdminLoggedIn]);

  const loadAllImages = async () => {
    try {
      setIsLoading(true);
      setImages(await getAllPageImages());
    } catch (loadError) {
      setError('이미지를 불러오는데 실패했습니다.');
      console.error(loadError);
      showToast({
        title: '이미지를 불러오지 못했습니다.',
        message: '잠시 후 다시 시도해주세요.',
        tone: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      setSelectedFiles([]);
      setPreviewUrls([]);
      return;
    }

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const nextPreviewUrls: string[] = [];

    for (const file of fileArray) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`파일 ${file.name}의 크기가 5MB를 초과합니다.`);
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError(`${file.name}은 이미지 파일이 아닙니다.`);
        return;
      }

      validFiles.push(file);
    }

    setError('');
    setSelectedFiles(validFiles);

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        nextPreviewUrls.push(loadEvent.target?.result as string);
        if (nextPreviewUrls.length === validFiles.length) {
          setPreviewUrls(nextPreviewUrls);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    if (!selectedFiles.length || !selectedPage) {
      setError('파일과 페이지를 선택해주세요.');
      return;
    }

    try {
      setIsUploading(true);
      setError('');

      const initialProgress: { [fileName: string]: boolean } = {};
      selectedFiles.forEach((file) => {
        initialProgress[file.name] = false;
      });
      setUploadProgress(initialProgress);

      await Promise.all(
        selectedFiles.map(async (file) => {
          await uploadImage(file, selectedPage);
          setUploadProgress((prev) => ({ ...prev, [file.name]: true }));
        })
      );

      setSelectedFiles([]);
      setPreviewUrls([]);
      setUploadProgress({});
      await loadAllImages();
      showToast({
        title: '이미지를 업로드했습니다.',
        message: `${selectedFiles.length}개의 파일이 업로드되었습니다.`,
        tone: 'success',
      });
    } catch (uploadError) {
      setError('이미지 업로드에 실패했습니다.');
      console.error(uploadError);
      showToast({
        title: '이미지 업로드에 실패했습니다.',
        message: '일부 파일이 업로드되지 않았습니다.',
        tone: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (imagePath: string) => {
    const approved = await confirm({
      title: '이미지를 삭제할까요?',
      description: '삭제된 이미지는 복구할 수 없습니다.',
      confirmLabel: '삭제',
      cancelLabel: '취소',
      tone: 'danger',
    });

    if (!approved) {
      return;
    }

    try {
      await deleteImage(imagePath);
      await loadAllImages();
      showToast({
        title: '이미지를 삭제했습니다.',
        message: '목록이 최신 상태로 갱신되었습니다.',
        tone: 'success',
      });
    } catch (deleteError) {
      setError('이미지 삭제에 실패했습니다.');
      console.error(deleteError);
      showToast({
        title: '이미지 삭제에 실패했습니다.',
        message: '잠시 후 다시 시도해주세요.',
        tone: 'error',
      });
    }
  };

  const togglePageExpand = (pageSlug: string) => {
    setExpandedPages((prev) => ({
      ...prev,
      [pageSlug]: !prev[pageSlug],
    }));
  };

  const filteredPageSlugs = Object.keys(images)
    .reverse()
    .filter((pageSlug) => {
      const pageName = weddingPages.find((page) => page.slug === pageSlug)?.displayName || pageSlug;
      return `${pageName} ${pageSlug}`.toLowerCase().includes(searchQuery.trim().toLowerCase());
    });

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
          <h2 className={styles.title}>이미지 관리</h2>
          <p className={styles.description}>업로드 대상과 목록 검색을 분리해 이미지 운영 흐름을 더 빠르게 정리했습니다.</p>
        </div>
      </div>

      <div className={styles.uploadSection}>
        <div className={styles.uploadRow}>
          <label className="admin-field">
            <span className="admin-field-label">업로드 대상 페이지</span>
            <select className="admin-select" value={selectedPage} onChange={(event) => setSelectedPage(event.target.value)}>
              {weddingPages.map((page) => (
                <option key={page.slug} value={page.slug}>
                  {page.displayName}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.uploadActions}>
            <input className={styles.fileInput} id="file-upload" type="file" accept="image/*" multiple onChange={handleFileSelect} />
            <label className="admin-button admin-button-ghost" htmlFor="file-upload">
              이미지 선택
            </label>
            <button className="admin-button admin-button-primary" onClick={handleUpload} disabled={isUploading || selectedFiles.length === 0} type="button">
              {isUploading ? '업로드 중...' : `업로드${selectedFiles.length > 0 ? ` (${selectedFiles.length})` : ''}`}
            </button>
          </div>
        </div>

        {selectedFiles.length > 0 ? (
          <div className={styles.uploadInfo}>선택된 파일 {selectedFiles.length}개</div>
        ) : null}

        {isUploading && Object.keys(uploadProgress).length > 0 ? (
          <div className={styles.uploadProgress}>
            {Object.entries(uploadProgress).map(([fileName, completed]) => (
              <div key={fileName} className={styles.progressItem}>
                <span className={styles.fileName}>{fileName}</span>
                <span className={styles.progressStatus}>{completed ? '완료' : '업로드 중'}</span>
              </div>
            ))}
          </div>
        ) : null}

        {previewUrls.length > 0 ? (
          <div className={styles.previewGrid}>
            {previewUrls.map((url, index) => (
              <div key={index} className={styles.previewItem}>
                <img className={styles.previewImage} src={url} alt={`미리보기 ${index + 1}`} />
                <p className={styles.previewFileName}>{selectedFiles[index]?.name}</p>
                <button
                  type="button"
                  className="admin-button admin-button-ghost"
                  onClick={() => {
                    setSelectedFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
                    setPreviewUrls((prev) => prev.filter((_, urlIndex) => urlIndex !== index));
                  }}
                >
                  제외
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
              placeholder="페이지 이름 또는 slug 검색"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
        }
        actions={
          <button type="button" className="admin-button admin-button-secondary" onClick={() => void loadAllImages()} disabled={isLoading}>
            {isLoading ? '새로고침 중...' : '새로고침'}
          </button>
        }
        chips={searchQuery ? [{ id: 'image-search', label: `검색: ${searchQuery}`, onRemove: () => setSearchQuery('') }] : []}
      />

      {error ? <div className={styles.errorMessage}>{error}</div> : null}

      {isLoading ? (
        <div className={styles.loadingMessage}>이미지 목록을 불러오는 중입니다.</div>
      ) : filteredPageSlugs.length > 0 ? (
        <div className={styles.pageSections}>
          {filteredPageSlugs.map((pageSlug) => {
            const pageName = weddingPages.find((page) => page.slug === pageSlug)?.displayName || pageSlug;
            const pageImages = images[pageSlug] || [];
            const isExpanded = expandedPages[pageSlug] ?? false;

            return (
              <section key={pageSlug} className={styles.pageSection}>
                <button type="button" className={styles.pageSectionHeader} onClick={() => togglePageExpand(pageSlug)}>
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
                          <button type="button" className="admin-button admin-button-danger" onClick={() => void handleDelete(image.path)}>
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
          title="조건에 맞는 이미지가 없습니다."
          description="업로드를 진행하거나 검색어를 조정해 다시 확인해보세요."
          actionLabel="검색 초기화"
          onAction={() => setSearchQuery('')}
        />
      )}
    </div>
  );
}
