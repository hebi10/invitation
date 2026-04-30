import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';

import {
  buildInvitationThemeRoutePath,
  DEFAULT_INVITATION_THEME,
  getInvitationThemeLabel,
} from '@/lib/invitationThemes';
import { getWeddingPreviewThemeKeys } from '@/lib/eventPreviewLinks';

import type { NoticeState, WorkspaceView } from './pageEditorClientTypes';
import type { PreviewThemeKey } from './pageEditorPreviewUtils';

export function usePageEditorPreviewState({
  slug,
  setNotice,
}: {
  slug: string;
  setNotice: Dispatch<SetStateAction<NoticeState>>;
}) {
  const [previewTheme, setPreviewTheme] =
    useState<PreviewThemeKey>(DEFAULT_INVITATION_THEME);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('form');

  const previewLinks = useMemo(
    () =>
      getWeddingPreviewThemeKeys().map((themeKey) => ({
        href: buildInvitationThemeRoutePath(slug, themeKey),
        label: `${getInvitationThemeLabel(themeKey)} 청첩장 보기`,
      })),
    [slug]
  );

  const currentPreviewHref = useMemo(
    () => buildInvitationThemeRoutePath(slug, previewTheme),
    [previewTheme, slug]
  );

  const handleCopyPreviewLink = useCallback(async () => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${currentPreviewHref}`);
      setNotice({
        tone: 'success',
        message: '현재 미리보기 링크를 복사했습니다.',
      });
    } catch (error) {
      console.error('[PageEditorClient] failed to copy preview link', error);
      setNotice({
        tone: 'error',
        message: '링크를 복사하지 못했습니다. 브라우저 권한을 확인해 주세요.',
      });
    }
  }, [currentPreviewHref, setNotice]);

  return {
    previewTheme,
    setPreviewTheme,
    workspaceView,
    setWorkspaceView,
    previewLinks,
    currentPreviewHref,
    handleCopyPreviewLink,
  };
}
