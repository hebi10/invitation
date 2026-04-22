'use client';

import { useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAdmin } from '@/contexts';
import { getInvitationThemeLabel } from '@/lib/invitationThemes';
import {
  buildSuggestedInvitationPageSlugBase,
  createInvitationPageSlugSuggestionSeed,
  type InvitationPageSlugValidationReason,
  validateInvitationPageSlugBase,
} from '@/lib/invitationPageSlug';
import {
  createInvitationPageDraftFromSeed,
  getInvitationPageSeedTemplates,
} from '@/services';

import styles from './InvitationDraftSetupClient.module.css';

type DraftEditorKind = 'page-editor' | 'page-wizard';

interface InvitationDraftSetupClientProps {
  editorKind: DraftEditorKind;
  title: string;
  description: string;
  compactMode?: boolean;
}

function describeFeatureLine(
  template: ReturnType<typeof getInvitationPageSeedTemplates>[number]
) {
  return [
    `테마: ${getInvitationThemeLabel(template.theme)}`,
    `플랜: ${template.productTier.toUpperCase()}`,
    `갤러리 최대 ${template.features.maxGalleryImages}장`,
    `공유 방식: ${
      template.features.shareMode === 'none'
        ? '공유 버튼 없음'
        : template.features.shareMode === 'card'
          ? '카카오 카드형'
          : '카카오 링크형'
    }`,
    template.features.showCountdown ? '카운트다운 포함' : '카운트다운 미포함',
    template.features.showGuestbook ? '방명록 포함' : '방명록 미포함',
  ];
}

function getSlugValidationMessage(reason: InvitationPageSlugValidationReason | null) {
  switch (reason) {
    case 'required':
      return '청첩장 주소를 입력해 주세요.';
    case 'invalid':
      return '청첩장 주소는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.';
    case 'too_short':
      return '청첩장 주소는 3자 이상이어야 합니다.';
    case 'too_long':
      return '청첩장 주소는 40자 이하로 입력해 주세요.';
    case 'reserved':
      return '예약된 주소라서 사용할 수 없습니다. 다른 주소를 입력해 주세요.';
    default:
      return '사용 가능한 청첩장 주소를 다시 확인해 주세요.';
  }
}

