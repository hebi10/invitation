'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { normalizeFormConfig } from '@/app/page-editor/pageEditorUtils';
import { useAdmin } from '@/contexts';
import type { EditableInvitationPageConfig } from '@/services/invitationPageService';
import { getEditableInvitationPageConfig } from '@/services/invitationPageService';
import {
  getClientEditorEditableConfig,
  getClientEditorSession,
} from '@/services/clientEditorSession';

import PageWizardStepPreview from './PageWizardStepPreview';
import { applyWizardStorageImageFallback } from './pageWizardImageFallback';
import styles from './page.module.css';
import {
  applyDerivedWizardDefaults,
  buildReviewSummary,
  getWizardSteps,
} from './pageWizardData';
import { formatSavedAt, getNoticeClassName } from './pageWizardShared';

interface PageWizardResultClientProps {
  slug: string;
}

export default function PageWizardResultClient({
  slug,
}: PageWizardResultClientProps) {
  const router = useRouter();
  const { isAdminLoading, isAdminLoggedIn } = useAdmin();
  const [hasClientSession, setHasClientSession] = useState(false);
  const [isSessionResolved, setIsSessionResolved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [configState, setConfigState] = useState<EditableInvitationPageConfig | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canView = isAdminLoggedIn || hasClientSession;
  const wizardSteps = useMemo(() => getWizardSteps(false), []);

  useEffect(() => {
    if (isAdminLoading) {
      return;
    }

    if (isAdminLoggedIn) {
      setHasClientSession(false);
      setIsSessionResolved(true);
      return;
    }

    let cancelled = false;

    const resolveClientSession = async () => {
      try {
        const session = await getClientEditorSession(slug);
        if (!cancelled) {
          setHasClientSession(session.authenticated);
        }
      } catch {
        if (!cancelled) {
          setHasClientSession(false);
        }
      } finally {
        if (!cancelled) {
          setIsSessionResolved(true);
        }
      }
    };

    void resolveClientSession();

    return () => {
      cancelled = true;
    };
  }, [isAdminLoading, isAdminLoggedIn, slug]);

  useEffect(() => {
    if (isAdminLoading || !isSessionResolved) {
      return;
    }

    if (!canView) {
      router.replace(`/page-wizard/${encodeURIComponent(slug)}`, { scroll: false });
      return;
    }

    let cancelled = false;

    const loadConfig = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const rawEditableConfig = isAdminLoggedIn
          ? await getEditableInvitationPageConfig(slug)
          : await getClientEditorEditableConfig(slug);
        const editableConfig = rawEditableConfig
          ? await applyWizardStorageImageFallback(rawEditableConfig)
          : null;

        if (cancelled) {
          return;
        }

        if (!editableConfig) {
          setConfigState(null);
          setErrorMessage('저장된 청첩장 데이터를 찾을 수 없습니다.');
          return;
        }

        setConfigState(editableConfig);
      } catch {
        if (!cancelled) {
          setConfigState(null);
          setErrorMessage('저장된 청첩장 데이터를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadConfig();

    return () => {
      cancelled = true;
    };
  }, [canView, isAdminLoading, isAdminLoggedIn, isSessionResolved, router, slug]);

  const previewFormState = useMemo(() => {
    if (!configState) {
      return null;
    }

    return applyDerivedWizardDefaults(normalizeFormConfig(configState.config));
  }, [configState]);

  const reviewSummary = useMemo(() => {
    if (!configState || !previewFormState) {
      return [];
    }

    return buildReviewSummary(wizardSteps, configState.defaultTheme, previewFormState, {
      slugInput: slug,
      persistedSlug: slug,
      groomKoreanName: previewFormState.couple.groom.name,
      brideKoreanName: previewFormState.couple.bride.name,
      groomEnglishName: '',
      brideEnglishName: '',
    });
  }, [configState, previewFormState, slug, wizardSteps]);

  if (isLoading || isAdminLoading || !isSessionResolved) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.summaryCard}>
            <p className={styles.eyebrow}>저장 결과 준비</p>
            <h1 className={styles.centerTitle}>저장된 청첩장 데이터를 불러오는 중입니다.</h1>
            <p className={styles.centerText}>
              마지막 저장 결과와 실제 페이지 이동 경로를 정리하고 있습니다.
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (!configState || !previewFormState) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          {errorMessage ? (
            <div className={getNoticeClassName('error')}>{errorMessage}</div>
          ) : null}
          <section className={styles.summaryCard}>
            <p className={styles.eyebrow}>결과 페이지</p>
            <h1 className={styles.centerTitle}>저장 결과를 정리하지 못했습니다.</h1>
            <p className={styles.centerText}>
              모바일 수정 화면으로 돌아가 다시 저장하거나 권한 상태를 확인해 주세요.
            </p>
            <div className={styles.inlineActions}>
              <Link
                href={`/page-wizard/${encodeURIComponent(slug)}`}
                className={styles.secondaryButton}
              >
                모바일 수정으로 돌아가기
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const livePagePath = `/${slug}/${configState.defaultTheme}`;
  const redirectPath = `/${slug}`;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={`${styles.summaryCard} ${styles.resultSummaryCard}`}>
          <p className={styles.eyebrow}>저장 완료</p>
          <h1 className={styles.centerTitle}>
            {previewFormState.displayName.trim() || `${slug} 결과 페이지`}
          </h1>
          <p className={`${styles.centerText}`}>
            마지막 저장 데이터를 단계별로 정리했습니다. 여기서 전체 입력 내용을 확인한 뒤
            실제 청첩장으로 바로 이동할 수 있습니다.
          </p>
          <div className={`${styles.fieldGrid} ${styles.resultMetaGrid}`}>
            <div className={styles.previewUrlCard}>
              <span className={styles.summaryLabel}>공유 URL</span>
              <strong className={styles.previewUrlValue}>https://msgnote.kr{redirectPath}</strong>
            </div>
            <div className={styles.previewUrlCard}>
              <span className={styles.summaryLabel}>실제 페이지 URL</span>
              <strong className={styles.previewUrlValue}>https://msgnote.kr{livePagePath}</strong>
            </div>
            <div className={styles.previewUrlCard}>
              <span className={styles.summaryLabel}>마지막 저장 시각</span>
              <strong className={styles.previewUrlValue}>
                {formatSavedAt(configState.lastSavedAt)}
              </strong>
            </div>
            <div className={styles.previewUrlCard}>
              <span className={styles.summaryLabel}>공개 상태</span>
              <strong className={styles.previewUrlValue}>
                {configState.published ? '저장 후 공개됨' : '비공개 초안'}
              </strong>
            </div>
          </div>
          <div className={`${styles.inlineActions} ${styles.resultActionRow}`}>
            <Link href={livePagePath} className={styles.primaryButton}>
              바로 확인해보기
            </Link>
            <Link
              href={`/page-wizard/${encodeURIComponent(slug)}`}
              className={styles.secondaryButton}
            >
              모바일 수정으로 돌아가기
            </Link>
          </div>
        </section>

        {!configState.published ? (
          <div className={getNoticeClassName('neutral')}>
            현재 페이지는 비공개 초안 상태입니다. 관리자 환경이 아니면 실제 공개 페이지에서
            접근 제한이 보일 수 있습니다.
          </div>
        ) : null}

        <div className={styles.fieldGrid}>
          {wizardSteps.map((step) => (
            <PageWizardStepPreview
              key={`result-preview-${step.key}`}
              stepKey={step.key}
              theme={configState.defaultTheme}
              slug={slug}
              formState={previewFormState}
              published={configState.published}
              reviewSummary={step.key === 'final' ? reviewSummary : undefined}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
