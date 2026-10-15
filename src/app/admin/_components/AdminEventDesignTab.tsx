'use client';

import { useRef, useState } from 'react';
import WeddingCover from '@/app/_components/public-invitations/wedding/WeddingCover';
import { sampleWeddingPage, SAMPLE_WEDDING_COVER } from '@/config/homeWeddingSample';
import { getInvitationThemeWizardDescription, type InvitationThemeKey } from '@/lib/invitationThemes';
import type { AppRoutes } from '@/lib/demoExperienceRoutes';
import { setAdminInvitationPageDefaultTheme, type InvitationPageSummary } from '@/services/invitationPageService';
import { useAdminWorkGuard } from './AdminWorkGuard';
import { SHORTCUT_ITEMS } from './adminPageUtils';
import styles from '../page.module.css';

interface AdminEventDesignTabProps {
  page: InvitationPageSummary;
  canEdit: boolean;
  routes: AppRoutes;
  onUpdated: () => void | Promise<void>;
}

export default function AdminEventDesignTab({ page, canEdit, routes, onUpdated }: AdminEventDesignTabProps) {
  const [pending, setPending] = useState<'save' | 'refresh' | null>(null);
  const [attemptedTheme, setAttemptedTheme] = useState<InvitationThemeKey | null>(null);
  const [savedTheme, setSavedTheme] = useState<InvitationThemeKey | null>(null);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const confirmed = savedTheme !== null && page.defaultTheme === savedTheme;
  useAdminWorkGuard({ dirty: false, busy: pending !== null });

  const saveTheme = async (theme: InvitationThemeKey) => {
    if (!canEdit || inFlight.current || page.defaultTheme === theme) return;
    inFlight.current = true;
    setPending('save');
    setAttemptedTheme(theme);
    setSavedTheme(null);
    setError('');
    let saved = false;
    try {
      await setAdminInvitationPageDefaultTheme(page.slug, theme);
      saved = true;
      setSavedTheme(theme);
      await onUpdated();
    } catch {
      setError(saved
        ? '기본 디자인은 저장했지만 최신 설정을 확인하지 못했습니다. 최신 설정 확인을 다시 시도해 주세요.'
        : '기본 디자인 변경에 실패했습니다. 원하는 디자인의 기본 주소에 사용을 다시 눌러 주세요.');
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  };

  const refresh = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending('refresh');
    setError('');
    try { await onUpdated(); }
    catch { setError('최신 설정을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
    finally { inFlight.current = false; setPending(null); }
  };

  return <div className={styles.eventThemeManager}>
    <h4 className={styles.eventThemeHeading}>청첩장 디자인</h4>
    <p className={styles.eventThemeHelp}>하나의 청첩장을 모든 디자인 주소에서 열 수 있습니다. 샘플 사진으로 디자인을 비교하세요. ‘고객 페이지 열기’에서는 {page.displayName}님의 저장된 사진과 내용을 확인할 수 있습니다.</p>
    {canEdit ? <p className={styles.eventThemeHelp}>기본 주소 /{page.slug}에 적용할 디자인만 변경합니다. 다른 디자인 주소와 저장된 내용, 공개 상태, 노출 기간은 유지됩니다.</p> : null}
    {canEdit && error ? <p className={styles.eventManagementError} role="alert">{error}</p> : null}
    {canEdit ? <p role="status">{pending === 'save' ? '기본 디자인을 저장하고 있습니다.' : pending === 'refresh' ? '최신 설정을 확인하고 있습니다.' : confirmed ? '기본 주소에 선택한 디자인을 적용했습니다.' : savedTheme ? '기본 디자인을 저장했습니다. 최신 설정에서 반영 여부를 확인해 주세요.' : ''}</p> : null}
    {canEdit && savedTheme && (!confirmed || error) ? <button type="button" className="admin-button admin-button-secondary" disabled={pending !== null} onClick={refresh}>최신 설정 확인</button> : null}
    <ul>
      {SHORTCUT_ITEMS.map((theme) => <li key={theme.key} data-current={theme.key === page.defaultTheme}>
        <div className={styles.eventThemeThumbnail} aria-hidden="true">
          <div><WeddingCover theme={theme.key} page={sampleWeddingPage} imageUrl={SAMPLE_WEDDING_COVER} titleId={`admin-theme-cover-${theme.key}`} /></div>
        </div>
        <div className={styles.eventThemeIdentity}>
          <strong>{theme.label}</strong>
          <span>{theme.key === page.defaultTheme ? '기본 주소 디자인' : '같은 내용으로 열기'}</span>
        </div>
        <p className={styles.eventThemeDescription}>{getInvitationThemeWizardDescription(theme.key)}</p>
        <a className="admin-button admin-button-secondary" href={routes.preview(page.slug, theme.key, page.eventType)} target="_blank" rel="noopener noreferrer" aria-label={`${theme.label} 청첩장 페이지 열기 (새 탭)`}>고객 페이지 열기</a>
        {canEdit ? <button type="button" className="admin-button admin-button-secondary" disabled={pending !== null || theme.key === page.defaultTheme} aria-label={`${theme.label} 기본 주소에 사용`} onClick={() => saveTheme(theme.key)}>{pending === 'save' && attemptedTheme === theme.key ? '저장 중' : theme.key === page.defaultTheme ? '기본 주소 디자인' : '기본 주소에 사용'}</button> : null}
      </li>)}
    </ul>
  </div>;
}
