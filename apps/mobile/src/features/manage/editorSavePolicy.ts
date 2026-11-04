type EditorSavePolicyInput = {
  savedPublished: boolean;
  requestedPublished: boolean;
  applyPublicationChange: boolean;
};

export function resolveEditorSavePolicy({
  savedPublished,
  requestedPublished,
  applyPublicationChange,
}: EditorSavePolicyInput) {
  const published = applyPublicationChange ? requestedPublished : savedPublished;
  return {
    published,
    hasPendingPublicationChange: published !== requestedPublished,
    requiresPublishConfirmation: !savedPublished && published,
  };
}
