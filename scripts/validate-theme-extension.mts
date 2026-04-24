import fs from 'node:fs/promises';
import path from 'node:path';

import {
  INVITATION_THEME_KEYS,
  getInvitationThemeLabel,
  getInvitationThemeSalesPolicy,
  getPurchasableInvitationThemeKeys,
  getSelectableInvitationThemeKeys,
} from '../src/lib/invitationThemes';
import { designThemes, guideSamplePages } from '../apps/mobile/src/constants/content';
import { resolveAppDeepLink } from '../apps/mobile/src/lib/appDeepLink';
import {
  buildLinkedInvitationCardFromPageSummary,
  getLinkedInvitationThemeKeys,
  getLinkedInvitationThemePreviewUrl,
  mergeLinkedInvitationCard,
  sanitizeLinkedInvitationCards,
} from '../apps/mobile/src/lib/linkedInvitationCardsModel';
import {
  getSelectedTargetThemeState,
} from '../apps/mobile/src/features/manage/ticketThemeValidation';

const projectRoot = process.cwd();
const sourceFiles = {
  themeStep: path.join(projectRoot, 'src/app/page-wizard/steps/ThemeStep.tsx'),
  manageScreen: path.join(projectRoot, 'apps/mobile/src/features/screens/manage.tsx'),
  ticketModal: path.join(
    projectRoot,
    'apps/mobile/src/features/manage/components/TicketUsageModal.tsx'
  ),
  rendererRegistry: path.join(
    projectRoot,
    'src/app/_components/themeRenderers/registry.ts'
  ),
};

function parseExpectedThemeCount() {
  const argument = process.argv.find((item) =>
    item.startsWith('--expected-theme-count=')
  );

  if (!argument) {
    return INVITATION_THEME_KEYS.length;
  }

  const parsed = Number(argument.split('=')[1]);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('Invalid --expected-theme-count value.');
  }

  return parsed;
}

function pushFailure(failures: string[], condition: boolean, message: string) {
  if (!condition) {
    failures.push(message);
  }
}

async function readSource(filePath: string) {
  return fs.readFile(filePath, 'utf8');
}

