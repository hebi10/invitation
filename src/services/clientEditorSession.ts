import { toUserFacingKoreanErrorMessage } from '@/lib/userFacingErrorMessage';
import type { EditableInvitationPageConfig } from './invitationPageService';
import type { InvitationPageSeed, InvitationThemeKey } from '@/types/invitationPage';

type ClientEditorSessionResponse = {
  authenticated: boolean;
  pageSlug: string | null;
};

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string; [key: string]: unknown }
    | null;

  if (!response.ok) {
    throw new Error(
      toUserFacingKoreanErrorMessage(
        typeof payload?.error === 'string' && payload.error.trim()
          ? payload.error
          : 'Request failed.'
      )
    );
  }

  return payload as T;
}

export async function loginClientEditorSession(pageSlug: string, password: string) {
  return readJsonResponse<{ authenticated: boolean }>(
    await fetch('/api/client-editor/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        pageSlug,
        password,
      }),
    })
  );
}

export async function logoutClientEditorSession() {
  return readJsonResponse<{ success: boolean }>(
    await fetch('/api/client-editor/logout', {
      method: 'POST',
      credentials: 'same-origin',
    })
  );
}

export async function getClientEditorSession(pageSlug: string) {
  const params = new URLSearchParams({ pageSlug });
  return readJsonResponse<ClientEditorSessionResponse>(
    await fetch(`/api/client-editor/session?${params.toString()}`, {
      credentials: 'same-origin',
      cache: 'no-store',
    })
  );
}

export async function getClientEditorEditableConfig(pageSlug: string) {
  return readJsonResponse<EditableInvitationPageConfig | null>(
    await fetch(`/api/client-editor/pages/${encodeURIComponent(pageSlug)}`, {
      credentials: 'same-origin',
      cache: 'no-store',
    })
  );
}

export async function saveClientEditorConfig(
  pageSlug: string,
  config: InvitationPageSeed,
  options: {
    published?: boolean;
    defaultTheme?: InvitationThemeKey;
  } = {}
) {
  return readJsonResponse<{ success: boolean }>(
    await fetch(`/api/client-editor/pages/${encodeURIComponent(pageSlug)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        action: 'save',
        config: {
          ...config,
          slug: pageSlug,
        },
        ...options,
      }),
    })
  );
}

export async function restoreClientEditorConfig(
  pageSlug: string,
  options: {
    published?: boolean;
    defaultTheme?: InvitationThemeKey;
  } = {}
) {
  return readJsonResponse<{ success: boolean }>(
    await fetch(`/api/client-editor/pages/${encodeURIComponent(pageSlug)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        action: 'restore',
        ...options,
      }),
    })
  );
}

export async function setClientEditorPublishedState(
  pageSlug: string,
  published: boolean,
  options: {
    defaultTheme?: InvitationThemeKey;
  } = {}
) {
  return readJsonResponse<{ success: boolean }>(
    await fetch(`/api/client-editor/pages/${encodeURIComponent(pageSlug)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        action: 'setPublished',
        published,
        ...options,
      }),
    })
  );
}

export async function deleteClientEditorComment(pageSlug: string, commentId: string) {
  return readJsonResponse<{ success: boolean }>(
    await fetch(
      `/api/client-editor/pages/${encodeURIComponent(pageSlug)}/comments/${encodeURIComponent(commentId)}`,
      {
        method: 'DELETE',
        credentials: 'same-origin',
      }
    )
  );
}
