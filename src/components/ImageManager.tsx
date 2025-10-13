'use client';

import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/contexts';
import { uploadImage, deleteImage, getAllPageImages, type UploadedImage } from '@/services';
import { getWeddingPagesClient, type WeddingPageInfo } from '@/utils';
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
  const [success, setSuccess] = useState('');
  const [expandedPages, setExpandedPages] = useState<{ [pageSlug: string]: boolean }>({});
  const { isAdminLoggedIn } = useAdmin();

  useEffect(() => {
    const loadWeddingPages = async () => {
      try {
        const pages = await getWeddingPagesClient();
        setWeddingPages(pages);
        // 첫 번째 페이지를 기본 선택으로 설정
        if (pages.length > 0) {
          setSelectedPage(pages[0].slug);
        }
      } catch (error) {
        console.error('웨딩 페이지 정보를 불러오는데 실패했습니다:', error);
      }
    };

    loadWeddingPages();
  }, []);

  useEffect(() => {
    if (isAdminLoggedIn) {
      loadAllImages();
    }
  }, [isAdminLoggedIn]);

  const loadAllImages = async () => {
    try {
      setIsLoading(true);
      const allImages = await getAllPageImages();
      setImages(allImages);
    } catch (error) {
      setError('이미지를 불러오는데 실패했습니다.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      const validFiles: File[] = [];
      const newPreviewUrls: string[] = [];
      let hasError = false;

      // 각 파일 검증
      for (const file of fileArray) {
        // 파일 크기 검증 (5MB 제한)
        if (file.size > 5 * 1024 * 1024) {
          setError(`파일 ${file.name}의 크기가 5MB를 초과합니다.`);
          hasError = true;
          break;
        }

        // 파일 타입 검증
        if (!file.type.startsWith('image/')) {
          setError(`${file.name}은(는) 이미지 파일이 아닙니다.`);
          hasError = true;
          break;
        }

        validFiles.push(file);
      }

      if (!hasError && validFiles.length > 0) {
        setSelectedFiles(validFiles);
        setError('');
        
        // 미리보기 생성
        validFiles.forEach(file => {
          const reader = new FileReader();
          reader.onload = (e) => {
            newPreviewUrls.push(e.target?.result as string);
            if (newPreviewUrls.length === validFiles.length) {
              setPreviewUrls(newPreviewUrls);
            }
          };
          reader.readAsDataURL(file);
        });
      } else if (!hasError) {
        setSelectedFiles([]);
        setPreviewUrls([]);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFiles.length || !selectedPage) {
      setError('파일과 페이지를 선택해주세요.');
      return;
    }

    try {
      setIsUploading(true);
      setError('');
      
      // 각 파일별 업로드 진행 상태 초기화
      const initialProgress: { [fileName: string]: boolean } = {};
      selectedFiles.forEach(file => {
        initialProgress[file.name] = false;
      });
      setUploadProgress(initialProgress);
      
      // 병렬로 모든 파일 업로드
      const uploadPromises = selectedFiles.map(async (file) => {
        try {
          await uploadImage(file, selectedPage);
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: true
          }));
        } catch (error) {
          console.error(`파일 ${file.name} 업로드 실패:`, error);
          throw error;
        }
      });

      await Promise.all(uploadPromises);
      
      setSuccess(`${selectedFiles.length}개의 이미지가 성공적으로 업로드되었습니다!`);
      setSelectedFiles([]);
      setPreviewUrls([]);
      setUploadProgress({});
      
      // 이미지 목록 새로고침
      await loadAllImages();
      
      // 성공 메시지 3초 후 제거
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('일부 이미지 업로드에 실패했습니다.');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (imagePath: string, pageSlug: string) => {
    if (!window.confirm('정말로 이 이미지를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteImage(imagePath);
      setSuccess('이미지가 삭제되었습니다.');
      await loadAllImages();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('이미지 삭제에 실패했습니다.');
      console.error(error);
    }
  };

  const togglePageExpand = (pageSlug: string) => {
    setExpandedPages(prev => ({
      ...prev,
      [pageSlug]: !prev[pageSlug]
    }));
  };

  const expandAll = () => {
    const allExpanded: { [key: string]: boolean } = {};
    Object.keys(images).forEach(slug => {
      allExpanded[slug] = true;
    });
    setExpandedPages(allExpanded);
  };

  const collapseAll = () => {
    setExpandedPages({});
  };

  if (!isAdminLoggedIn) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>접근 권한이 없습니다</h2>
        <p className={styles.errorMessage}>관리자만 이미지를 관리할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>이미지 관리</h2>
      
      {/* 업로드 섹션 */}
      <div className={styles.uploadSection}>
        <select
          className={styles.pageSelector}
          value={selectedPage}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedPage(e.target.value)}
        >
          {weddingPages.map((page) => (
            <option key={page.slug} value={page.slug}>
              {page.displayName}
            </option>
          ))}
        </select>
        
        <input
          className={styles.fileInput}
          id="file-upload"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
        />
        <label className={styles.fileInputLabel} htmlFor="file-upload">
          이미지 선택 (여러 장 가능)
        </label>
        
        {selectedFiles.length > 0 && (
          <div className={styles.uploadInfo}>
            <p className={styles.selectedFilesCount}>
              선택된 파일: {selectedFiles.length}개
            </p>
            <button
              className={styles.uploadButton}
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? '업로드 중...' : `${selectedFiles.length}개 파일 업로드`}
            </button>
          </div>
        )}
        
        {/* 업로드 진행 상태 */}
        {isUploading && Object.keys(uploadProgress).length > 0 && (
          <div className={styles.uploadProgress}>
            <h4>업로드 진행 상황:</h4>
            {Object.entries(uploadProgress).map(([fileName, completed]) => (
              <div key={fileName} className={styles.progressItem}>
                <span className={styles.fileName}>{fileName}</span>
                <span className={`${styles.progressStatus} ${completed ? styles.completed : styles.uploading}`}>
                  {completed ? '✅ 완료' : '⏳ 업로드 중...'}
                </span>
              </div>
            ))}
          </div>
        )}
        
        {/* 미리보기 */}
        {previewUrls.length > 0 && (
          <div className={styles.previewContainer}>
            <h4>미리보기:</h4>
            <div className={styles.previewGrid}>
              {previewUrls.map((url, index) => (
                <div key={index} className={styles.previewItem}>
                  <img className={styles.previewImage} src={url} alt={`미리보기 ${index + 1}`} />
                  <p className={styles.previewFileName}>{selectedFiles[index]?.name}</p>
                  <button
                    className={styles.removePreviewButton}
                    onClick={() => {
                      const newFiles = selectedFiles.filter((_, i) => i !== index);
                      const newUrls = previewUrls.filter((_, i) => i !== index);
                      setSelectedFiles(newFiles);
                      setPreviewUrls(newUrls);
                    }}
                  >
                    ❌ 제거
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p className={styles.errorMessage}>{error}</p>}
      {success && <p className={styles.successMessage}>{success}</p>}

      {/* 이미지 목록 */}
      {isLoading ? (
        <p className={styles.loadingMessage}>이미지를 불러오는 중...</p>
      ) : (
        <>
          {/* 전체 펼치기/접기 버튼 */}
          {Object.keys(images).length > 0 && (
            <div className={styles.bulkActions}>
              <button 
                className={styles.bulkActionButton} 
                onClick={expandAll}
              >
                📂 전체 펼치기
              </button>
              <button 
                className={styles.bulkActionButton} 
                onClick={collapseAll}
              >
                📁 전체 접기
              </button>
            </div>
          )}
          
          {Object.keys(images).reverse().map((pageSlug) => {
            const pageName = weddingPages.find(p => p.slug === pageSlug)?.displayName || pageSlug;
            const pageImages = images[pageSlug] || [];
            const isExpanded = expandedPages[pageSlug] || false;
            
            if (pageImages.length === 0) return null;
            
            return (
              <div key={pageSlug} className={styles.pageSection}>
                <div 
                  className={styles.pageSectionHeader}
                  onClick={() => togglePageExpand(pageSlug)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.pageSectionHeaderLeft}>
                    <span className={styles.expandIcon}>
                      {isExpanded ? '🔽' : '▶️'}
                    </span>
                    <h3 className={styles.pageSectionTitle}>
                      💍 {pageName}
                    </h3>
                  </div>
                  <div className={styles.imageCount}>
                    {pageImages.length}개의 이미지
                  </div>
                </div>
                
                {isExpanded && (
                  <div className={styles.imageGrid}>
                    {pageImages.map((image) => (
                      <div key={image.path} className={styles.imageCard}>
                        <div className={styles.imageWrapper}>
                          <img className={styles.image} src={image.url} alt={image.name} />
                        </div>
                        <div className={styles.imageInfo}>
                          <p className={styles.imageName}>📷 {image.name}</p>
                          <button
                            className={styles.deleteImageButton}
                            onClick={() => handleDelete(image.path, pageSlug)}
                          >
                            🗑️ 삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
