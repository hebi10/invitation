import { router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, Share, View } from 'react-native';

import { EditorPreparingModal } from '../manage/components/EditorPreparingModal';
import { GuestbookModal } from '../manage/components/GuestbookModal';
import { ManageEditorStepContent } from '../manage/components/ManageEditorStepContent';
import { OnboardingModal } from '../manage/components/OnboardingModal';
import { TicketUsageModal } from '../manage/components/TicketUsageModal';
import { useAddressSearch } from '../manage/hooks/useAddressSearch';
import { useGuestbook } from '../manage/hooks/useGuestbook';
import { useImageUpload } from '../manage/hooks/useImageUpload';
import { useInvitationForm } from '../manage/hooks/useInvitationForm';
import { useMusicLibrary } from '../manage/hooks/useMusicLibrary';
import { manageStyles } from '../manage/manageStyles';
import { EDITOR_STEPS } from '../manage/shared';
import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { AppText } from '../../components/AppText';
import { BulletList } from '../../components/BulletList';
import { ChoiceChip } from '../../components/ChoiceChip';
import { InvitationEditorModalShell } from '../../components/manage/InvitationEditorModalShell';
import { SectionCard } from '../../components/SectionCard';
import { useAppState } from '../../contexts/AppStateContext';
import { validateMobileClientEditorSession } from '../../lib/api';
import {
buildLinkedInvitationCardFromPageSummary,
getLinkedInvitationCards,
LinkedInvitationCard,
MAX_LINKED_INVITATION_CARD_COUNT,
mergeLinkedInvitationCard,
setLinkedInvitationCards as persistLinkedInvitationCards,
} from '../../lib/linkedInvitationCards';
import type {
MobileInvitationProductTier,
MobileInvitationThemeKey,
} from '../../types/mobileInvitation';

const THEME_LABELS: Record<MobileInvitationThemeKey, string> = {
emotional: '감성형',
simple: '심플형',
};

function formatThemeList(themeKeys: readonly MobileInvitationThemeKey[]) {
return themeKeys.map((key) => THEME_LABELS[key]).join(', ');
}

function formatDateLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(parsed);
}

function formatDisplayPeriod(period: LinkedInvitationCard['displayPeriod'] | null | undefined) {
  if (!period?.enabled) {
    return '미설정';
  }

  const startDate = period.startDate ? formatDateLabel(period.startDate) : '시작일 미설정';
  const endDate = period.endDate ? formatDateLabel(period.endDate) : '종료일 미설정';

  return `${startDate} ~ ${endDate}`;
}

