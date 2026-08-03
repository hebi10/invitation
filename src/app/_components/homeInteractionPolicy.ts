export function getHomeLinkRenderProps(external: boolean) {
  return external
    ? {
        target: '_blank' as const,
        rel: 'noreferrer',
      }
    : {};
}

export function shouldDismissExperienceNotice(key: string, loading: boolean) {
  return key === 'Escape' && !loading;
}

export function handleExperienceNoticeKeyDown(
  key: string,
  loading: boolean,
  dismiss: () => void
) {
  if (!shouldDismissExperienceNotice(key, loading)) {
    return false;
  }

  dismiss();
  return true;
}
