'use client';

import React, { useState, useEffect } from 'react';
import { 
  getAllClientPasswords, 
  setClientPassword, 
  deleteClientPassword,
  type ClientPassword 
} from '@/services';
import { getWeddingPagesClient, type WeddingPageInfo } from '@/utils';
import styles from './ClientPasswordManager.module.css';

interface ClientPasswordManagerProps {
  isVisible: boolean;
}

export default function ClientPasswordManager({ isVisible }: ClientPasswordManagerProps) {
  const [passwords, setPasswords] = useState<ClientPassword[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingPassword, setEditingPassword] = useState<{ pageSlug: string; password: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [weddingPages, setWeddingPages] = useState<WeddingPageInfo[]>([]);

  // 웨딩 페이지 정보 자동 로드
  useEffect(() => {
    const pages = getWeddingPagesClient();
    setWeddingPages(pages);
  }, []);

  useEffect(() => {
    if (isVisible) {
      loadPasswords();
    }
  }, [isVisible]);

  const loadPasswords = async () => {
    try {
      setIsLoading(true);
      setError('');
      const allPasswords = await getAllClientPasswords();
      setPasswords(allPasswords);
    } catch (error) {
      setError('비밀번호 목록을 불러오는데 실패했습니다.');
      console.error('비밀번호 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (pageSlug: string, password: string) => {
    if (!password.trim()) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    try {
      setError('');
      await setClientPassword(pageSlug, password);
      await loadPasswords();
      setEditingPassword(null);
      setNewPassword('');
    } catch (error) {
      setError('비밀번호 업데이트에 실패했습니다.');
      console.error('비밀번호 업데이트 오류:', error);
    }
  };

  const handleDeletePassword = async (pageSlug: string) => {
    if (!window.confirm('정말로 이 비밀번호를 삭제하시겠습니까? 삭제하면 기본 비밀번호(1234)로 초기화됩니다.')) {
      return;
    }

    try {
      setError('');
      await deleteClientPassword(pageSlug);
      await loadPasswords();
    } catch (error) {
      setError('비밀번호 삭제에 실패했습니다.');
      console.error('비밀번호 삭제 오류:', error);
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

  const getPasswordForPage = (pageSlug: string): string => {
    const found = passwords.find(p => p.pageSlug === pageSlug);
    return found ? found.password : '1234 (기본값)';
  };

  const hasPasswordInDB = (pageSlug: string): boolean => {
    return passwords.some(p => p.pageSlug === pageSlug);
  };

  if (!isVisible) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span className={styles.titleIcon}>🔐</span>
          클라이언트 비밀번호 관리
        </h3>
        <p className={styles.subtitle}>
          각 청첩장 페이지의 댓글 관리 비밀번호를 설정할 수 있습니다
        </p>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <span className={styles.errorIcon}>⚠️</span>
          {error}
        </div>
      )}

      {isLoading ? (
        <div className={styles.loading}>
          <span className={styles.loadingIcon}>⏳</span>
          비밀번호 목록을 불러오는 중...
        </div>
      ) : (
        <div className={styles.passwordList}>
          {weddingPages.map((page) => (
            <div key={page.slug} className={styles.passwordItem}>
              <div className={styles.pageInfo}>
                <h4 className={styles.pageName}>
                  <span className={styles.pageIcon}>💒</span>
                  {page.displayName}
                </h4>
                <span className={styles.pageSlug}>({page.slug})</span>
                {page.date && page.venue && (
                  <div className={styles.pageDetails}>
                    <span className={styles.pageDate}>📅 {page.date}</span>
                    <span className={styles.pageVenue}>🏛️ {page.venue}</span>
                  </div>
                )}
              </div>

              <div className={styles.passwordSection}>
                {editingPassword?.pageSlug === page.slug ? (
                  <div className={styles.editForm}>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="새 비밀번호 입력"
                      className={styles.passwordInput}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdatePassword(page.slug, newPassword);
                        }
                      }}
                    />
                    <div className={styles.editButtons}>
                      <button
                        onClick={() => handleUpdatePassword(page.slug, newPassword)}
                        className={styles.saveButton}
                      >
                        <span className={styles.buttonIcon}>💾</span>
                        저장
                      </button>
                      <button
                        onClick={cancelEditing}
                        className={styles.cancelButton}
                      >
                        <span className={styles.buttonIcon}>❌</span>
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.passwordDisplay}>
                    <div className={styles.passwordValue}>
                      <span className={styles.passwordIcon}>🔑</span>
                      <span className={styles.password}>
                        {getPasswordForPage(page.slug)}
                      </span>
                      {!hasPasswordInDB(page.slug) && (
                        <span className={styles.defaultBadge}>기본값</span>
                      )}
                    </div>
                    <div className={styles.actionButtons}>
                      <button
                        onClick={() => startEditing(page.slug, getPasswordForPage(page.slug).replace(' (기본값)', ''))}
                        className={styles.editButton}
                      >
                        <span className={styles.buttonIcon}>✏️</span>
                        {hasPasswordInDB(page.slug) ? '수정' : '설정'}
                      </button>
                      {hasPasswordInDB(page.slug) && (
                        <button
                          onClick={() => handleDeletePassword(page.slug)}
                          className={styles.deleteButton}
                        >
                          <span className={styles.buttonIcon}>🗑️</span>
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.updateInfo}>
                {(() => {
                  const passwordData = passwords.find(p => p.pageSlug === page.slug);
                  if (passwordData) {
                    return (
                      <span className={styles.lastUpdated}>
                        <span className={styles.updateIcon}>🕒</span>
                        마지막 업데이트: {passwordData.updatedAt.toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    );
                  }
                  return (
                    <span className={styles.noData}>
                      <span className={styles.updateIcon}>📝</span>
                      설정되지 않음 (기본값 사용 중)
                    </span>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.notice}>
        <span className={styles.noticeIcon}>💡</span>
        <div className={styles.noticeText}>
          <strong>안내사항:</strong>
          <ul>
            <li>비밀번호가 설정되지 않은 페이지는 기본값 <code>1234</code>를 사용합니다</li>
            <li>신랑신부만 이 비밀번호로 댓글 관리가 가능합니다</li>
            <li>관리자는 별도의 관리자 로그인으로 모든 댓글을 관리할 수 있습니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