export default function ManageScreen() {
const {
apiBaseUrl,
activateStoredSession,
authError,
clearAuthError,
clearPendingManageOnboarding,
dashboard,
dashboardLoading,
deleteComment,
logout,
pageSummary,
palette,
fontScale,
pendingManageOnboarding,
refreshDashboard,
saveCurrentPageConfig,
session,
adjustTicketCount,
extendDisplayPeriod,
setVariantAvailability,
setPublishedState,
transferTicketCount,
} = useAppState();
const [notice, setNotice] = useState('');
const [linkedInvitationCards, setLinkedInvitationCards] = useState<LinkedInvitationCard[]>([]);
const [hasLoadedLinkedInvitationCards, setHasLoadedLinkedInvitationCards] = useState(false);
const [ticketModalVisible, setTicketModalVisible] = useState(false);
const [ticketThemeSelection, setTicketThemeSelection] = useState<MobileInvitationThemeKey>('emotional');
const [isExtendingDisplayPeriod, setIsExtendingDisplayPeriod] = useState(false);
const [isApplyingTicketThemeChange, setIsApplyingTicketThemeChange] = useState(false);
const [isApplyingExtraVariant, setIsApplyingExtraVariant] = useState(false);
const [isTransferringTickets, setIsTransferringTickets] = useState(false);
const [ticketTransferTargetSlug, setTicketTransferTargetSlug] = useState<string | null>(null);
const [ticketTransferCount, setTicketTransferCount] = useState(1);
const [previewLinkCardSlug, setPreviewLinkCardSlug] = useState<string | null>(null);

const reloadLinkedInvitationCards = useCallback(async (options: { syncWithServer?: boolean } = {}) => {
const stored = await getLinkedInvitationCards();

if (!options.syncWithServer) {
setLinkedInvitationCards(stored);
setHasLoadedLinkedInvitationCards(true);
return;
}

const refreshedCards = await Promise.all(
stored.map(async (card) => {
if (!card.session) {
return card;
}

try {
const sessionResponse = await validateMobileClientEditorSession(
apiBaseUrl,
card.slug,
card.session.token
);

if (!sessionResponse.authenticated || !sessionResponse.page) {
return card;
}

return mergeLinkedInvitationCard(
card,
buildLinkedInvitationCardFromPageSummary(sessionResponse.page, {
publicUrl: sessionResponse.links?.publicUrl ?? card.publicUrl,
links: sessionResponse.links,
config: sessionResponse.dashboardPage?.config,
updatedAt: Date.now(),
ticketCount: sessionResponse.page.ticketCount,
session: card.session,
})
);
} catch {
return card;
}
})
);

setLinkedInvitationCards(refreshedCards);
setHasLoadedLinkedInvitationCards(true);
await persistLinkedInvitationCards(refreshedCards);
}, [apiBaseUrl]);

const invitationForm = useInvitationForm({
dashboard,
pendingManageOnboarding,
dashboardLoading,
clearAuthError,
clearPendingManageOnboarding,
refreshDashboard,
saveCurrentPageConfig,
setPublishedState,
setNotice,
});

const addressSearch = useAddressSearch({
apiBaseUrl,
setForm: invitationForm.setForm,
setNotice,
});

const musicLibrary = useMusicLibrary({
apiBaseUrl,
supportsMusicFeature: dashboard?.page.features.showMusic ?? false,
form: invitationForm.form,
setForm: invitationForm.setForm,
setNotice,
});

const imageUpload = useImageUpload({
apiBaseUrl,
dashboard,
session,
galleryPreviewItems: invitationForm.galleryPreviewItems,
setForm: invitationForm.setForm,
setNotice,
});

const guestbook = useGuestbook({
dashboard,
dashboardLoading,
refreshDashboard: (options) =>
  invitationForm.requestDashboardSync(undefined, options),
deleteComment,
setNotice,
});

const showDashboardSyncLoading = dashboardLoading && !dashboard && !pageSummary;
const canRequestDashboardSync = !dashboardLoading;
const maxGalleryImageCount = dashboard?.page.features.maxGalleryImages ?? 0;
const supportsMusicFeature = dashboard?.page.features.showMusic ?? false;
const selectedMusicCategoryLabel =
musicLibrary.selectedMusicCategory?.label ?? '선택해 주세요';

const activeLinkedInvitationCard = useMemo<LinkedInvitationCard | null>(() => {
if (!pageSummary) {
return null;
}

return {
...buildLinkedInvitationCardFromPageSummary(pageSummary, {
publicUrl: dashboard?.links.publicUrl ?? null,
links: dashboard?.links,
config: dashboard?.page.config,
updatedAt: 0,
ticketCount: dashboard?.ticketCount ?? pageSummary.ticketCount,
session,
}),
};
}, [dashboard?.links, dashboard?.page.config, dashboard?.ticketCount, pageSummary, session]);

const additionalLinkedInvitationCards = useMemo(
() =>
linkedInvitationCards
.filter((item) => item.slug !== pageSummary?.slug)
.sort((left, right) => right.updatedAt - left.updatedAt),
[linkedInvitationCards, pageSummary?.slug]
);

const previewLinkTargetCard = useMemo(
() =>
[activeLinkedInvitationCard, ...additionalLinkedInvitationCards].find(
  (item): item is LinkedInvitationCard => {
    if (!item) {
      return false;
    }

    return item.slug === previewLinkCardSlug;
  }
) ?? null,
[activeLinkedInvitationCard, additionalLinkedInvitationCards, previewLinkCardSlug]
);

const previewLinkThemeKeys = useMemo(
() =>
previewLinkTargetCard?.availableThemeKeys.length
  ? previewLinkTargetCard.availableThemeKeys
  : previewLinkTargetCard
    ? [previewLinkTargetCard.defaultTheme]
    : [],
[previewLinkTargetCard]
);

const ticketTransferTargetCards = useMemo(
() => additionalLinkedInvitationCards.filter((item) => Boolean(item.session)),
[additionalLinkedInvitationCards]
);

const selectedTicketTransferTargetCard = useMemo(
() =>
ticketTransferTargetCards.find((item) => item.slug === ticketTransferTargetSlug) ??
ticketTransferTargetCards[0] ??
null,
[ticketTransferTargetCards, ticketTransferTargetSlug]
);

const ticketTransferCountOptions = useMemo(() => {
const availableTicketCount = activeLinkedInvitationCard?.ticketCount ?? 0;
const cappedCount = Math.min(availableTicketCount, 5);
const options = Array.from({ length: cappedCount }, (_, index) => index + 1);

if (availableTicketCount > 5) {
options.push(availableTicketCount);
}

return options;
}, [activeLinkedInvitationCard?.ticketCount]);

const upgradeTargetPlan = useMemo<MobileInvitationProductTier | null>(() => {
if (!activeLinkedInvitationCard) {
return null;
}

if (activeLinkedInvitationCard.productTier === 'standard') {
return 'deluxe';
}

if (activeLinkedInvitationCard.productTier === 'deluxe') {
return 'premium';
}

return null;
}, [activeLinkedInvitationCard]);

const alternateTheme = useMemo<MobileInvitationThemeKey>(() => {
return activeLinkedInvitationCard?.defaultTheme === 'emotional' ? 'simple' : 'emotional';
}, [activeLinkedInvitationCard?.defaultTheme]);

const isAlternateThemeAvailable = useMemo(() => {
const sourceVariants =
dashboard?.page.config.variants && typeof dashboard.page.config.variants === 'object'
? (dashboard.page.config.variants as Record<string, unknown>)
: null;
const targetVariant =
sourceVariants?.[alternateTheme] &&
typeof sourceVariants[alternateTheme] === 'object' &&
sourceVariants[alternateTheme] !== null
? (sourceVariants[alternateTheme] as Record<string, unknown>)
: null;

return targetVariant?.available === true;
}, [alternateTheme, dashboard?.page.config.variants]);

useEffect(() => {
let mounted = true;

const restoreLinkedInvitationCards = async () => {
const stored = await getLinkedInvitationCards();

if (!mounted) {
return;
}

setLinkedInvitationCards(stored);
setHasLoadedLinkedInvitationCards(true);
};

void restoreLinkedInvitationCards();

return () => {
mounted = false;
};
}, []);

useFocusEffect(
useCallback(() => {
  void reloadLinkedInvitationCards();
}, [reloadLinkedInvitationCards])
);

useEffect(() => {
if (!hasLoadedLinkedInvitationCards) {
return;
}

void persistLinkedInvitationCards(linkedInvitationCards);
}, [hasLoadedLinkedInvitationCards, linkedInvitationCards]);

useEffect(() => {
if (!activeLinkedInvitationCard) {
return;
}

setTicketThemeSelection(activeLinkedInvitationCard.defaultTheme);

setLinkedInvitationCards((current) => {
const existing = current.find((item) => item.slug === activeLinkedInvitationCard.slug);
const nextCard = mergeLinkedInvitationCard(existing, {
...activeLinkedInvitationCard,
updatedAt: Date.now(),
});

if (
existing &&
existing.displayName === nextCard.displayName &&
existing.productTier === nextCard.productTier &&
existing.defaultTheme === nextCard.defaultTheme &&
existing.published === nextCard.published &&
existing.showMusic === nextCard.showMusic &&
existing.showGuestbook === nextCard.showGuestbook &&
existing.publicUrl === nextCard.publicUrl &&
existing.availableThemeKeys.join('|') === nextCard.availableThemeKeys.join('|') &&
JSON.stringify(existing.previewUrls) === JSON.stringify(nextCard.previewUrls) &&
JSON.stringify(existing.displayPeriod) === JSON.stringify(nextCard.displayPeriod) &&
existing.ticketCount === nextCard.ticketCount
) {
return current;
}

return [
nextCard,
...current.filter((item) => item.slug !== nextCard.slug),
].slice(0, MAX_LINKED_INVITATION_CARD_COUNT);
});
}, [activeLinkedInvitationCard]);

useEffect(() => {
if (ticketTransferTargetCards.length === 0) {
setTicketTransferTargetSlug(null);
setTicketTransferCount(1);
return;
}

if (
!ticketTransferTargetSlug ||
!ticketTransferTargetCards.some((item) => item.slug === ticketTransferTargetSlug)
) {
setTicketTransferTargetSlug(ticketTransferTargetCards[0]?.slug ?? null);
}
}, [ticketTransferTargetCards, ticketTransferTargetSlug]);

useEffect(() => {
const availableTicketCount = activeLinkedInvitationCard?.ticketCount ?? 0;
if (availableTicketCount <= 0) {
setTicketTransferCount(1);
return;
}

setTicketTransferCount((current) => Math.max(1, Math.min(current, availableTicketCount)));
}, [activeLinkedInvitationCard?.ticketCount]);

const handleShare = async () => {
const publicUrl = dashboard?.links.publicUrl;
if (!publicUrl) {
return;
}

await Share.share({
message: publicUrl,
url: publicUrl,
});
};

const handleOpenUrl = async () => {
if (!activeLinkedInvitationCard) {
return;
}

if (activeLinkedInvitationCard.availableThemeKeys.length > 1) {
setPreviewLinkCardSlug(activeLinkedInvitationCard.slug);
return;
}

const themeKey = activeLinkedInvitationCard.availableThemeKeys[0] ?? activeLinkedInvitationCard.defaultTheme;
await handleOpenThemeLink(activeLinkedInvitationCard, themeKey);
};

const handleOpenMapUrl = async () => {
if (!invitationForm.mapPreviewUrl) {
setNotice('지도 링크를 먼저 확인해 주세요.');
return;
}

try {
try {
await WebBrowser.openBrowserAsync(invitationForm.mapPreviewUrl, {
enableDefaultShareMenuItem: true,
controlsColor: palette.accent,
createTask: true,
});
return;
} catch {
// noop
}

await Linking.openURL(invitationForm.mapPreviewUrl);
} catch {
setNotice('지도를 열지 못했습니다. 잠시 후 다시 시도해 주세요.');
}
};

const handleRefreshManageScreen = async () => {
await reloadLinkedInvitationCards();
await invitationForm.requestDashboardSync();
};

const closePreviewLinkModal = () => {
setPreviewLinkCardSlug(null);
};

const handleOpenThemeLink = async (
card: LinkedInvitationCard,
themeKey: MobileInvitationThemeKey
) => {
const targetUrl =
card.previewUrls[themeKey] ??
(themeKey === card.defaultTheme ? card.publicUrl : null);

if (!targetUrl) {
setNotice('열 수 있는 디자인 링크를 찾지 못했습니다.');
return;
}

try {
  try {
    await WebBrowser.openBrowserAsync(targetUrl, {
      enableDefaultShareMenuItem: true,
      controlsColor: palette.accent,
      createTask: true,
    });
    closePreviewLinkModal();
    return;
  } catch {
    // noop
  }

  await Linking.openURL(targetUrl);
  closePreviewLinkModal();
} catch {
  setNotice('디자인 링크를 열지 못했습니다. 잠시 후 다시 시도해 주세요.');
}
};

const handleLinkAnotherInvitation = async (pageSlugToRelink?: string) => {
setNotice(
  pageSlugToRelink
    ? `${pageSlugToRelink} 청첩장을 다시 연동하려면 비밀번호를 입력해 주세요.`
    : '다른 청첩장을 연동하려면 슬러그와 비밀번호를 입력해 주세요.'
);
await logout();
clearAuthError();
};

const handleActivateLinkedInvitation = async (card: LinkedInvitationCard) => {
if (!card.session) {
  await handleLinkAnotherInvitation(card.slug);
  return;
}

setNotice(`${card.displayName.trim() || card.slug} 청첩장을 불러오는 중입니다.`);
clearAuthError();

const activated = await activateStoredSession(card.session);
if (!activated) {
  setNotice(
    `${card.displayName.trim() || card.slug} 청첩장의 저장된 연동 정보가 만료되었습니다. 다시 연동해 주세요.`
  );
  return;
}

setNotice(`${card.displayName.trim() || card.slug} 청첩장을 불러왔습니다.`);
};

const handleOpenTicketModal = () => {
if (!activeLinkedInvitationCard) {
return;
}

setTicketThemeSelection(activeLinkedInvitationCard.defaultTheme);
setTicketTransferCount(1);
setTicketTransferTargetSlug(ticketTransferTargetCards[0]?.slug ?? null);
setTicketModalVisible(true);
};

const closeTicketModal = () => {
setTicketModalVisible(false);
};

const handleRouteToCreateWithTicketIntent = (
ticketIntent: 'extend' | 'extra-page' | 'extra-variant' | 'upgrade',
options: {
targetPlan?: MobileInvitationProductTier;
targetTheme?: MobileInvitationThemeKey;
} = {}
) => {
setTicketModalVisible(false);
router.push({
pathname: '/create',
params: {
ticketIntent,
...(options.targetPlan ? { targetPlan: options.targetPlan } : {}),
...(options.targetTheme ? { targetTheme: options.targetTheme } : {}),
},
});
};

const handleApplyTicketThemeChange = async () => {
if (!activeLinkedInvitationCard) {
return;
}

if (ticketThemeSelection === activeLinkedInvitationCard.defaultTheme) {
setNotice('현재 기본 디자인과 같은 테마가 선택되어 있습니다.');
return;
}

if (activeLinkedInvitationCard.ticketCount < 1) {
setNotice('디자인 변경에는 티켓 1장이 필요합니다. 먼저 티켓을 구매해 주세요.');
return;
}

invitationForm.setDefaultTheme(ticketThemeSelection);
setIsApplyingTicketThemeChange(true);

const saved = await invitationForm.persistForm({
notice: `기본 디자인을 ${
ticketThemeSelection === 'emotional' ? '감성형' : '심플형'
}으로 변경했습니다.`,
});

setIsApplyingTicketThemeChange(false);

if (saved) {
const nextTicketCount = await adjustTicketCount(-1);

if (nextTicketCount === null) {
return;
}

setTicketModalVisible(false);
}
};

const handleExtendDisplayPeriod = async () => {
if (!activeLinkedInvitationCard) {
return;
}

if (activeLinkedInvitationCard.ticketCount < 1) {
setNotice('기간을 1개월 연장하려면 티켓 1장이 필요합니다. 먼저 티켓을 구매해 주세요.');
return;
}

setIsExtendingDisplayPeriod(true);
const displayPeriodResult = await extendDisplayPeriod(1);
setIsExtendingDisplayPeriod(false);

if (!displayPeriodResult) {
return;
}

const nextTicketCount = await adjustTicketCount(-1);

if (nextTicketCount === null) {
return;
}

setTicketModalVisible(false);
setNotice(
  `노출 기간을 1개월 연장했습니다. 새 종료일은 ${formatDateLabel(displayPeriodResult.endDate)}입니다.`
);
};

const handleAddExtraVariant = async () => {
if (!activeLinkedInvitationCard) {
return;
}

if (isAlternateThemeAvailable) {
setNotice(`이미 ${alternateTheme === 'emotional' ? '감성형' : '심플형'} 디자인이 추가되어 있습니다.`);
return;
}

if (activeLinkedInvitationCard.ticketCount < 2) {
setNotice('다른 디자인 추가에는 티켓 2장이 필요합니다. 먼저 티켓을 구매해 주세요.');
return;
}

setIsApplyingExtraVariant(true);

const saved = await setVariantAvailability(alternateTheme, true);

setIsApplyingExtraVariant(false);

if (saved) {
const nextTicketCount = await adjustTicketCount(-2);

if (nextTicketCount === null) {
return;
}

setTicketModalVisible(false);
setNotice(
  `같은 청첩장에 ${alternateTheme === 'emotional' ? '감성형' : '심플형'} 디자인을 추가했습니다.`
);
}
};

const handleTransferTicketCount = async () => {
if (!activeLinkedInvitationCard) {
return;
}

if (!selectedTicketTransferTargetCard?.session) {
setNotice('티켓을 이동할 다른 연동 청첩장을 먼저 선택해 주세요.');
return;
}

if (ticketTransferCount <= 0) {
setNotice('이동할 티켓 수량을 먼저 선택해 주세요.');
return;
}

if (activeLinkedInvitationCard.ticketCount < ticketTransferCount) {
setNotice('보유 티켓보다 많은 수량은 이동할 수 없습니다.');
return;
}

setIsTransferringTickets(true);

const transferResult = await transferTicketCount(
selectedTicketTransferTargetCard.slug,
selectedTicketTransferTargetCard.session.token,
ticketTransferCount
);

setIsTransferringTickets(false);

if (!transferResult) {
return;
}

setLinkedInvitationCards((current) =>
current.map((item) => {
if (item.slug === activeLinkedInvitationCard.slug) {
return {
...item,
ticketCount: transferResult.sourceTicketCount,
updatedAt: Date.now(),
};
}

if (item.slug === selectedTicketTransferTargetCard.slug) {
return {
...item,
ticketCount: transferResult.targetTicketCount,
updatedAt: Date.now(),
};
}

return item;
})
);

setTicketModalVisible(false);
setNotice(
`티켓 ${ticketTransferCount}장을 ${
selectedTicketTransferTargetCard.displayName.trim() || selectedTicketTransferTargetCard.slug
} 청첩장으로 이동했습니다.`
);
};

const handleOpenAlternateThemePreview = async () => {
const previewUrl = dashboard?.links.previewUrls[alternateTheme];
if (!previewUrl) {
setNotice('다른 디자인 미리보기를 아직 불러오지 못했습니다.');
return;
}

try {
try {
await WebBrowser.openBrowserAsync(previewUrl, {
enableDefaultShareMenuItem: true,
controlsColor: palette.accent,
createTask: true,
});
return;
} catch {
// noop
}

await Linking.openURL(previewUrl);
} catch {
setNotice('다른 디자인 미리보기를 열지 못했습니다. 잠시 후 다시 시도해 주세요.');
}
};

return (
<>
<AppScreen
title="운영"
subtitle="연동된 페이지의 공개 상태, 문구, 링크, 방명록을 모바일에서 바로 관리합니다."
>
{showDashboardSyncLoading ? (
<SectionCard
onPress={canRequestDashboardSync ? () => void invitationForm.openEditorModal() : undefined}
title="운영 데이터를 불러오는 중"
description="페이지 설정과 방명록, 공개 링크를 서버에서 확인하고 있습니다."
>
<View style={manageStyles.loadingRow}>
<AppText variant="muted" style={manageStyles.loadingText}>
운영 데이터를 동기화하고 있습니다.
</AppText>
</View>
</SectionCard>
) : null}

{activeLinkedInvitationCard ? (
<SectionCard
title="연동된 청첩장"
description="현재 연동 정보와 공개 상태를 확인하고, 필요하면 다시 연동할 수 있습니다."
badge={`${1 + additionalLinkedInvitationCards.length}개`}
>
<View
style={[
manageStyles.selectedInvitationCard,
{
backgroundColor: palette.surfaceMuted,
borderColor: palette.cardBorder,
gap: 10,
},
]}
>
<View
style={{
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
gap: 8,
}}
>
<AppText style={manageStyles.selectedInvitationTitle}>
{activeLinkedInvitationCard.displayName.trim() || '연동된 청첩장'}
</AppText>
<AppText color={palette.accent} variant="caption">
현재 연동
</AppText>
</View>

<BulletList
items={[
`슬러그: ${activeLinkedInvitationCard.slug}`,
`서비스: ${activeLinkedInvitationCard.productTier.toUpperCase()}`,
`기본 테마: ${
activeLinkedInvitationCard.defaultTheme === 'emotional' ? '감성형' : '심플형'
}`,
`연결된 디자인: ${formatThemeList(activeLinkedInvitationCard.availableThemeKeys)}`,
`보유 티켓: ${activeLinkedInvitationCard.ticketCount}장`,
`노출 기간: ${formatDisplayPeriod(activeLinkedInvitationCard.displayPeriod)}`,
`배경음악: ${activeLinkedInvitationCard.showMusic ? '사용 가능' : '미제공'}`,
`방명록: ${activeLinkedInvitationCard.showGuestbook ? '제공' : '미제공'}`,
]}
/>

{dashboard ? (
<>
<AppText variant="muted" style={manageStyles.linkText}>
{dashboard.links.publicUrl}
</AppText>

<View style={manageStyles.actionRow}>
<ActionButton
variant="secondary"
onPress={() => void invitationForm.openEditorModal()}
disabled={!canRequestDashboardSync}
style={manageStyles.actionHalfButton}
>
수정 하기
</ActionButton>
<ActionButton onPress={handleShare} style={manageStyles.actionHalfButton}>
링크 공유
</ActionButton>
<ActionButton
variant="secondary"
onPress={handleOpenUrl}
style={manageStyles.actionHalfButton}
>
링크 열기
</ActionButton>
<ActionButton
variant={dashboard.page.published ? 'danger' : 'primary'}
onPress={() => void invitationForm.handleTogglePublished()}
style={manageStyles.actionHalfButton}
>
{dashboard.page.published ? '비공개 전환' : '공개 전환'}
</ActionButton>
<ActionButton
variant="secondary"
onPress={guestbook.openGuestbookModal}
style={manageStyles.actionHalfButton}
>
방명록 열기
</ActionButton>
<ActionButton
variant="secondary"
onPress={() => void handleRefreshManageScreen()}
disabled={!canRequestDashboardSync}
style={manageStyles.actionHalfButton}
>
새로고침
</ActionButton>
<ActionButton
variant="secondary"
onPress={handleOpenTicketModal}
style={manageStyles.actionHalfButton}
>
티켓 사용
</ActionButton>
</View>

<AppText variant="muted" style={manageStyles.loadingText}>
  {dashboard.commentCount === 0
    ? '아직 등록된 방명록 댓글이 없습니다.'
    : `${dashboard.commentCount}개의 방명록 댓글이 등록되어 있습니다.`}
</AppText>
</>
) : null}
</View>

{additionalLinkedInvitationCards.length ? (
<View style={{ gap: 10 }}>
{additionalLinkedInvitationCards.map((item) => (
<View
key={`linked-invitation-${item.slug}`}
style={[
manageStyles.selectedInvitationCard,
{
backgroundColor: palette.surface,
borderColor: palette.cardBorder,
gap: 10,
},
]}
>
<View
style={{
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
gap: 8,
}}
>
<AppText style={manageStyles.selectedInvitationTitle}>
{item.displayName.trim() || item.slug}
</AppText>
<AppText variant="caption" color={palette.textMuted}>
추가 연동
</AppText>
</View>

<BulletList
items={[
`슬러그: ${item.slug}`,
`서비스: ${item.productTier.toUpperCase()}`,
`기본 테마: ${item.defaultTheme === 'emotional' ? '감성형' : '심플형'}`,
`연결된 디자인: ${formatThemeList(item.availableThemeKeys)}`,
`보유 티켓: ${item.ticketCount}장`,
`노출 기간: ${formatDisplayPeriod(item.displayPeriod)}`,
]}
/>

{item.publicUrl ? (
<AppText variant="muted" style={manageStyles.linkText}>
{item.publicUrl}
</AppText>
) : null}

<View style={manageStyles.actionRow}>
<ActionButton
variant="secondary"
onPress={() => void handleActivateLinkedInvitation(item)}
style={manageStyles.actionHalfButton}
>
이 청첩장 열기
</ActionButton>
</View>
</View>
))}
</View>
) : null}
</SectionCard>
) : null}

<SectionCard
title="연동 전환"
description="현재 연동을 종료하고 다른 청첩장을 새로 연동합니다."
>
<ActionButton variant="secondary" onPress={() => void handleLinkAnotherInvitation()} fullWidth>
다른 청첩장 연동하기
</ActionButton>
</SectionCard>
</AppScreen>

<EditorPreparingModal
visible={invitationForm.editorPreparingVisible}
message={invitationForm.editorPreparingMessage}
/>

<InvitationEditorModalShell
visible={invitationForm.editorModalVisible}
onClose={invitationForm.closeEditorModal}
title="청첩장 정보 수정"
description="/page-wizard처럼 단계별로 입력하면 더 편하게 관리할 수 있습니다."
palette={palette}
fontScale={fontScale}
cardStyle={manageStyles.previewLinkModalCard}
>
<View style={manageStyles.editorStepHeader}>
<AppText style={manageStyles.editorStepTitle}>
{invitationForm.currentEditorStep.title}
</AppText>
<AppText variant="caption" style={manageStyles.editorStepCounter}>
{invitationForm.editorStepIndex + 1} / {EDITOR_STEPS.length}
</AppText>
</View>
<AppText variant="muted" style={manageStyles.loadingText}>
{invitationForm.currentEditorStep.description}
</AppText>

<ScrollView
horizontal
showsHorizontalScrollIndicator={false}
contentContainerStyle={manageStyles.editorStepChipRow}
>
{EDITOR_STEPS.map((step, index) => (
<ChoiceChip
key={step.key}
label={step.title}
selected={index === invitationForm.editorStepIndex}
onPress={() => invitationForm.setEditorStepIndex(index)}
/>
))}
</ScrollView>

<ManageEditorStepContent
stepKey={invitationForm.currentEditorStep.key}
form={invitationForm.form}
mapPreviewUrl={invitationForm.mapPreviewUrl}
mapLatitude={invitationForm.mapLatitude}
mapLongitude={invitationForm.mapLongitude}
galleryPreviewItems={invitationForm.galleryPreviewItems}
maxGalleryImageCount={maxGalleryImageCount}
supportsMusicFeature={supportsMusicFeature}
musicLibraryLoading={musicLibrary.musicLibraryLoading}
musicCategories={musicLibrary.musicCategories}
openMusicDropdown={musicLibrary.openMusicDropdown}
selectedMusicCategoryLabel={selectedMusicCategoryLabel}
selectedMusicTrackLabel={musicLibrary.selectedMusicTrackLabel}
availableMusicTracks={musicLibrary.availableMusicTracks}
uploadingImageKind={imageUpload.uploadingImageKind}
isSearchingAddress={addressSearch.isSearchingAddress}
onUpdateField={invitationForm.updateField}
onUpdatePersonField={invitationForm.updatePersonField}
onUpdateParentField={invitationForm.updateParentField}
onUploadImage={imageUpload.handleUploadImage}
onMoveGalleryImage={imageUpload.handleMoveGalleryImage}
onRemoveGalleryImage={imageUpload.handleRemoveGalleryImage}
onSearchAddress={() => addressSearch.handleSearchAddress(invitationForm.form.ceremonyAddress)}
onOpenMapUrl={handleOpenMapUrl}
onSetDefaultTheme={invitationForm.setDefaultTheme}
onSetMusicEnabled={invitationForm.setMusicEnabled}
onSetPublished={invitationForm.setPublished}
onToggleMusicDropdown={musicLibrary.setOpenMusicDropdown}
onSelectMusicCategory={musicLibrary.handleSelectMusicCategory}
onSelectMusicTrack={musicLibrary.handleSelectMusicTrack}
/>

{notice ? (
<AppText color={palette.accent} style={manageStyles.noticeText}>
{notice}
</AppText>
) : null}
{authError ? (
<AppText color={palette.danger} style={manageStyles.noticeText}>
{authError}
</AppText>
) : null}

<View style={manageStyles.editorStepActions}>
<ActionButton
variant="secondary"
onPress={() =>
invitationForm.setEditorStepIndex((current) => Math.max(0, current - 1))
}
disabled={invitationForm.isFirstEditorStep}
>
이전
</ActionButton>
{!invitationForm.isLastEditorStep ? (
<ActionButton
variant="secondary"
onPress={() =>
invitationForm.setEditorStepIndex((current) =>
Math.min(EDITOR_STEPS.length - 1, current + 1)
)
}
>
다음
</ActionButton>
) : null}
<ActionButton onPress={() => void invitationForm.handleSave()} loading={invitationForm.isSaving}>
운영 정보 저장
</ActionButton>
</View>
</InvitationEditorModalShell>

<GuestbookModal
visible={guestbook.guestbookModalVisible}
totalCount={dashboard?.commentCount ?? 0}
filteredCount={guestbook.guestbookFilteredSortedComments.length}
comments={guestbook.guestbookPageComments}
searchQuery={guestbook.guestbookSearchQuery}
page={guestbook.guestbookPage}
totalPages={guestbook.guestbookTotalPages}
canRefresh={canRequestDashboardSync}
onClose={guestbook.closeGuestbookModal}
onChangeSearchQuery={guestbook.setGuestbookSearchQuery}
onChangePage={guestbook.setGuestbookPage}
onDeleteComment={guestbook.handleDeleteComment}
onRefresh={() =>
  void invitationForm.requestDashboardSync(undefined, { includeComments: true })
}
/>

        <TicketUsageModal
          visible={ticketModalVisible}
  onClose={closeTicketModal}
palette={palette}
fontScale={fontScale}
  availableTicketCount={activeLinkedInvitationCard?.ticketCount ?? 0}
  currentPlan={activeLinkedInvitationCard?.productTier ?? 'standard'}
  currentTheme={activeLinkedInvitationCard?.defaultTheme ?? 'emotional'}
  selectedTheme={ticketThemeSelection}
  upgradeTargetPlan={upgradeTargetPlan}
          isExtendingDisplayPeriod={isExtendingDisplayPeriod}
          isApplyingThemeChange={isApplyingTicketThemeChange}
          onSelectTheme={setTicketThemeSelection}
          onExtendDisplayPeriod={() => void handleExtendDisplayPeriod()}
          onApplyThemeChange={() => void handleApplyTicketThemeChange()}
          onOpenAlternateThemePreview={() => void handleOpenAlternateThemePreview()}
          isApplyingExtraVariant={isApplyingExtraVariant}
        isExtraVariantAdded={isAlternateThemeAvailable}
        onAddExtraVariant={() => void handleAddExtraVariant()}
transferTargetCards={ticketTransferTargetCards.map((item) => ({
slug: item.slug,
displayName: item.displayName,
ticketCount: item.ticketCount,
}))}
selectedTransferTargetSlug={selectedTicketTransferTargetCard?.slug ?? null}
ticketTransferCount={ticketTransferCount}
ticketTransferCountOptions={ticketTransferCountOptions}
isTransferringTickets={isTransferringTickets}
onSelectTransferTarget={setTicketTransferTargetSlug}
onSelectTicketTransferCount={setTicketTransferCount}
  onTransferTickets={() => void handleTransferTicketCount()}
  onGoToUpgrade={() =>
  handleRouteToCreateWithTicketIntent('upgrade', {
  targetPlan: upgradeTargetPlan ?? undefined,
  })
  }
  />

<InvitationEditorModalShell
visible={Boolean(previewLinkTargetCard)}
onClose={closePreviewLinkModal}
title="디자인 링크 열기"
description="연결된 디자인이 여러 개면 원하는 테마 링크를 골라서 바로 열 수 있습니다."
palette={palette}
fontScale={fontScale}
>
<SectionCard
title={previewLinkTargetCard?.displayName.trim() || '연동된 청첩장'}
description="관리자 페이지의 디자인 미리보기처럼 현재 연결된 테마별 경로를 바로 열 수 있습니다."
>
<BulletList
items={[
  `기본 테마: ${previewLinkTargetCard ? THEME_LABELS[previewLinkTargetCard.defaultTheme] : '-'}`,
  `연결된 디자인: ${formatThemeList(previewLinkThemeKeys)}`,
]}/>
<View style={manageStyles.actionRow}>
{previewLinkTargetCard
  ? previewLinkThemeKeys.map((themeKey) => (
      <ActionButton
        key={`preview-link-${previewLinkTargetCard.slug}-${themeKey}`}
        variant={themeKey === previewLinkTargetCard.defaultTheme ? 'primary' : 'secondary'}
        onPress={() => void handleOpenThemeLink(previewLinkTargetCard, themeKey)}
        style={manageStyles.actionHalfButton}
      >
        {`${THEME_LABELS[themeKey]} 링크 열기`}
      </ActionButton>
    ))
  : null}
</View>
</SectionCard>
</InvitationEditorModalShell>

<OnboardingModal
  visible={invitationForm.onboardingVisible}
stepIndex={invitationForm.onboardingStepIndex}
form={invitationForm.form}
isSaving={invitationForm.isSaving}
authError={authError}
validationMessage={invitationForm.onboardingValidationMessage}
onClose={invitationForm.closeOnboarding}
onPrevious={() =>
invitationForm.setOnboardingStepIndex((current) => Math.max(0, current - 1))
}
onNext={invitationForm.handleOnboardingNext}
onUpdateField={invitationForm.updateField}
onUpdatePersonName={(role, value) =>
invitationForm.updatePersonField(role, 'name', value)
}
onSetPublished={invitationForm.setPublished}
/>
</>
);
}
