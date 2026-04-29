'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import Link from 'next/link';

import FirebaseAuthLoginCard from '@/app/_components/FirebaseAuthLoginCard';
import { normalizeFormConfig } from '@/app/page-editor/pageEditorUtils';
import { useAdmin } from '@/contexts';
import {
  FIFTEEN_MINUTES_MS,
  THIRTY_MINUTES_MS,
} from '@/lib/appQuery';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import type { EditableInvitationPageConfig } from '@/services/invitationPageService';
import { getEditableInvitationPageConfig } from '@/services/invitationPageService';
import { getCustomerEditableInvitationPageState } from '@/services/customerEventService';

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

type ResultLoadState =
  | { status: 'logged-out' }
  | { status: 'claim' }
  | { status: 'blocked'; errorMessage: string }
  | { status: 'ready'; configState: EditableInvitationPageConfig };

export default function PageWizardResultClient({
  slug,
}: PageWizardResultClientProps) {
  const { authUser, isAdminLoading, isAdminLoggedIn, isLoggedIn } = useAdmin();
  const resultQuery = useQuery<ResultLoadState>({
    queryKey: ['page-wizard-result', slug, authUser?.uid ?? null, isAdminLoggedIn, isLoggedIn],
    enabled: !isAdminLoading,
    queryFn: async () => {
      if (!isLoggedIn) {
        return { status: 'logged-out' } satisfies ResultLoadState;
      }

      let rawEditableConfig: EditableInvitationPageConfig | null = null;
      if (isAdminLoggedIn) {
        rawEditableConfig = await getEditableInvitationPageConfig(slug);
      } else {
        const customerState = await getCustomerEditableInvitationPageState(slug);
        if (customerState.status === 'blocked') {
          return {
            status: 'blocked',
            errorMessage: customerState.message,
          } satisfies ResultLoadState;
        }

        if (customerState.status !== 'ready') {
          return { status: 'claim' } satisfies ResultLoadState;
        }

        rawEditableConfig = customerState.editableConfig;
      }

      const editableConfig =
        rawEditableConfig && isAdminLoggedIn
          ? await applyWizardStorageImageFallback(rawEditableConfig)
          : rawEditableConfig;

      if (!editableConfig) {
        return {
          status: 'blocked',
          errorMessage: '저장된 청첩장 데이터를 찾을 수 없습니다.',
        } satisfies ResultLoadState;
      }

      return {
        status: 'ready',
        configState: editableConfig,
      } satisfies ResultLoadState;
    },
    staleTime: FIFTEEN_MINUTES_MS,
    gcTime: THIRTY_MINUTES_MS,
    refetchOnWindowFocus: false,
  });
  const resultState = resultQuery.data;
  const configState = resultState?.status === 'ready' ? resultState.configState : null;
  const errorMessage =
    resultState?.status === 'blocked'
      ? resultState.errorMessage
      : resultQuery.error instanceof Error
        ? '저장된 청첩장 데이터를 불러오지 못했습니다.'
        : null;
  const requiresOwnershipClaim = resultState?.status === 'claim';
  const isLoading = resultQuery.isLoading;

  const wizardSteps = useMemo(
    () =>
      getWizardSteps({
        eventType: configState?.config.eventType ?? undefined,
        includeSetupSteps: false,
        includeMusic: resolveInvitationFeatures(
          configState?.productTier,
          configState?.features
        ).showMusic,
      }),
    [configState?.config.eventType, configState?.features, configState?.productTier]
  );

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

  if (isLoading || isAdminLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.summaryCard}>
            <p className={styles.eyebrow}>결과 준비 중</p>
            <h1 className={styles.centerTitle}>저장한 청첩장 데이터를 불러오는 중입니다.</h1>
            <p className={styles.centerText}>
              마지막 저장 결과와 실제 페이지 이동 경로를 정리하고 있습니다.
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <FirebaseAuthLoginCard
            title="로그인 후 결과를 확인해 주세요"
            description="이메일 로그인이나 Google 로그인을 완료하면 현재 계정에 연결된 청첩장 결과를 확인할 수 있습니다."
            helperText="기본 이메일 로그인과 Google 로그인만 지원합니다."
          />
        </div>
      </main>
    );
  }

  if (requiresOwnershipClaim) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.summaryCard}>
            <p className={styles.eyebrow}>계정 연결 필요</p>
            <h1 className={styles.centerTitle}>관리자에게 청첩장 연결을 요청해 주세요</h1>
            <p className={styles.centerText}>
              이 결과 화면은 현재 로그인한 계정에 연결된 청첩장만 볼 수 있습니다.
            </p>
            <div className={styles.inlineActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => void resultQuery.refetch()}
                disabled={resultQuery.isRefetching}
              >
                {resultQuery.isRefetching ? '새로고침 중' : '새로고침'}
              </button>
              <Link className={styles.primaryButton} href="/my-invitations">
                내 이벤트로 이동
              </Link>
            </div>
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
              내 청첩장 목록에서 다시 열거나 편집 화면으로 돌아가 상태를 확인해 주세요.
            </p>
            <div className={styles.inlineActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => void resultQuery.refetch()}
                disabled={resultQuery.isRefetching}
              >
                {resultQuery.isRefetching ? '새로고침 중' : '새로고침'}
              </button>
              <Link href="/my-invitations" className={styles.secondaryButton}>
                내 청첩장으로 이동
              </Link>
              <Link
                href={`/page-wizard/${encodeURIComponent(slug)}`}
                className={styles.secondaryButton}
              >
                편집 화면으로 돌아가기
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
          <p className={styles.centerText}>
            마지막 저장 결과를 단계별로 정리했습니다. 여기에서 전체 입력 내용을 확인하고
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
              <span className={styles.summaryLabel}>마지막 저장 시간</span>
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
              바로 확인하기
            </Link>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void resultQuery.refetch()}
              disabled={resultQuery.isRefetching}
            >
              {resultQuery.isRefetching ? '새로고침 중' : '새로고침'}
            </button>
            <Link
              href={`/page-wizard/${encodeURIComponent(slug)}`}
              className={styles.secondaryButton}
            >
              편집 화면으로 돌아가기
            </Link>
          </div>
        </section>

        {!configState.published ? (
          <div className={getNoticeClassName('neutral')}>
            현재 페이지는 비공개 초안 상태입니다. 공개 페이지에서는 아직 보이지 않을 수 있습니다.
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
