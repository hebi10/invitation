'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAdmin } from '@/contexts';
import { getInvitationThemeLabel } from '@/lib/invitationThemes';
import {
  createInvitationPageDraftFromSeed,
  getInvitationPageSeedTemplates,
  normalizeInvitationPageSlugBase,
} from '@/services';

import styles from './InvitationDraftSetupClient.module.css';

type DraftEditorKind = 'page-editor' | 'page-wizard';

interface InvitationDraftSetupClientProps {
  editorKind: DraftEditorKind;
  title: string;
  description: string;
  compactMode?: boolean;
}

function describeFeatureLine(template: ReturnType<typeof getInvitationPageSeedTemplates>[number]) {
  return [
    `디자인: ${getInvitationThemeLabel(template.theme)}`,
    `상품: ${template.productTier.toUpperCase()}`,
    `갤러리: 최대 ${template.features.maxGalleryImages}장`,
    `공유 방식: ${
      template.features.shareMode === 'card' ? '카카오 카드형' : '카카오 링크형'
    }`,
    template.features.showCountdown ? '카운트다운 포함' : '카운트다운 미포함',
    template.features.showGuestbook ? '방명록 포함' : '방명록 미포함',
  ];
}

export default function InvitationDraftSetupClient({
  editorKind,
  title,
  description,
  compactMode = false,
}: InvitationDraftSetupClientProps) {
  const router = useRouter();
  const { isAdminLoading, isAdminLoggedIn } = useAdmin();
  const templates = useMemo(() => getInvitationPageSeedTemplates(), []);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [groomName, setGroomName] = useState('');
  const [brideName, setBrideName] = useState('');
  const [slugBase, setSlugBase] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const selectedTemplate =
    templates.find((template) => template.id === templateId) ?? templates[0] ?? null;

  useEffect(() => {
    if (slugTouched) {
      return;
    }

    const nextSlug = normalizeInvitationPageSlugBase(
      `${groomName.trim()}-${brideName.trim()}`
    );
    setSlugBase(nextSlug);
  }, [brideName, groomName, slugTouched]);

  const canCreate = Boolean(
    isAdminLoggedIn &&
      selectedTemplate &&
      groomName.trim() &&
      brideName.trim() &&
      normalizeInvitationPageSlugBase(slugBase)
  );

  const handleCreate = async () => {
    if (!selectedTemplate) {
      setError('템플릿을 먼저 선택해 주세요.');
      return;
    }

    const normalizedSlug = normalizeInvitationPageSlugBase(slugBase);
    if (!normalizedSlug || !groomName.trim() || !brideName.trim()) {
      setError('템플릿, URL 기본값, 신랑 이름, 신부 이름을 모두 입력해 주세요.');
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsCreating(true);

    try {
      const created = await createInvitationPageDraftFromSeed({
        seedSlug: selectedTemplate.seedSlug,
        slugBase: normalizedSlug,
        groomName: groomName.trim(),
        brideName: brideName.trim(),
        published: false,
        defaultTheme: selectedTemplate.theme,
        productTier: selectedTemplate.productTier,
      });

      setSuccessMessage(`/${created.slug} 초안을 만들었습니다. 편집 화면으로 이동합니다.`);
      router.push(`/${editorKind}/${created.slug}`);
    } catch (setupError) {
      console.error('[InvitationDraftSetupClient] failed to create draft', setupError);
      setError(
        setupError instanceof Error
          ? setupError.message
          : '청첩장 초안을 생성하지 못했습니다.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (isAdminLoading) {
    return (
      <main className={`${styles.page} ${compactMode ? styles.pageCompact : ''}`}>
        <div className={`${styles.shell} ${compactMode ? styles.shellCompact : ''}`}>
          <section className={styles.emptyCard}>
            <p className={styles.eyebrow}>불러오는 중</p>
            <h1 className={styles.emptyTitle}>관리자 권한을 확인하고 있습니다.</h1>
            <p className={styles.emptyText}>
              초안 생성 화면은 관리자 확인 후에 사용할 수 있습니다.
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (!isAdminLoggedIn) {
    return (
      <main className={`${styles.page} ${compactMode ? styles.pageCompact : ''}`}>
        <div className={`${styles.shell} ${compactMode ? styles.shellCompact : ''}`}>
          <section className={styles.emptyCard}>
            <p className={styles.eyebrow}>관리자 전용</p>
            <h1 className={styles.emptyTitle}>새 청첩장 생성은 관리자만 할 수 있습니다.</h1>
            <p className={styles.emptyText}>
              먼저 관리자 페이지에서 로그인한 뒤 다시 돌아와 주세요.
            </p>
            <div className={styles.buttonRow}>
              <a href="/admin" className={styles.primaryButton}>
                관리자 페이지로 이동
              </a>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={`${styles.page} ${compactMode ? styles.pageCompact : ''}`}>
      <div className={`${styles.shell} ${compactMode ? styles.shellCompact : ''}`}>
        <section className={`${styles.heroCard} ${compactMode ? styles.heroCardCompact : ''}`}>
          <div className={styles.heroTop}>
            <div>
              <p className={styles.eyebrow}>새 청첩장 만들기</p>
              <h1 className={styles.title}>{title}</h1>
              <p className={styles.description}>{description}</p>
            </div>
            <div className={styles.heroMeta}>
              <span className={styles.chip}>관리자 생성</span>
              <span className={styles.chip}>
                {editorKind === 'page-wizard' ? '모바일 모바일' : '기본 편집기'}
              </span>
              {selectedTemplate ? (
                <span className={styles.chip}>{selectedTemplate.productTier}</span>
              ) : null}
            </div>
          </div>

          <div className={styles.heroGrid}>
            <article className={styles.summaryCard}>
              <span className={styles.summaryLabel}>1단계</span>
              <strong className={styles.summaryValue}>템플릿 선택</strong>
              <p className={styles.summaryText}>
                디자인과 상품 구성을 먼저 고른 뒤 초안을 만듭니다.
              </p>
            </article>
            <article className={styles.summaryCard}>
              <span className={styles.summaryLabel}>2단계</span>
              <strong className={styles.summaryValue}>URL 주소 설정</strong>
              <p className={styles.summaryText}>
                입력한 주소는 최종 공개 URL이 되며, 중복이면 짧은 suffix가 자동으로 붙습니다.
              </p>
            </article>
            <article className={styles.summaryCard}>
              <span className={styles.summaryLabel}>3단계</span>
              <strong className={styles.summaryValue}>신랑·신부 이름 입력</strong>
              <p className={styles.summaryText}>
                첫 표지 제목과 공유 문구에 사용할 이름을 입력합니다.
              </p>
            </article>
            <article className={styles.summaryCard}>
              <span className={styles.summaryLabel}>4단계</span>
              <strong className={styles.summaryValue}>편집 계속하기</strong>
              <p className={styles.summaryText}>
                초안이 생성되면 선택한 편집 화면으로 바로 이동합니다.
              </p>
            </article>
          </div>
        </section>

        <section className={`${styles.formCard} ${compactMode ? styles.formCardCompact : ''}`}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>시작 템플릿 선택</h2>
            <p className={styles.sectionDescription}>
              각 템플릿은 디자인과 상품 구성을 함께 포함합니다. 아래 기능 제한은 편집기와 공개 페이지에 동일하게 적용됩니다.
            </p>
          </div>

          <div className={styles.templateGrid}>
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`${styles.templateCard} ${
                  template.id === selectedTemplate?.id ? styles.templateCardActive : ''
                }`}
                onClick={() => setTemplateId(template.id)}
              >
                <div className={styles.templateTop}>
                  <strong className={styles.templateTitle}>{template.displayName}</strong>
                  <span className={styles.chip}>
                    {getInvitationThemeLabel(template.theme)}
                  </span>
                </div>
                <p className={styles.templateDescription}>{template.description}</p>
                <ul className={styles.templateFeatures}>
                  {describeFeatureLine(template).map((featureLine) => (
                    <li key={`${template.id}-${featureLine}`}>{featureLine}</li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>첫 페이지 기본 정보</h2>
            <p className={styles.sectionDescription}>
              아래 값으로 Firestore 초안을 먼저 만든 뒤 편집 화면을 엽니다.
            </p>
          </div>

          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span className={styles.labelRow}>
                <span className={styles.label}>URL 기본값</span>
                <span className={styles.requiredBadge}>필수</span>
              </span>
              <span className={styles.hint}>
                영문 소문자, 숫자, 하이픈만 사용할 수 있습니다. 예: shin-minje-kim-hyunji
              </span>
              <input
                className={styles.input}
                value={slugBase}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlugBase(event.target.value);
                }}
                placeholder="new-wedding-page"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.labelRow}>
                <span className={styles.label}>편집 화면</span>
                <span className={styles.optionalBadge}>자동</span>
              </span>
              <span className={styles.hint}>
                생성 후 선택한 편집 화면으로 자동 이동합니다.
              </span>
              <input
                className={styles.input}
                value={editorKind}
                readOnly
              />
            </label>

            <label className={styles.field}>
              <span className={styles.labelRow}>
                <span className={styles.label}>신랑 이름</span>
                <span className={styles.requiredBadge}>필수</span>
              </span>
              <span className={styles.hint}>초기 표지 제목과 공유 문구에 사용됩니다.</span>
              <input
                className={styles.input}
                value={groomName}
                onChange={(event) => setGroomName(event.target.value)}
                placeholder="신랑 이름"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.labelRow}>
                <span className={styles.label}>신부 이름</span>
                <span className={styles.requiredBadge}>필수</span>
              </span>
              <span className={styles.hint}>초기 표지 제목과 공유 문구에 사용됩니다.</span>
              <input
                className={styles.input}
                value={brideName}
                onChange={(event) => setBrideName(event.target.value)}
                placeholder="신부 이름"
              />
            </label>
          </div>

          {selectedTemplate ? (
            <div className={styles.featureCard}>
              <h3 className={styles.featureTitle}>현재 상품 구성</h3>
              <p className={styles.featureText}>
                이 초안은 <strong>{selectedTemplate.displayName}</strong> 설정으로 시작합니다. 갤러리 수, 공유 방식, 카운트다운, 방명록 노출도 선택한 상품에 맞춰 적용됩니다.
              </p>
            </div>
          ) : null}

          {error ? <div className={styles.noticeError}>{error}</div> : null}
          {successMessage ? <div className={styles.noticeSuccess}>{successMessage}</div> : null}

          <div className={styles.actions}>
            <div className={styles.buttonRow}>
              <a href="/admin" className={styles.ghostButton}>
                관리자 페이지로 돌아가기
              </a>
            </div>
            <div className={styles.buttonRow}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setGroomName('');
                  setBrideName('');
                  setSlugBase('');
                  setSlugTouched(false);
                  setError('');
                  setSuccessMessage('');
                }}
                disabled={isCreating}
              >
                다시 입력
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => void handleCreate()}
                disabled={!canCreate || isCreating}
              >
                {isCreating ? '초안 생성 중' : '초안 만들고 편집 시작'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
