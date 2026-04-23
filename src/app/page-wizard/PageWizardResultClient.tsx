'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import CustomerEventClaimCard from '@/app/_components/CustomerEventClaimCard';
import FirebaseAuthLoginCard from '@/app/_components/FirebaseAuthLoginCard';
import { normalizeFormConfig } from '@/app/page-editor/pageEditorUtils';
import { useAdmin } from '@/contexts';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import type { EditableInvitationPageConfig } from '@/services/invitationPageService';
import { getEditableInvitationPageConfig } from '@/services/invitationPageService';
import { getCustomerEventOwnershipStatus } from '@/services/customerEventService';

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
  const { authUser, isAdminLoading, isAdminLoggedIn, isLoggedIn } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [configState, setConfigState] = useState<EditableInvitationPageConfig | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requiresOwnershipClaim, setRequiresOwnershipClaim] = useState(false);
  const [accessRefreshToken, setAccessRefreshToken] = useState(0);

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
    [configState?.features, configState?.productTier]
  );

  useEffect(() => {
    if (isAdminLoading) {
      return;
    }

    let cancelled = false;

    const loadConfig = async () => {
      if (!isLoggedIn) {
        setConfigState(null);
        setErrorMessage(null);
        setRequiresOwnershipClaim(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      setRequiresOwnershipClaim(false);

      try {
        if (!isAdminLoggedIn) {
          const ownershipStatus = await getCustomerEventOwnershipStatus(
            slug,
            authUser?.uid
          );

          if (cancelled) {
            return;
          }

          if (ownershipStatus.status === 'different-owner') {
            setConfigState(null);
            setRequiresOwnershipClaim(false);
            setErrorMessage('이 청첩장은 다른 계정에 이미 연결되어 있습니다.');
            setIsLoading(false);
            return;
          }

          if (ownershipStatus.status !== 'owner') {
            setConfigState(null);
            setRequiresOwnershipClaim(true);
            setErrorMessage(null);
            setIsLoading(false);
            return;
          }
        }

        const rawEditableConfig = await getEditableInvitationPageConfig(slug);
        const editableConfig = rawEditableConfig
          ? await applyWizardStorageImageFallback(rawEditableConfig)
          : null;

        if (cancelled) {
          return;
        }

        if (!editableConfig) {
          setConfigState(null);
          setErrorMessage('저장된 청첩장 데이터를 찾을 수 없습니다.');
          setIsLoading(false);
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
  }, [accessRefreshToken, authUser?.uid, isAdminLoading, isAdminLoggedIn, isLoggedIn, slug]);

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
      clientPassword: '',
      showClientPasswordField: false,
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
          <CustomerEventClaimCard
            pageSlug={slug}
            title="기존 청첩장을 현재 계정에 연결해 주세요"
            description="이 결과 화면은 현재 로그인한 계정의 UID와 연결된 청첩장만 볼 수 있습니다. 기존 페이지 비밀번호를 확인하면 바로 연결할 수 있습니다."
            helperText="한 번 연결하면 이후에는 Firebase 로그인만으로 접근할 수 있습니다."
            onClaimed={() => {
              setAccessRefreshToken((current) => current + 1);
            }}
          />
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