async function main() {
  const failures: string[] = [];
  const expectedThemeCount = parseExpectedThemeCount();
  const themeKeys = [...INVITATION_THEME_KEYS];

  pushFailure(
    failures,
    themeKeys.length >= expectedThemeCount,
    `Expected at least ${expectedThemeCount} registered themes, but found ${themeKeys.length}.`
  );
  pushFailure(
    failures,
    new Set(themeKeys).size === themeKeys.length,
    'Theme keys must be unique.'
  );

  const defaultThemeCount = themeKeys.filter(
    (themeKey) => getInvitationThemeSalesPolicy(themeKey).isDefault
  ).length;
  pushFailure(
    failures,
    defaultThemeCount === 1,
    `Exactly one theme must be marked as default, but found ${defaultThemeCount}.`
  );

  const selectableThemes = getSelectableInvitationThemeKeys();
  const purchasableThemes = getPurchasableInvitationThemeKeys();

  pushFailure(
    failures,
    designThemes.length === selectableThemes.length,
    'Mobile create theme list must match selectable theme policies.'
  );
  selectableThemes.forEach((themeKey) => {
    pushFailure(
      failures,
      designThemes.some((theme) => theme.key === themeKey),
      `Selectable theme "${themeKey}" is missing from mobile create designThemes.`
    );
  });

  pushFailure(
    failures,
    guideSamplePages.length === themeKeys.length,
    'Guide sample pages must cover every registered theme.'
  );
  themeKeys.forEach((themeKey) => {
    pushFailure(
      failures,
      guideSamplePages.some((page) => page.themeKey === themeKey),
      `Guide sample pages do not contain theme "${themeKey}".`
    );
  });

  const [
    themeStepSource,
    manageScreenSource,
    ticketModalSource,
    rendererRegistrySource,
  ] = await Promise.all([
    readSource(sourceFiles.themeStep),
    readSource(sourceFiles.manageScreen),
    readSource(sourceFiles.ticketModal),
    readSource(sourceFiles.rendererRegistry),
  ]);

  pushFailure(
    failures,
    themeStepSource.includes('INVITATION_THEME_KEYS.map'),
    'Web wizard must render theme options by iterating INVITATION_THEME_KEYS.'
  );
  pushFailure(
    failures,
    manageScreenSource.includes('getLinkedInvitationThemeKeys(') &&
      manageScreenSource.includes('getLinkedInvitationThemePreviewUrl('),
    'Mobile manage screen must use linked theme helpers for labels and preview URLs.'
  );
  pushFailure(
    failures,
    ticketModalSource.includes('purchasableThemes.map('),
    'Ticket modal must render theme options by iterating purchasableThemes.'
  );

  themeKeys.forEach((themeKey) => {
    const registryPattern = new RegExp(`key:\\s*'${themeKey}'`);
    pushFailure(
      failures,
      registryPattern.test(rendererRegistrySource),
      `Web renderer registry is missing theme "${themeKey}".`
    );
  });

  const primaryTheme = themeKeys[0];
  const secondaryTheme = themeKeys[1] ?? primaryTheme;
  const tertiaryTheme = themeKeys[2] ?? null;
  const previewUrlMap = Object.fromEntries(
    themeKeys.map((themeKey) => [
      themeKey,
      `https://example.com/theme-extension/${themeKey}/`,
    ])
  ) as Record<string, string>;

  const pageSummary = {
    slug: 'theme-extension-test',
    displayName: 'Theme Extension Test',
    published: true,
    productTier: 'premium' as const,
    defaultTheme: primaryTheme,
    features: {
      maxGalleryImages: 18,
      shareMode: 'card' as const,
      showMusic: true,
      showCountdown: true,
      showGuestbook: true,
    },
    ticketCount: 3,
    displayPeriod: {
      enabled: true,
      startDate: '2026-04-20',
      endDate: '2026-10-20',
    },
  };

  const config = {
    slug: pageSummary.slug,
    displayName: pageSummary.displayName,
    description: 'Theme extension validation',
    date: '2026-11-22',
    venue: 'Validation Hall',
    groomName: 'Groom',
    brideName: 'Bride',
    couple: {
      groom: { name: 'Groom' },
      bride: { name: 'Bride' },
    },
    variants: Object.fromEntries(
      themeKeys.map((themeKey) => [
        themeKey,
        {
          available: true,
          path: `/${pageSummary.slug}/${themeKey}`,
          displayName: `${pageSummary.displayName} (${getInvitationThemeLabel(themeKey)})`,
        },
      ])
    ),
  };

  const baseLinks = {
    publicUrl: previewUrlMap[primaryTheme],
    previewUrls: {
      default: previewUrlMap[primaryTheme],
      ...previewUrlMap,
    },
  };

  const linkedCard = buildLinkedInvitationCardFromPageSummary(pageSummary, {
    publicUrl: baseLinks.publicUrl,
    links: baseLinks,
    config,
    ticketCount: pageSummary.ticketCount,
  });

  pushFailure(
    failures,
    JSON.stringify(getLinkedInvitationThemeKeys(linkedCard)) === JSON.stringify(themeKeys),
    'Linked invitation card must preserve every registered theme key.'
  );

  const restoredCards = sanitizeLinkedInvitationCards([
    {
      ...linkedCard,
      session: null,
    },
  ]);

  pushFailure(
    failures,
    restoredCards.length === 1 &&
      JSON.stringify(getLinkedInvitationThemeKeys(restoredCards[0]!)) ===
        JSON.stringify(themeKeys),
    'Stored linked invitation cards must restore the full linked theme list.'
  );

  const changedLinks = {
    ...baseLinks,
    publicUrl: previewUrlMap[secondaryTheme],
    previewUrls: {
      ...baseLinks.previewUrls,
      default: previewUrlMap[secondaryTheme],
    },
  };
  const changedCard = buildLinkedInvitationCardFromPageSummary(
    {
      ...pageSummary,
      defaultTheme: secondaryTheme,
    },
    {
      publicUrl: changedLinks.publicUrl,
      links: changedLinks,
      config,
      ticketCount: pageSummary.ticketCount,
    }
  );
  const mergedCard = mergeLinkedInvitationCard(linkedCard, changedCard);

  pushFailure(
    failures,
    getLinkedInvitationThemePreviewUrl(mergedCard, secondaryTheme) ===
      previewUrlMap[secondaryTheme],
    'Preview URL for the new default theme must stay valid after a default theme change.'
  );
  if (tertiaryTheme) {
    pushFailure(
      failures,
      getLinkedInvitationThemePreviewUrl(mergedCard, tertiaryTheme) ===
        previewUrlMap[tertiaryTheme],
      'Preview URL for additional themes must stay valid after a default theme change.'
    );
  }

  if (tertiaryTheme) {
    const ticketTargetState = getSelectedTargetThemeState({
      currentTheme: primaryTheme,
      selectedTargetTheme: tertiaryTheme,
      availableThemes: [primaryTheme, secondaryTheme],
    });

    pushFailure(
      failures,
      purchasableThemes.includes(tertiaryTheme) &&
        ticketTargetState.canPurchaseTargetTheme,
      'The third theme must be purchasable in the ticket flow when it is not yet linked.'
    );

    const appSchemeResolution = resolveAppDeepLink(
      `mobileinvitation://create?ticketIntent=extra-variant&targetTheme=${tertiaryTheme}`
    );
    pushFailure(
      failures,
      appSchemeResolution.type === 'route' &&
        typeof appSchemeResolution.href !== 'string' &&
        appSchemeResolution.href.pathname === '/create' &&
        appSchemeResolution.href.params?.targetTheme === tertiaryTheme,
      'App-scheme deep link must preserve the new theme key.'
    );

    const webLinkResolution = resolveAppDeepLink(
      `https://msgnote.kr/app/create?ticketIntent=extra-variant&targetTheme=${tertiaryTheme}`
    );
    pushFailure(
      failures,
      webLinkResolution.type === 'route' &&
        typeof webLinkResolution.href !== 'string' &&
        webLinkResolution.href.pathname === '/create' &&
        webLinkResolution.href.params?.targetTheme === tertiaryTheme,
      'Web deep link must preserve the new theme key.'
    );
  }

  if (failures.length > 0) {
    console.error('Theme extension validation failed:');
    failures.forEach((failure, index) => {
      console.error(`${index + 1}. ${failure}`);
    });
    process.exitCode = 1;
    return;
  }

  console.log(
    `Theme extension validation passed for ${themeKeys.length} registered theme(s).`
  );
  console.log(
    'For a new theme rollout, run this script with --expected-theme-count=3 and follow docs/theme-extension-test-plan.md.'
  );
}

await main();
