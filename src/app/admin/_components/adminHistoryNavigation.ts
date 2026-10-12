const HISTORY_INDEX = '__adminHistoryIndex';
const HISTORY_SCOPE = '__adminHistoryScope';

function readIndex(state: unknown) {
  if (!state || typeof state !== 'object') return null;
  const value = (state as Record<string, unknown>)[HISTORY_INDEX];
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

function readScope(state: unknown) {
  if (!state || typeof state !== 'object') return null;
  const value = (state as Record<string, unknown>)[HISTORY_SCOPE];
  return typeof value === 'string' ? value : null;
}

function readNavigationIndex(browser: Window) {
  const index = (browser as Window & {
    navigation?: { currentEntry?: { index?: number } | null } | null;
  }).navigation?.currentEntry?.index;
  return typeof index === 'number' && Number.isInteger(index) && index >= 0 ? index : null;
}

/** Next가 popstate를 처리하기 전에 원래 편집 화면을 복원하고 승인 후 이동합니다. */
export function installAdminHistoryGuard(
  browser: Window,
  guard: { shouldBlock: () => boolean; request: (action: () => void) => void }
) {
  const history = browser.history;
  const originalPush = history.pushState;
  const originalReplace = history.replaceState;
  let currentIndex = readNavigationIndex(browser) ?? readIndex(history.state) ?? 0;
  let scope = readScope(history.state) ?? Math.random().toString(36).slice(2);
  let currentUrl = browser.location?.href ?? '';
  let currentState: unknown;
  let restoring: { delta: number; targetUrl: string } | null = null;
  let approvedTraversal = false;
  const withIndex = (state: unknown, index: number) => ({
    ...(state && typeof state === 'object' ? state : {}),
    [HISTORY_INDEX]: index,
    [HISTORY_SCOPE]: scope,
  });
  const rememberCurrent = () => {
    currentState = history.state;
    currentUrl = browser.location?.href ?? currentUrl;
  };

  originalReplace.call(history, withIndex(history.state, currentIndex), '');
  rememberCurrent();
  const push: History['pushState'] = (state, unused, url) => {
    currentIndex++;
    originalPush.call(history, withIndex(state, currentIndex), unused, url);
    currentIndex = readNavigationIndex(browser) ?? currentIndex;
    rememberCurrent();
  };
  const replace: History['replaceState'] = (state, unused, url) => {
    originalReplace.call(history, withIndex(state, currentIndex), unused, url);
    rememberCurrent();
  };
  history.pushState = push;
  history.replaceState = replace;

  const preserveUnknownTraversal = (targetUrl: string) => {
    // 이동 거리를 모르면 기존 기록 한 칸으로 추정하지 않고 현재 URL과 편집 상태를 유지합니다.
    // 구형 브라우저에서는 선택된 기록을 대체하며, 승인 후 목적 URL로 문서 이동합니다.
    scope = Math.random().toString(36).slice(2);
    currentIndex = 0;
    originalReplace.call(history, withIndex(currentState, currentIndex), '', currentUrl);
    rememberCurrent();
    guard.request(() => browser.location.assign(targetUrl));
  };

  const onPopState = (event: PopStateEvent) => {
    if (restoring) {
      event.stopImmediatePropagation();
      const { delta, targetUrl } = restoring;
      restoring = null;
      const returnedIndex = readNavigationIndex(browser);
      if ((returnedIndex !== null && returnedIndex !== currentIndex) ||
          (currentUrl && browser.location?.href !== currentUrl)) {
        preserveUnknownTraversal(targetUrl);
        return;
      }
      guard.request(() => {
        approvedTraversal = true;
        history.go(delta);
      });
      return;
    }

    const targetIndex = readNavigationIndex(browser) ??
      (readScope(event.state) === scope ? readIndex(event.state) : null);
    if (approvedTraversal || !guard.shouldBlock()) {
      approvedTraversal = false;
      currentIndex = targetIndex ?? 0;
      if (targetIndex === null) scope = Math.random().toString(36).slice(2);
      originalReplace.call(history, withIndex(event.state, currentIndex), '');
      rememberCurrent();
      return;
    }
    event.stopImmediatePropagation();
    const targetUrl = browser.location?.href ?? currentUrl;
    if (targetIndex === null) {
      preserveUnknownTraversal(targetUrl);
      return;
    }
    const delta = targetIndex - currentIndex;
    if (delta === 0) {
      preserveUnknownTraversal(targetUrl);
      return;
    }
    restoring = { delta, targetUrl };
    history.go(-delta);
  };
  browser.addEventListener('popstate', onPopState, true);
  return () => {
    browser.removeEventListener('popstate', onPopState, true);
    if (history.pushState === push) history.pushState = originalPush;
    if (history.replaceState === replace) history.replaceState = originalReplace;
  };
}
