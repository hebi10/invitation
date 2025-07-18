'use client';

import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { uploadImage, deleteImage, getAllPageImages, UploadedImage } from '@/services/imageService';
import styles from './ImageManager.module.css';

const weddingPages = [
  { slug: 'shin-minje-kim-hyunji', name: '신민제 ♥ 김현지' },
  { slug: 'lee-junho-park-somin', name: '이준호 ♥ 박소민' },
  { slug: 'kim-taehyun-choi-yuna', name: '김태현 ♥ 최유나' }
];

export default function ImageManager() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPage, setSelectedPage] = useState<string>('shin-minje-kim-hyunji');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [images, setImages] = useState<{ [pageSlug: string]: UploadedImage[] }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { isAdminLoggedIn } = useAdmin();

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
    const file = e.target.files?.[0];
    if (file) {
      // 파일 크기 검증 (5MB 제한)
      if (file.size > 5 * 1024 * 1024) {
        setError('파일 크기는 5MB 이하여야 합니다.');
        return;
      }

      // 파일 타입 검증
      if (!file.type.startsWith('image/')) {
        setError('이미지 파일만 업로드 가능합니다.');
        return;
      }

      setSelectedFile(file);
      setError('');
      
      // 미리보기 생성
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedPage) {
      setError('파일과 페이지를 선택해주세요.');
      return;
    }

    try {
      setIsUploading(true);
      setError('');
      
      await uploadImage(selectedFile, selectedPage);
      
      setSuccess('이미지가 성공적으로 업로드되었습니다!');
      setSelectedFile(null);
      setPreviewUrl('');
      
      // 이미지 목록 새로고침
      await loadAllImages();
      
      // 성공 메시지 3초 후 제거
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('이미지 업로드에 실패했습니다.');
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
              {page.name}
            </option>
          ))}
        </select>
        
        <input
          className={styles.fileInput}
          id="file-upload"
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
        />
        <label className={styles.fileInputLabel} htmlFor="file-upload">
          이미지 선택
        </label>
        
        {selectedFile && (
          <button
            className={styles.uploadButton}
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? '업로드 중...' : '업로드'}
          </button>
        )}
        
        {previewUrl && (
          <div>
            <img className={styles.previewImage} src={previewUrl} alt="미리보기" />
            <p>{selectedFile?.name}</p>
          </div>
        )}
      </div>

      {error && <p className={styles.errorMessage}>{error}</p>}
      {success && <p className={styles.successMessage}>{success}</p>}

      {/* 이미지 목록 */}
      {isLoading ? (
        <p className={styles.loadingMessage}>이미지를 불러오는 중...</p>
      ) : (
        Object.keys(images).map((pageSlug) => {
          const pageName = weddingPages.find(p => p.slug === pageSlug)?.name || pageSlug;
          const pageImages = images[pageSlug] || [];
          
          if (pageImages.length === 0) return null;
          
          return (
            <div key={pageSlug}>
              <h2 className={styles.title} style={{ fontSize: '1.5rem', marginTop: '2rem' }}>
                {pageName} ({pageImages.length}개)
              </h2>
              <div className={styles.imageGrid}>
                {pageImages.map((image) => (
                  <div key={image.path} className={styles.imageCard}>
                    <div className={styles.imageWrapper}>
                      <img className={styles.image} src={image.url} alt={image.name} />
                    </div>
                    <div className={styles.imageInfo}>
                      <p className={styles.imageName}>{image.name}</p>
                      <button
                        className={styles.deleteImageButton}
                        onClick={() => handleDelete(image.path, pageSlug)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