function getEditorKindLabel(editorKind: DraftEditorKind) {
  return editorKind === 'page-wizard' ? '모바일형 편집기' : '기본 편집기';
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
  const [slugSuggestionSeed, setSlugSuggestionSeed] = useState(() =>
    createInvitationPageSlugSuggestionSeed()
  );
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const selectedTemplate =
    templates.find((template) => template.id === templateId) ?? templates[0] ?? null;
  const suggestedSlugBase = useMemo(
    () =>
      buildSuggestedInvitationPageSlugBase([groomName, brideName], {
        seed: slugSuggestionSeed,
      }),
    [brideName, groomName, slugSuggestionSeed]
  );
  const slugValidation = useMemo(
    () => validateInvitationPageSlugBase(slugBase),
    [slugBase]
  );
  const previewSlug = slugValidation.normalizedSlugBase || suggestedSlugBase || '...';
  const slugHelperText = useMemo(() => {
    if (!slugTouched) {
      return '이름을 입력하면 주소를 자동 제안합니다. 필요하면 직접 수정할 수 있습니다.';
    }

    if (!slugValidation.isValid) {
      return getSlugValidationMessage(slugValidation.reason);
    }

    return '현재 주소를 사용할 수 있습니다. 저장 시 중복이면 서버에서 자동으로 조정합니다.';
  }, [slugTouched, slugValidation.isValid, slugValidation.reason]);

  useEffect(() => {
    if (slugTouched) {
      return;
    }

    setSlugBase(suggestedSlugBase);
  }, [slugTouched, suggestedSlugBase]);

  const canCreate = Boolean(
    isAdminLoggedIn &&
      selectedTemplate &&
      groomName.trim() &&
      brideName.trim() &&
      slugValidation.isValid
  );

  const handleCreate = async () => {
    if (!selectedTemplate) {
      setError('시작 템플릿을 먼저 선택해 주세요.');
      return;
    }

    if (!groomName.trim() || !brideName.trim()) {
      setError('신랑 이름과 신부 이름을 모두 입력해 주세요.');
      return;
    }

    if (!slugValidation.isValid) {
      setError(getSlugValidationMessage(slugValidation.reason));
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsCreating(true);

    try {
      const created = await createInvitationPageDraftFromSeed({
        seedSlug: selectedTemplate.seedSlug,
        slugBase: slugValidation.normalizedSlugBase,
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

  const handleReset = () => {
    setGroomName('');
    setBrideName('');
    setSlugBase('');
    setSlugTouched(false);
    setSlugSuggestionSeed(createInvitationPageSlugSuggestionSeed());
    setError('');
    setSuccessMessage('');
  };

  if (isAdminLoading) {
    return (
      <main className={`${styles.page} ${compactMode ? styles.pageCompact : ''}`}>
        <div className={`${styles.shell} ${compactMode ? styles.shellCompact : ''}`}>
          <section className={styles.emptyCard}>
            <p className={styles.eyebrow}>불러오는 중</p>
            <h1 className={styles.emptyTitle}>관리자 권한을 확인하고 있습니다.</h1>
            <p className={styles.emptyText}>
              청첩장 생성 화면은 관리자 권한 확인 뒤에 사용할 수 있습니다.
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
            <h1 className={styles.emptyTitle}>새 청첩장 생성은 관리자만 사용할 수 있습니다.</h1>
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
              <span className={styles.chip}>{getEditorKindLabel(editorKind)}</span>
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
                테마와 상품 구성을 먼저 고른 뒤 초안 구성을 시작합니다.
              </p>
            </article>
            <article className={styles.summaryCard}>
              <span className={styles.summaryLabel}>2단계</span>
              <strong className={styles.summaryValue}>청첩장 주소 확정</strong>
              <p className={styles.summaryText}>
                청첩장 주소는 1필드만 입력합니다. 중복이면 생성 시 서버가 최종 slug를
                자동 조정합니다.
              </p>
            </article>
            <article className={styles.summaryCard}>
              <span className={styles.summaryLabel}>3단계</span>
              <strong className={styles.summaryValue}>신랑 · 신부 이름 입력</strong>
              <p className={styles.summaryText}>
                초안 기본 제목과 공유 문구에 사용할 한글 이름을 입력합니다.
              </p>
            </article>
            <article className={styles.summaryCard}>
              <span className={styles.summaryLabel}>4단계</span>
              <strong className={styles.summaryValue}>편집 이어가기</strong>
              <p className={styles.summaryText}>
                초안을 만들면 선택한 편집 화면으로 바로 이동합니다.
              </p>
            </article>
          </div>
        </section>

        <section className={`${styles.formCard} ${compactMode ? styles.formCardCompact : ''}`}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>시작 템플릿 선택</h2>
            <p className={styles.sectionDescription}>
              각 템플릿은 테마와 상품 구성을 함께 포함합니다. 아래 기능 제한과 편집기,
              공개 페이지에도 같은 규칙이 적용됩니다.
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
                  <span className={styles.chip}>{getInvitationThemeLabel(template.theme)}</span>
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
            <h2 className={styles.sectionTitle}>초안 기본 정보</h2>
            <p className={styles.sectionDescription}>
              입력한 값으로 Firestore 초안을 먼저 만들고, 이어서 상세 편집 화면에서 내용을
              채웁니다.
            </p>
          </div>

          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span className={styles.labelRow}>
                <span className={styles.label}>청첩장 주소</span>
                <span className={styles.requiredBadge}>필수</span>
              </span>
              <span className={styles.hint}>{slugHelperText}</span>
              <input
                className={styles.input}
                value={slugBase}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setSlugTouched(Boolean(nextValue.trim()));
                  setSlugBase(nextValue);
                }}
                onBlur={() => {
                  if (slugValidation.isValid) {
                    setSlugBase(slugValidation.normalizedSlugBase);
                  }
                }}
                placeholder="wedding-abc123"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.labelRow}>
                <span className={styles.label}>편집기</span>
                <span className={styles.optionalBadge}>자동</span>
              </span>
              <span className={styles.hint}>
                초안을 만들면 선택한 편집 화면으로 자동 이동합니다.
              </span>
              <input className={styles.input} value={getEditorKindLabel(editorKind)} readOnly />
            </label>

            <label className={styles.field}>
              <span className={styles.labelRow}>
                <span className={styles.label}>신랑 이름</span>
                <span className={styles.requiredBadge}>필수</span>
              </span>
              <span className={styles.hint}>초기 제목과 공유 문구에 사용할 한글 이름입니다.</span>
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
              <span className={styles.hint}>초기 제목과 공유 문구에 사용할 한글 이름입니다.</span>
              <input
                className={styles.input}
                value={brideName}
                onChange={(event) => setBrideName(event.target.value)}
                placeholder="신부 이름"
              />
            </label>
          </div>

          <div className={styles.featureCard}>
            <h3 className={styles.featureTitle}>주소 미리보기</h3>
            <p className={styles.featureText}>
              공개 주소는 <strong>/{previewSlug}</strong> 형태로 생성됩니다. 실제 저장 시 같은
              주소가 이미 있으면 뒤에 짧은 suffix가 자동으로 붙습니다.
            </p>
          </div>

          {selectedTemplate ? (
            <div className={styles.featureCard}>
              <h3 className={styles.featureTitle}>현재 상품 구성</h3>
              <p className={styles.featureText}>
                이 청첩장은 <strong>{selectedTemplate.displayName}</strong> 설정으로 시작합니다.
                갤러리 수, 공유 방식, 카운트다운, 방명록 노출 여부도 여기에 맞춰 적용됩니다.
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
                onClick={handleReset}
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
                {isCreating ? '청첩장 생성 중' : '청첩장 만들고 편집 시작'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
