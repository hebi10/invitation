'use client';

import React, { useState, useEffect } from 'react';
import { 
  getAllDisplayPeriods, 
  setDisplayPeriod, 
  deleteDisplayPeriod,
  type DisplayPeriod 
} from '@/services';
import { getWeddingPagesClient, type WeddingPageInfo } from '@/utils';
import styles from './DisplayPeriodManager.module.css';

interface DisplayPeriodManagerProps {
  isVisible: boolean;
}

export default function DisplayPeriodManager({ isVisible }: DisplayPeriodManagerProps) {
  const [periods, setPeriods] = useState<DisplayPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingPeriod, setEditingPeriod] = useState<string | null>(null);
  const [weddingPages, setWeddingPages] = useState<WeddingPageInfo[]>([]);
  
  // 폼 상태
  const [formData, setFormData] = useState({
    pageSlug: '',
    startDate: '',
    endDate: '',
    isActive: true
  });

  // 웨딩 페이지 정보 자동 로드
  useEffect(() => {
    const pages = getWeddingPagesClient();
    setWeddingPages(pages);
  }, []);

  useEffect(() => {
    if (isVisible) {
      loadPeriods();
    }
  }, [isVisible]);

  const loadPeriods = async () => {
    try {
      setIsLoading(true);
      setError('');
      const allPeriods = await getAllDisplayPeriods();
      setPeriods(allPeriods);
    } catch (error) {
      setError('노출 기간 목록을 불러오는데 실패했습니다.');
      console.error('노출 기간 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.pageSlug || !formData.startDate || !formData.endDate) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (startDate >= endDate) {
      setError('종료일은 시작일보다 나중이어야 합니다.');
      return;
    }

    try {
      setError('');
      await setDisplayPeriod(
        formData.pageSlug,
        startDate,
        endDate,
        formData.isActive
      );
      await loadPeriods();
      resetForm();
    } catch (error) {
      setError('노출 기간 설정에 실패했습니다.');
      console.error('노출 기간 설정 오류:', error);
    }
  };

  const handleDelete = async (pageSlug: string) => {
    if (!window.confirm('정말로 이 노출 기간 설정을 삭제하시겠습니까?')) {
      return;
    }

    try {
      setError('');
      await deleteDisplayPeriod(pageSlug);
      await loadPeriods();
    } catch (error) {
      setError('노출 기간 삭제에 실패했습니다.');
      console.error('노출 기간 삭제 오류:', error);
    }
  };

  const startEditing = (period: DisplayPeriod) => {
    setEditingPeriod(period.pageSlug);
    setFormData({
      pageSlug: period.pageSlug,
      startDate: period.startDate.toISOString().split('T')[0],
      endDate: period.endDate.toISOString().split('T')[0],
      isActive: period.isActive
    });
  };

  const resetForm = () => {
    setFormData({
      pageSlug: '',
      startDate: '',
      endDate: '',
      isActive: true
    });
    setEditingPeriod(null);
    setError('');
  };

  const getWeddingPageName = (pageSlug: string): string => {
    const page = weddingPages.find(p => p.slug === pageSlug);
    return page ? page.displayName : pageSlug;
  };

  const getPeriodForPage = (pageSlug: string): DisplayPeriod | undefined => {
    return periods.find(p => p.pageSlug === pageSlug);
  };

  const isCurrentlyVisible = (period: DisplayPeriod): boolean => {
    if (!period.isActive) return true; // 비활성화된 경우 항상 표시
    const now = new Date();
    return now >= period.startDate && now <= period.endDate;
  };

  const getStatusText = (period: DisplayPeriod): string => {
    if (!period.isActive) return '제한 없음';
    
    const now = new Date();
    if (now < period.startDate) return '시작 전';
    if (now > period.endDate) return '종료됨';
    return '노출 중';
  };

  const getStatusColor = (period: DisplayPeriod): string => {
    if (!period.isActive) return '#28a745'; // 녹색
    
    const now = new Date();
    if (now < period.startDate) return '#ffc107'; // 노란색
    if (now > period.endDate) return '#dc3545'; // 빨간색
    return '#28a745'; // 녹색
  };

  if (!isVisible) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span className={styles.icon}>📅</span>
          청첩장 노출 기간 관리
        </h2>
        <p className={styles.description}>
          각 청첩장 페이지의 노출 기간을 설정할 수 있습니다. 기간이 지나면 일반 사용자에게는 빈 화면이 표시됩니다.
        </p>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <span className={styles.errorIcon}>⚠️</span>
          {error}
        </div>
      )}

      {/* 노출 기간 설정 폼 */}
      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>
          {editingPeriod ? '노출 기간 수정' : '새 노출 기간 설정'}
        </h3>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <label className={styles.label}>
              <span className={styles.labelIcon}>💒</span>
              웨딩 페이지
            </label>
            <select
              value={formData.pageSlug}
              onChange={(e) => setFormData({ ...formData, pageSlug: e.target.value })}
              className={styles.select}
              disabled={!!editingPeriod}
              required
            >
              <option value="">웨딩 페이지를 선택하세요</option>
              {weddingPages.map((page) => (
                <option key={page.slug} value={page.slug}>
                  {page.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>
              <span className={styles.labelIcon}>📅</span>
              시작일
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>
              <span className={styles.labelIcon}>📅</span>
              종료일
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className={styles.checkbox}
              />
              <span className={styles.checkboxText}>노출 기간 제한 활성화</span>
            </label>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.submitButton}>
              <span className={styles.buttonIcon}>💾</span>
              {editingPeriod ? '수정하기' : '설정하기'}
            </button>
            
            {editingPeriod && (
              <button
                type="button"
                onClick={resetForm}
                className={styles.cancelButton}
              >
                <span className={styles.buttonIcon}>❌</span>
                취소
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 현재 설정된 노출 기간 목록 */}
      <div className={styles.listSection}>
        <h3 className={styles.sectionTitle}>현재 설정된 노출 기간</h3>
        
        {isLoading ? (
          <div className={styles.loading}>
            <span className={styles.loadingIcon}>⏳</span>
            노출 기간 목록을 불러오는 중...
          </div>
        ) : periods.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📋</span>
            <p>설정된 노출 기간이 없습니다.</p>
            <p className={styles.emptySubtext}>모든 페이지가 제한 없이 표시됩니다.</p>
          </div>
        ) : (
          <div className={styles.periodsList}>
            {weddingPages.map((page) => {
              const period = getPeriodForPage(page.slug);
              return (
                <div key={page.slug} className={styles.periodItem}>
                  <div className={styles.periodHeader}>
                    <div className={styles.periodInfo}>
                      <h4 className={styles.periodPageName}>{page.displayName}</h4>
                      <span 
                        className={styles.periodStatus}
                        style={{ color: period ? getStatusColor(period) : '#28a745' }}
                      >
                        {period ? getStatusText(period) : '제한 없음'}
                      </span>
                    </div>
                    
                    {period && (
                      <div className={styles.periodActions}>
                        <button
                          onClick={() => startEditing(period)}
                          className={styles.editButton}
                          title="수정"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(period.pageSlug)}
                          className={styles.deleteButton}
                          title="삭제"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {period && (
                    <div className={styles.periodDetails}>
                      <div className={styles.periodDates}>
                        <span className={styles.dateInfo}>
                          <span className={styles.dateLabel}>시작:</span>
                          {period.startDate.toLocaleDateString('ko-KR')}
                        </span>
                        <span className={styles.dateInfo}>
                          <span className={styles.dateLabel}>종료:</span>
                          {period.endDate.toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      <div className={styles.periodActive}>
                        활성화: {period.isActive ? '✅' : '❌'}
                      </div>
                    </div>
                  )}
                  
                  {!period && (
                    <div className={styles.noPeriod}>
                      <span className={styles.noPeriodText}>노출 기간 제한 없음</span>
                      <button
                        onClick={() => setFormData({ ...formData, pageSlug: page.slug })}
                        className={styles.addPeriodButton}
                      >
                        기간 설정하기
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
