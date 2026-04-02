'use client';

import { useEffect, useState } from 'react';

import { useAdmin } from '@/contexts';
import {
  getEditableInvitationPageConfig,
  restoreInvitationPageConfig,
  saveInvitationPageConfig,
  setInvitationPagePublished,
} from '@/services/invitationPageService';
import { getClientEditorTokenHash } from '@/services/passwordService';
import type { InvitationPageSeed } from '@/types/invitationPage';

import {
  AccountSectionPanel,
  GuideSectionPanel,
  PersonEditorCard,
} from './pageEditorPanels';
import styles from './page.module.css';
import {
  cloneConfig,
  createEmptyAccount,
  createEmptyGuideItem,
  keywordsToText,
  normalizeFormConfig,
  prepareConfigForSave,
  textToKeywords,
  type AccountKind,
  type GuideKind,
  type NoticeTone,
  type ParentRole,
  type PersonRole,
} from './pageEditorUtils';

const TOKEN_STORAGE_PREFIX = 'page-editor-token:';

type NoticeState = { tone: NoticeTone; message: string } | null;

interface PageEditorClientProps {
  slug: string;
  initialDisplayName: string;
  initialGroomName: string;
  initialBrideName: string;
  initialDate: string;
  initialVenue: string;
}

function buildEditorTitle(groomName: string, brideName: string, fallbackLabel: string) {
  const groom = groomName.trim();
  const bride = brideName.trim();

  if (groom && bride) {
    return `${groom}, ${bride}님의 청첩장 설정`;
  }

  if (groom || bride) {
    return `${groom || bride}님의 청첩장 설정`;
  }

  return `${fallbackLabel} 청첩장 설정`;
}

