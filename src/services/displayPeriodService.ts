import {
  getAllInvitationPages,
  getInvitationPageBySlug,
  updateInvitationPageVisibility,
} from '@/services/invitationPageService';

export interface DisplayPeriod {
  id?: string;
  pageSlug: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  published?: boolean;
}

function toDisplayPeriod(invitationPage: {
  slug: string;
  displayPeriodStart: Date | null;
  displayPeriodEnd: Date | null;
  displayPeriodEnabled: boolean;
  published: boolean;
}): DisplayPeriod | null {
  const hasConfiguredPeriod =
    invitationPage.displayPeriodEnabled ||
    invitationPage.displayPeriodStart instanceof Date ||
    invitationPage.displayPeriodEnd instanceof Date;

  if (!hasConfiguredPeriod) {
    return null;
  }

  return {
    id: invitationPage.slug,
    pageSlug: invitationPage.slug,
    startDate: invitationPage.displayPeriodStart ?? new Date(),
    endDate: invitationPage.displayPeriodEnd ?? new Date(),
    isActive: invitationPage.displayPeriodEnabled,
    createdAt: new Date(),
    updatedAt: new Date(),
    published: invitationPage.published,
  };
}

export const getDisplayPeriod = async (
  pageSlug: string
): Promise<DisplayPeriod | null> => {
  const invitationPage = await getInvitationPageBySlug(pageSlug, {
    includeSeedFallback: true,
    fallbackOnError: true,
  });
  if (!invitationPage) {
    return null;
  }

  return toDisplayPeriod(invitationPage);
};

export const setDisplayPeriod = async (
  pageSlug: string,
  startDate: Date,
  endDate: Date,
  isActive: boolean
): Promise<void> => {
  const invitationPage = await getInvitationPageBySlug(pageSlug, {
    includeSeedFallback: true,
    fallbackOnError: true,
  });
  if (!invitationPage) {
    throw new Error('청첩장 문서를 찾을 수 없습니다.');
  }

  await updateInvitationPageVisibility(pageSlug, {
    published: invitationPage.published,
    displayPeriodEnabled: isActive,
    displayPeriodStart: isActive ? startDate : null,
    displayPeriodEnd: isActive ? endDate : null,
  });
};

export const getAllDisplayPeriods = async (): Promise<DisplayPeriod[]> => {
  const pages = await getAllInvitationPages({ includeSeedFallback: true });

  return pages
    .map(toDisplayPeriod)
    .filter((page): page is DisplayPeriod => page !== null)
    .sort((left, right) => left.pageSlug.localeCompare(right.pageSlug, 'ko'));
};

export const isPageVisible = async (pageSlug: string): Promise<boolean> => {
  const invitationPage = await getInvitationPageBySlug(pageSlug);

  if (!invitationPage || !invitationPage.published) {
    return false;
  }

  if (!invitationPage.displayPeriodEnabled) {
    return true;
  }

  if (!invitationPage.displayPeriodStart || !invitationPage.displayPeriodEnd) {
    return false;
  }

  const now = new Date();
  return (
    now >= invitationPage.displayPeriodStart && now <= invitationPage.displayPeriodEnd
  );
};

export const deleteDisplayPeriod = async (pageSlug: string): Promise<void> => {
  const invitationPage = await getInvitationPageBySlug(pageSlug, {
    includeSeedFallback: true,
    fallbackOnError: true,
  });
  if (!invitationPage) {
    throw new Error('청첩장 문서를 찾을 수 없습니다.');
  }

  await updateInvitationPageVisibility(pageSlug, {
    published: invitationPage.published,
    displayPeriodEnabled: false,
    displayPeriodStart: null,
    displayPeriodEnd: null,
  });
};
