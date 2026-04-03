'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAdmin } from '@/contexts';
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
}

function describeFeatureLine(template: ReturnType<typeof getInvitationPageSeedTemplates>[number]) {
  return [
    `Theme: ${template.theme}`,
    `Package: ${template.productTier}`,
    `Gallery: up to ${template.features.maxGalleryImages} images`,
    `Share: ${template.features.shareMode === 'card' ? 'Kakao card share' : 'Kakao link share'}`,
    template.features.showCountdown ? 'Countdown enabled' : 'Countdown hidden',
    template.features.showGuestbook ? 'Guestbook enabled' : 'Guestbook hidden',
  ];
}

export default function InvitationDraftSetupClient({
  editorKind,
  title,
  description,
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
      setError('Select a template first.');
      return;
    }

    const normalizedSlug = normalizeInvitationPageSlugBase(slugBase);
    if (!normalizedSlug || !groomName.trim() || !brideName.trim()) {
      setError('Template, slug, groom name, and bride name are required.');
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

      setSuccessMessage(`Draft created at /${created.slug}. Redirecting now.`);
      router.push(`/${editorKind}/${created.slug}`);
    } catch (setupError) {
      console.error('[InvitationDraftSetupClient] failed to create draft', setupError);
      setError(
        setupError instanceof Error
          ? setupError.message
          : 'Failed to create the invitation draft.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (isAdminLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.emptyCard}>
            <p className={styles.eyebrow}>Loading</p>
            <h1 className={styles.emptyTitle}>Checking admin access.</h1>
            <p className={styles.emptyText}>
              The draft setup page is available after admin verification.
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (!isAdminLoggedIn) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.emptyCard}>
            <p className={styles.eyebrow}>Admin Only</p>
            <h1 className={styles.emptyTitle}>Creating a new invitation requires admin access.</h1>
            <p className={styles.emptyText}>
              Sign in on the admin page first, then return here to create a new draft.
            </p>
            <div className={styles.buttonRow}>
              <a href="/admin" className={styles.primaryButton}>
                Go to Admin
              </a>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.heroCard}>
          <div className={styles.heroTop}>
            <div>
              <p className={styles.eyebrow}>New Invitation Draft</p>
              <h1 className={styles.title}>{title}</h1>
              <p className={styles.description}>{description}</p>
            </div>
            <div className={styles.heroMeta}>
              <span className={styles.chip}>Admin flow</span>
              <span className={styles.chip}>{editorKind}</span>
              {selectedTemplate ? (
                <span className={styles.chip}>{selectedTemplate.productTier}</span>
              ) : null}
            </div>
          </div>

          <div className={styles.heroGrid}>
            <article className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Step 1</span>
              <strong className={styles.summaryValue}>Choose a template</strong>
              <p className={styles.summaryText}>
                Select both the visual theme and the product tier before creating the draft.
              </p>
            </article>
            <article className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Step 2</span>
              <strong className={styles.summaryValue}>Reserve the URL</strong>
              <p className={styles.summaryText}>
                The slug becomes the final public URL. If the same slug exists, a short suffix is added automatically.
              </p>
            </article>
            <article className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Step 3</span>
              <strong className={styles.summaryValue}>Enter the couple names</strong>
              <p className={styles.summaryText}>
                The first cover title and share metadata are derived from these names.
              </p>
            </article>
            <article className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Step 4</span>
              <strong className={styles.summaryValue}>Continue editing</strong>
              <p className={styles.summaryText}>
                After the draft is created, you move straight into the editor you selected.
              </p>
            </article>
          </div>
        </section>

        <section className={styles.formCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Choose the starting template</h2>
            <p className={styles.sectionDescription}>
              Each template combines one visual theme and one product tier. The feature limits below are applied to both editors and the public page.
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
                  <span className={styles.chip}>{template.theme}</span>
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
            <h2 className={styles.sectionTitle}>Set the first page details</h2>
            <p className={styles.sectionDescription}>
              These values are used to create the initial Firestore draft before the editor opens.
            </p>
          </div>

          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span className={styles.labelRow}>
                <span className={styles.label}>URL base</span>
                <span className={styles.requiredBadge}>Required</span>
              </span>
              <span className={styles.hint}>
                Lowercase letters, numbers, and hyphens only. Example: shin-minje-kim-hyunji
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
                <span className={styles.label}>Public editor</span>
                <span className={styles.optionalBadge}>Auto</span>
              </span>
              <span className={styles.hint}>
                The draft opens inside the selected editor after creation.
              </span>
              <input
                className={styles.input}
                value={editorKind}
                readOnly
              />
            </label>

            <label className={styles.field}>
              <span className={styles.labelRow}>
                <span className={styles.label}>Groom name</span>
                <span className={styles.requiredBadge}>Required</span>
              </span>
              <span className={styles.hint}>Used for the initial cover title and share copy.</span>
              <input
                className={styles.input}
                value={groomName}
                onChange={(event) => setGroomName(event.target.value)}
                placeholder="Groom name"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.labelRow}>
                <span className={styles.label}>Bride name</span>
                <span className={styles.requiredBadge}>Required</span>
              </span>
              <span className={styles.hint}>Used for the initial cover title and share copy.</span>
              <input
                className={styles.input}
                value={brideName}
                onChange={(event) => setBrideName(event.target.value)}
                placeholder="Bride name"
              />
            </label>
          </div>

          {selectedTemplate ? (
            <div className={styles.featureCard}>
              <h3 className={styles.featureTitle}>Current package rules</h3>
              <p className={styles.featureText}>
                This draft starts with the <strong>{selectedTemplate.displayName}</strong> preset. Gallery uploads, share style, countdown visibility, and guestbook exposure will follow the selected package.
              </p>
            </div>
          ) : null}

          {error ? <div className={styles.noticeError}>{error}</div> : null}
          {successMessage ? <div className={styles.noticeSuccess}>{successMessage}</div> : null}

          <div className={styles.actions}>
            <div className={styles.buttonRow}>
              <a href="/admin" className={styles.ghostButton}>
                Back to Admin
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
                Reset
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => void handleCreate()}
                disabled={!canCreate || isCreating}
              >
                {isCreating ? 'Creating draft' : 'Create draft and open editor'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