function parseNumericInput(value: string, fallback = 0) {
  if (!value.trim()) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function PageEditorClient({
  slug,
  initialDisplayName,
  initialGroomName,
  initialBrideName,
  initialDate,
  initialVenue,
}: PageEditorClientProps) {
  const { isAdminLoading, isAdminLoggedIn } = useAdmin();
  const storageKey = `${TOKEN_STORAGE_PREFIX}${slug}`;

  const [formState, setFormState] = useState<InvitationPageSeed | null>(null);
  const [baselineState, setBaselineState] = useState<InvitationPageSeed | null>(null);
  const [published, setPublished] = useState(true);
  const [baselinePublished, setBaselinePublished] = useState(true);
  const [hasCustomConfig, setHasCustomConfig] = useState(false);
  const [dataSourceLabel, setDataSourceLabel] = useState('기본 샘플 사용 중');
  const [editorTokenHash, setEditorTokenHash] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingVisibility, setIsSavingVisibility] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  const canEdit = isAdminLoggedIn || Boolean(editorTokenHash);
  const title = buildEditorTitle(
    formState?.couple.groom.name ?? initialGroomName,
    formState?.couple.bride.name ?? initialBrideName,
    formState?.displayName || initialDisplayName || slug
  );
  const previewLinks = [
    { href: `/${slug}`, label: '감성 청첩장 보기' },
    { href: `/${slug}/simple`, label: '심플 청첩장 보기' },
  ];
  const isDirty = Boolean(
    formState &&
      baselineState &&
      (JSON.stringify(formState) !== JSON.stringify(baselineState) ||
        published !== baselinePublished)
  );

  const applyLoadedConfig = (
    config: Awaited<ReturnType<typeof getEditableInvitationPageConfig>>
  ) => {
    if (!config) {
      throw new Error('설정 정보를 찾을 수 없습니다.');
    }

    const normalized = normalizeFormConfig(config.config);
    setFormState(normalized);
    setBaselineState(cloneConfig(normalized));
    setPublished(config.published);
    setBaselinePublished(config.published);
    setHasCustomConfig(config.hasCustomConfig);
    setDataSourceLabel(
      config.dataSource === 'firestore' ? '맞춤 설정 사용 중' : '기본 샘플 사용 중'
    );
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedToken = window.localStorage.getItem(storageKey);
    if (savedToken) {
      setEditorTokenHash(savedToken);
    }
  }, [storageKey]);

  useEffect(() => {
    if (isAdminLoading || !canEdit) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const load = async () => {
      try {
        const config = await getEditableInvitationPageConfig(slug);
        if (cancelled) {
          return;
        }

        applyLoadedConfig(config);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error('[PageEditorClient] failed to load config', error);
        setNotice({
          tone: 'error',
          message: '설정 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
        });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [canEdit, isAdminLoading, slug]);

  const updateForm = (updater: (draft: InvitationPageSeed) => void) => {
    setFormState((current) => {
      if (!current) {
        return current;
      }

      const next = cloneConfig(current);
      updater(next);
      return next;
    });
  };

  const handleTopLevelFieldChange = (
    field: 'displayName' | 'description' | 'date' | 'venue',
    value: string
  ) => {
    updateForm((draft) => {
      draft[field] = value;
      if (field === 'venue' && draft.pageData) {
        draft.pageData.venueName = value;
      }
    });
  };

  const handleWeddingDateFieldChange = (
    field: 'year' | 'month' | 'day' | 'hour' | 'minute',
    value: string
  ) => {
    updateForm((draft) => {
      draft.weddingDateTime[field] = parseNumericInput(
        value,
        draft.weddingDateTime[field]
      );
    });
  };

  const handlePageDataFieldChange = (
    field:
      | 'subtitle'
      | 'ceremonyTime'
      | 'ceremonyAddress'
      | 'ceremonyContact'
      | 'greetingMessage'
      | 'greetingAuthor'
      | 'mapUrl'
      | 'mapDescription'
      | 'venueName',
    value: string
  ) => {
    updateForm((draft) => {
      if (!draft.pageData) {
        return;
      }

      draft.pageData[field] = value;
    });
  };

  const handleKakaoMapFieldChange = (
    field: 'latitude' | 'longitude' | 'level' | 'markerTitle',
    value: string
  ) => {
    updateForm((draft) => {
      if (!draft.pageData?.kakaoMap) {
        return;
      }

      if (field === 'markerTitle') {
        draft.pageData.kakaoMap.markerTitle = value;
        return;
      }

      draft.pageData.kakaoMap[field] = parseNumericInput(
        value,
        draft.pageData.kakaoMap[field] ?? 0
      );
    });
  };

  const handleMetadataFieldChange = (
    group: 'root' | 'images' | 'openGraph' | 'twitter' | 'keywords',
    field: string,
    value: string
  ) => {
    updateForm((draft) => {
      if (group === 'root' && (field === 'title' || field === 'description')) {
        draft.metadata[field] = value;
        return;
      }

      if (group === 'images' && (field === 'wedding' || field === 'favicon')) {
        draft.metadata.images[field] = value;
        return;
      }

      if (
        (group === 'openGraph' || group === 'twitter') &&
        (field === 'title' || field === 'description')
      ) {
        draft.metadata[group][field] = value;
        return;
      }

      if (group === 'keywords') {
        draft.metadata.keywords = textToKeywords(value);
      }
    });
  };

  const handlePersonFieldChange = (
    role: PersonRole,
    field: 'name' | 'order' | 'phone',
    value: string
  ) => {
    updateForm((draft) => {
      draft.couple[role][field] = value;
      if (role === 'groom') {
        draft.groomName = draft.couple.groom.name;
      } else {
        draft.brideName = draft.couple.bride.name;
      }

      if (draft.pageData) {
        draft.pageData[role] = cloneConfig(draft.couple[role]);
      }
    });
  };

  const handleParentFieldChange = (
    role: PersonRole,
    parentRole: ParentRole,
    field: 'relation' | 'name' | 'phone',
    value: string
  ) => {
    updateForm((draft) => {
      const currentParent = draft.couple[role][parentRole];
      draft.couple[role][parentRole] = {
        relation: currentParent?.relation ?? '',
        name: currentParent?.name ?? '',
        phone: currentParent?.phone ?? '',
        [field]: value,
      };

      if (draft.pageData) {
        draft.pageData[role] = cloneConfig(draft.couple[role]);
      }
    });
  };

  const handleGuideAdd = (kind: GuideKind) => {
    updateForm((draft) => {
      if (!draft.pageData) {
        return;
      }

      draft.pageData[kind] = [...(draft.pageData[kind] ?? []), createEmptyGuideItem()];
    });
  };

  const handleGuideRemove = (kind: GuideKind, index: number) => {
    updateForm((draft) => {
      if (!draft.pageData?.[kind]) {
        return;
      }

      draft.pageData[kind] = draft.pageData[kind].filter(
        (_, itemIndex) => itemIndex !== index
      );
    });
  };

  const handleGuideChange = (
    kind: GuideKind,
    index: number,
    field: 'title' | 'content',
    value: string
  ) => {
    updateForm((draft) => {
      const target = draft.pageData?.[kind]?.[index];
      if (!target) {
        return;
      }

      target[field] = value;
    });
  };

  const handleAccountAdd = (kind: AccountKind) => {
    updateForm((draft) => {
      if (!draft.pageData?.giftInfo) {
        return;
      }

      draft.pageData.giftInfo[kind] = [
        ...(draft.pageData.giftInfo[kind] ?? []),
        createEmptyAccount(),
      ];
    });
  };

  const handleAccountRemove = (kind: AccountKind, index: number) => {
    updateForm((draft) => {
      if (!draft.pageData?.giftInfo?.[kind]) {
        return;
      }

      draft.pageData.giftInfo[kind] = draft.pageData.giftInfo[kind].filter(
        (_, itemIndex) => itemIndex !== index
      );
    });
  };

  const handleAccountChange = (
    kind: AccountKind,
    index: number,
    field: 'bank' | 'accountNumber' | 'accountHolder',
    value: string
  ) => {
    updateForm((draft) => {
      const target = draft.pageData?.giftInfo?.[kind]?.[index];
      if (!target) {
        return;
      }

      target[field] = value;
    });
  };

  const loadLatestConfig = async (successMessage?: string) => {
    setIsRefreshing(true);

    try {
      const config = await getEditableInvitationPageConfig(slug);
      applyLoadedConfig(config);
      if (successMessage) {
        setNotice({ tone: 'success', message: successMessage });
      }
    } catch (error) {
      console.error('[PageEditorClient] failed to refresh config', error);
      setNotice({
        tone: 'error',
        message: '최신 설정을 불러오지 못했습니다. 다시 시도해 주세요.',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUnlock = async () => {
    const trimmedPassword = passwordInput.trim();
    if (!trimmedPassword) {
      setNotice({ tone: 'error', message: '페이지 비밀번호를 입력해 주세요.' });
      return;
    }

    setIsUnlocking(true);

    try {
      const token = await getClientEditorTokenHash(slug, trimmedPassword);
      if (!token) {
        setNotice({
          tone: 'error',
          message: '비밀번호가 올바르지 않습니다. 다시 확인해 주세요.',
        });
        return;
      }

      setEditorTokenHash(token);
      setPasswordInput('');
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, token);
      }
      setNotice({
        tone: 'success',
        message: '편집 권한을 확인했습니다. 설정 정보를 불러오는 중입니다.',
      });
    } catch (error) {
      console.error('[PageEditorClient] failed to verify password', error);
      setNotice({
        tone: 'error',
        message: '비밀번호 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      });
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleRefresh = async () => {
    if (isDirty && typeof window !== 'undefined') {
      const confirmed = window.confirm(
        '저장하지 않은 변경 사항이 사라집니다. 최신 설정을 다시 불러올까요?'
      );
      if (!confirmed) {
        return;
      }
    }

    await loadLatestConfig('최신 설정을 다시 불러왔습니다.');
  };

  const handleRestore = async () => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        '기본값으로 복원하면 현재 맞춤 설정이 초기화됩니다. 계속할까요?'
      );
      if (!confirmed) {
        return;
      }
    }

    setIsRestoring(true);

    try {
      await restoreInvitationPageConfig(slug, {
        published,
        editorTokenHash: isAdminLoggedIn ? null : editorTokenHash,
      });
      await loadLatestConfig('기본 설정으로 복원했습니다.');
    } catch (error) {
      console.error('[PageEditorClient] failed to restore config', error);
      setNotice({
        tone: 'error',
        message: '기본 설정으로 복원하지 못했습니다. 다시 시도해 주세요.',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleSaveVisibility = async () => {
    setIsSavingVisibility(true);

    try {
      await setInvitationPagePublished(slug, published, {
        editorTokenHash: isAdminLoggedIn ? null : editorTokenHash,
      });
      setBaselinePublished(published);
      setNotice({
        tone: 'success',
        message: published ? '공개 상태를 저장했습니다.' : '비공개 상태를 저장했습니다.',
      });
    } catch (error) {
      console.error('[PageEditorClient] failed to save visibility', error);
      setNotice({
        tone: 'error',
        message: '공개 상태를 저장하지 못했습니다. 다시 시도해 주세요.',
      });
    } finally {
      setIsSavingVisibility(false);
    }
  };

  const handleSave = async () => {
    if (!formState) {
      return;
    }

    setIsSaving(true);

    try {
      const nextConfig = prepareConfigForSave(formState, slug);
      await saveInvitationPageConfig(nextConfig, {
        published,
        editorTokenHash: isAdminLoggedIn ? null : editorTokenHash,
      });
      setFormState(cloneConfig(nextConfig));
      setBaselineState(cloneConfig(nextConfig));
      setBaselinePublished(published);
      setHasCustomConfig(true);
      setDataSourceLabel('맞춤 설정 사용 중');
      setNotice({ tone: 'success', message: '청첩장 설정을 저장했습니다.' });
    } catch (error) {
      console.error('[PageEditorClient] failed to save config', error);
      setNotice({
        tone: 'error',
        message: '설정을 저장하지 못했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderActionBar = (position: 'top' | 'bottom') => (
    <div
      className={`${styles.actionBar} ${position === 'bottom' ? styles.actionBarBottom : ''}`}
    >
      <div className={styles.actionMeta}>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={published}
            onChange={(event) => setPublished(event.target.checked)}
            disabled={!formState || isSaving || isRestoring || isSavingVisibility}
          />
          <span>공개 페이지로 노출하기</span>
        </label>
        <div className={styles.metaRow}>
          <span className={styles.metaChip}>{dataSourceLabel}</span>
          <span className={styles.metaChip}>
            {hasCustomConfig ? '개별 설정 저장됨' : '기본 샘플 기준'}
          </span>
          <span className={styles.metaChip}>
            {published ? '현재 공개 상태' : '현재 비공개 상태'}
          </span>
        </div>
      </div>

      <div className={styles.actionRow}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => void handleSaveVisibility()}
          disabled={
            !formState ||
            isSaving ||
            isRestoring ||
            isSavingVisibility ||
            published === baselinePublished
          }
        >
          {isSavingVisibility ? '공개 상태 저장 중...' : '공개 상태 저장'}
        </button>
        <button
          type="button"
          className={styles.ghostButton}
          onClick={() => void handleRefresh()}
          disabled={!formState || isSaving || isRestoring || isRefreshing}
        >
          {isRefreshing ? '다시 불러오는 중...' : '다시 불러오기'}
        </button>
        <button
          type="button"
          className={styles.ghostButton}
          onClick={() => void handleRestore()}
          disabled={!formState || isSaving || isRestoring}
        >
          {isRestoring ? '복원 중...' : '기본값 복원'}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => {
            if (!baselineState) {
              return;
            }
            setFormState(cloneConfig(baselineState));
            setPublished(baselinePublished);
            setNotice({
              tone: 'neutral',
              message: '마지막으로 불러온 상태로 되돌렸습니다.',
            });
          }}
          disabled={!formState || !isDirty || isSaving || isRestoring}
        >
          변경 취소
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => void handleSave()}
          disabled={!formState || isSaving || isRestoring}
        >
          {isSaving ? '저장하는 중...' : '저장하기'}
        </button>
      </div>
    </div>
  );

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={`${styles.card} ${styles.heroCard}`}>
          <div className={styles.hero}>
            <div className={styles.heroContent}>
              <p className={styles.eyebrow}>청첩장 설정 편집기</p>
              <h1 className={styles.title}>{title}</h1>
              <p className={styles.description}>
                청첩장 문구, 예식 정보, 지도, 계좌 안내, 공유용 문구를 보기 좋은 순서로 정리할 수 있습니다.
              </p>
            </div>

            <div className={styles.heroAside}>
              <span className={styles.slugChip}>페이지 주소: /{slug}</span>
              <div className={styles.previewRow}>
                {previewLinks.map((link) => (
                  <a
                    key={link.href}
                    className={styles.previewLink}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>신랑 · 신부</span>
              <strong className={styles.summaryValue}>
                {formState?.couple.groom.name || initialGroomName || '-'} ·{' '}
                {formState?.couple.bride.name || initialBrideName || '-'}
              </strong>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>예식 일시</span>
              <strong className={styles.summaryValue}>
                {formState?.date || initialDate || '아직 입력되지 않았습니다.'}
              </strong>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>예식 장소</span>
              <strong className={styles.summaryValue}>
                {formState?.venue || initialVenue || '아직 입력되지 않았습니다.'}
              </strong>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>설정 상태</span>
              <strong className={styles.summaryValue}>
                {hasCustomConfig ? '맞춤 설정 저장됨' : '기본 샘플 사용 중'}
              </strong>
            </div>
          </div>
        </section>

        {notice ? (
          <div
            className={`${styles.notice} ${
              notice.tone === 'success'
                ? styles.noticeSuccess
                : notice.tone === 'error'
                  ? styles.noticeError
                  : styles.noticeNeutral
            }`}
          >
            {notice.message}
          </div>
        ) : null}

        {!canEdit ? (
          <section className={styles.lockedCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.lockedTitle}>편집 비밀번호 확인</h2>
                <p className={styles.lockedText}>
                  고객용 설정 편집기는 페이지별 비밀번호로 보호됩니다. 관리자 로그인 중이라면 별도 비밀번호 없이 수정할 수 있습니다.
                </p>
              </div>
            </div>

            <div className={styles.authGrid}>
              <label className={styles.field}>
                <span className={styles.label}>페이지 비밀번호</span>
                <input
                  className={styles.input}
                  type="password"
                  value={passwordInput}
                  onChange={(event) => setPasswordInput(event.target.value)}
                  placeholder="관리자에게 전달받은 비밀번호를 입력해 주세요"
                />
              </label>
            </div>

            <div className={styles.actionRow}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => void handleUnlock()}
                disabled={isUnlocking}
              >
                {isUnlocking ? '확인하는 중...' : '편집 시작하기'}
              </button>
            </div>
          </section>
        ) : null}

        {canEdit && isLoading ? (
          <section className={styles.lockedCard}>
            <h2 className={styles.lockedTitle}>설정 정보를 불러오는 중입니다.</h2>
            <p className={styles.lockedText}>
              잠시만 기다려 주세요. 저장된 청첩장 설정을 확인하고 있습니다.
            </p>
          </section>
        ) : null}

        {canEdit && formState ? (
          <>
            {renderActionBar('top')}

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>기본 정보</h2>
                  <p className={styles.sectionDescription}>
                    페이지 제목과 소개 문구, 기본 예식 정보를 먼저 정리합니다.
                  </p>
                </div>
              </div>

              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  <span className={styles.label}>청첩장 이름</span>
                  <input
                    className={styles.input}
                    value={formState.displayName}
                    onChange={(event) =>
                      handleTopLevelFieldChange('displayName', event.target.value)
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>대표 날짜 문구</span>
                  <input
                    className={styles.input}
                    value={formState.date}
                    onChange={(event) =>
                      handleTopLevelFieldChange('date', event.target.value)
                    }
                  />
                </label>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span className={styles.label}>소개 문구</span>
                  <textarea
                    className={styles.textarea}
                    value={formState.description}
                    onChange={(event) =>
                      handleTopLevelFieldChange('description', event.target.value)
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>예식 장소</span>
                  <input
                    className={styles.input}
                    value={formState.venue}
                    onChange={(event) =>
                      handleTopLevelFieldChange('venue', event.target.value)
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>표지 보조 문구</span>
                  <input
                    className={styles.input}
                    value={formState.pageData?.subtitle ?? ''}
                    onChange={(event) =>
                      handlePageDataFieldChange('subtitle', event.target.value)
                    }
                  />
                </label>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>예식 일정과 장소 안내</h2>
                  <p className={styles.sectionDescription}>
                    시간, 주소, 연락처, 지도 정보처럼 방문에 필요한 내용을 정리합니다.
                  </p>
                </div>
              </div>

              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  <span className={styles.label}>예식 시간 문구</span>
                  <input
                    className={styles.input}
                    value={formState.pageData?.ceremonyTime ?? ''}
                    onChange={(event) =>
                      handlePageDataFieldChange('ceremonyTime', event.target.value)
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>예식장 표시 이름</span>
                  <input
                    className={styles.input}
                    value={formState.pageData?.venueName ?? ''}
                    onChange={(event) =>
                      handlePageDataFieldChange('venueName', event.target.value)
                    }
                  />
                </label>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span className={styles.label}>예식장 주소</span>
                  <input
                    className={styles.input}
                    value={formState.pageData?.ceremonyAddress ?? ''}
                    onChange={(event) =>
                      handlePageDataFieldChange('ceremonyAddress', event.target.value)
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>예식장 연락처</span>
                  <input
                    className={styles.input}
                    value={formState.pageData?.ceremonyContact ?? ''}
                    onChange={(event) =>
                      handlePageDataFieldChange('ceremonyContact', event.target.value)
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>지도 링크</span>
                  <input
                    className={styles.input}
                    value={formState.pageData?.mapUrl ?? ''}
                    onChange={(event) =>
                      handlePageDataFieldChange('mapUrl', event.target.value)
                    }
                  />
                </label>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span className={styles.label}>지도 안내 문구</span>
                  <textarea
                    className={styles.textarea}
                    value={formState.pageData?.mapDescription ?? ''}
                    onChange={(event) =>
                      handlePageDataFieldChange('mapDescription', event.target.value)
                    }
                  />
                </label>
              </div>

              <div className={styles.subCard}>
                <div className={styles.subCardHeader}>
                  <div>
                    <h3 className={styles.subCardTitle}>실제 예식 시각</h3>
                    <p className={styles.subCardDescription}>
                      카운트다운과 일부 노출 계산에 사용되는 날짜 정보입니다.
                    </p>
                  </div>
                </div>

                <div className={styles.dualGrid}>
                  {(['year', 'month', 'day', 'hour', 'minute'] as const).map((field) => (
                    <label key={field} className={styles.field}>
                      <span className={styles.label}>
                        {field === 'year'
                          ? '연도'
                          : field === 'month'
                            ? '월'
                            : field === 'day'
                              ? '일'
                              : field === 'hour'
                                ? '시'
                                : '분'}
                      </span>
                      <input
                        className={styles.input}
                        inputMode="numeric"
                        value={String(formState.weddingDateTime[field] ?? '')}
                        onChange={(event) =>
                          handleWeddingDateFieldChange(field, event.target.value)
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.subCard}>
                <div className={styles.subCardHeader}>
                  <div>
                    <h3 className={styles.subCardTitle}>카카오 지도 좌표</h3>
                    <p className={styles.subCardDescription}>
                      정확한 위치 표시가 필요한 경우에만 수정해 주세요.
                    </p>
                  </div>
                </div>

                <div className={styles.fieldGrid}>
                  <label className={styles.field}>
                    <span className={styles.label}>위도</span>
                    <input
                      className={styles.input}
                      inputMode="decimal"
                      value={String(formState.pageData?.kakaoMap?.latitude ?? 0)}
                      onChange={(event) =>
                        handleKakaoMapFieldChange('latitude', event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>경도</span>
                    <input
                      className={styles.input}
                      inputMode="decimal"
                      value={String(formState.pageData?.kakaoMap?.longitude ?? 0)}
                      onChange={(event) =>
                        handleKakaoMapFieldChange('longitude', event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>확대 레벨</span>
                    <input
                      className={styles.input}
                      inputMode="numeric"
                      value={String(formState.pageData?.kakaoMap?.level ?? 3)}
                      onChange={(event) =>
                        handleKakaoMapFieldChange('level', event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>지도 마커 이름</span>
                    <input
                      className={styles.input}
                      value={formState.pageData?.kakaoMap?.markerTitle ?? ''}
                      onChange={(event) =>
                        handleKakaoMapFieldChange('markerTitle', event.target.value)
                      }
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>신랑 · 신부 정보</h2>
                  <p className={styles.sectionDescription}>
                    성함, 호칭, 연락처와 부모님 정보를 차례대로 입력합니다.
                  </p>
                </div>
              </div>

              <div className={styles.dualGrid}>
                <PersonEditorCard
                  role="groom"
                  label="신랑 정보"
                  person={formState.couple.groom}
                  disabled={false}
                  onPersonFieldChange={handlePersonFieldChange}
                  onParentFieldChange={handleParentFieldChange}
                />
                <PersonEditorCard
                  role="bride"
                  label="신부 정보"
                  person={formState.couple.bride}
                  disabled={false}
                  onPersonFieldChange={handlePersonFieldChange}
                  onParentFieldChange={handleParentFieldChange}
                />
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>인사말과 본문 문구</h2>
                  <p className={styles.sectionDescription}>
                    손님이 읽게 될 인사말과 서명을 자연스럽게 정리합니다.
                  </p>
                </div>
              </div>

              <div className={styles.fieldGrid}>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span className={styles.label}>인사말 본문</span>
                  <textarea
                    className={styles.textarea}
                    value={formState.pageData?.greetingMessage ?? ''}
                    onChange={(event) =>
                      handlePageDataFieldChange('greetingMessage', event.target.value)
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>인사말 서명</span>
                  <input
                    className={styles.input}
                    value={formState.pageData?.greetingAuthor ?? ''}
                    onChange={(event) =>
                      handlePageDataFieldChange('greetingAuthor', event.target.value)
                    }
                  />
                </label>
              </div>
            </section>

            <GuideSectionPanel
              kind="venueGuide"
              title="오시는 길 안내"
              description="주차, 리셉션, 식사 안내처럼 손님 방문에 필요한 정보를 항목별로 작성합니다."
              items={formState.pageData?.venueGuide ?? []}
              disabled={false}
              onAdd={handleGuideAdd}
              onRemove={handleGuideRemove}
              onChange={handleGuideChange}
            />

            <GuideSectionPanel
              kind="wreathGuide"
              title="화환 안내"
              description="화환 접수와 배송 시간 등 별도 안내가 필요하다면 여기에 정리해 주세요."
              items={formState.pageData?.wreathGuide ?? []}
              disabled={false}
              onAdd={handleGuideAdd}
              onRemove={handleGuideRemove}
              onChange={handleGuideChange}
            />

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>축의금과 계좌 안내</h2>
                  <p className={styles.sectionDescription}>
                    신랑측과 신부측 계좌를 나눠 입력하고 안내 문구도 함께 관리합니다.
                  </p>
                </div>
              </div>

              <div className={styles.stackColumn}>
                <AccountSectionPanel
                  kind="groomAccounts"
                  title="신랑측 계좌"
                  description="신랑 본인과 가족 계좌를 순서대로 입력해 주세요."
                  accounts={formState.pageData?.giftInfo?.groomAccounts ?? []}
                  disabled={false}
                  onAdd={handleAccountAdd}
                  onRemove={handleAccountRemove}
                  onChange={handleAccountChange}
                />
                <AccountSectionPanel
                  kind="brideAccounts"
                  title="신부측 계좌"
                  description="신부 본인과 가족 계좌를 순서대로 입력해 주세요."
                  accounts={formState.pageData?.giftInfo?.brideAccounts ?? []}
                  disabled={false}
                  onAdd={handleAccountAdd}
                  onRemove={handleAccountRemove}
                  onChange={handleAccountChange}
                />

                <div className={styles.subCard}>
                  <div className={styles.subCardHeader}>
                    <div>
                      <h3 className={styles.subCardTitle}>계좌 안내 문구</h3>
                      <p className={styles.subCardDescription}>
                        계좌 영역 상단에 노출할 안내 문구입니다.
                      </p>
                    </div>
                  </div>

                  <label className={styles.field}>
                    <span className={styles.label}>안내 문구</span>
                    <textarea
                      className={styles.textarea}
                      value={formState.pageData?.giftInfo?.message ?? ''}
                      onChange={(event) =>
                        updateForm((draft) => {
                          if (!draft.pageData?.giftInfo) {
                            return;
                          }
                          draft.pageData.giftInfo.message = event.target.value;
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>검색 및 공유 정보</h2>
                  <p className={styles.sectionDescription}>
                    링크 공유에 사용되는 제목, 설명, 대표 이미지를 정리합니다.
                  </p>
                </div>
              </div>

              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  <span className={styles.label}>브라우저 제목</span>
                  <input
                    className={styles.input}
                    value={formState.metadata.title}
                    onChange={(event) =>
                      handleMetadataFieldChange('root', 'title', event.target.value)
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>대표 설명 문구</span>
                  <input
                    className={styles.input}
                    value={formState.metadata.description}
                    onChange={(event) =>
                      handleMetadataFieldChange('root', 'description', event.target.value)
                    }
                  />
                </label>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span className={styles.label}>검색 키워드</span>
                  <input
                    className={styles.input}
                    value={keywordsToText(formState.metadata.keywords)}
                    onChange={(event) =>
                      handleMetadataFieldChange('keywords', 'keywords', event.target.value)
                    }
                    placeholder="쉼표로 구분해서 입력해 주세요"
                  />
                </label>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span className={styles.label}>대표 이미지 주소</span>
                  <input
                    className={styles.input}
                    value={formState.metadata.images.wedding}
                    onChange={(event) =>
                      handleMetadataFieldChange('images', 'wedding', event.target.value)
                    }
                  />
                </label>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span className={styles.label}>파비콘 주소</span>
                  <input
                    className={styles.input}
                    value={formState.metadata.images.favicon}
                    onChange={(event) =>
                      handleMetadataFieldChange('images', 'favicon', event.target.value)
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>오픈그래프 제목</span>
                  <input
                    className={styles.input}
                    value={formState.metadata.openGraph.title}
                    onChange={(event) =>
                      handleMetadataFieldChange('openGraph', 'title', event.target.value)
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>오픈그래프 설명</span>
                  <input
                    className={styles.input}
                    value={formState.metadata.openGraph.description}
                    onChange={(event) =>
                      handleMetadataFieldChange(
                        'openGraph',
                        'description',
                        event.target.value
                      )
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>트위터 제목</span>
                  <input
                    className={styles.input}
                    value={formState.metadata.twitter.title}
                    onChange={(event) =>
                      handleMetadataFieldChange('twitter', 'title', event.target.value)
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>트위터 설명</span>
                  <input
                    className={styles.input}
                    value={formState.metadata.twitter.description}
                    onChange={(event) =>
                      handleMetadataFieldChange(
                        'twitter',
                        'description',
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>
            </section>

            {renderActionBar('bottom')}
          </>
        ) : null}
      </div>
    </main>
  );
}
