import { StyleSheet } from 'react-native';

export const manageStyles = StyleSheet.create({
  editorPreparingCard: {
    alignItems: 'center',
  },
  editorStepHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  editorStepTitle: {
    flexShrink: 1,
    fontWeight: '500',
  },
  editorStepCounter: {
    fontWeight: '700',
  },
  editorStepChipRow: {
    gap: 8,
    paddingBottom: 4,
  },
  editorStepActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    flexShrink: 1,
    lineHeight: 20,
  },
  linkText: {
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionHalfButton: {
    minWidth: 120,
    flexBasis: 120,
    flexGrow: 1,
  },
  noticeBanner: {
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryActionCard: {
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  secondaryActionLabel: {
    fontWeight: '700',
  },
  noticeText: {
    lineHeight: 20,
  },
  helperText: {
    lineHeight: 18,
  },
  previewFrame: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 10,
    overflow: 'hidden',
  },
  coverPreviewFrame: {
    width: '100%',
    aspectRatio: 1.45,
  },
  coverPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    backgroundColor: '#f8f8f7',
  },
  emptyImageState: {
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  uploadProgressCard: {
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  uploadProgressTitle: {
    fontWeight: '500',
  },
  galleryList: {
    gap: 10,
  },
  galleryCard: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 12,
    gap: 12,
  },
  galleryPreviewFrame: {
    width: '100%',
    aspectRatio: 1.25,
  },
  galleryPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    backgroundColor: '#f8f8f7',
  },
  galleryCardCopy: {
    gap: 4,
  },
  galleryCardTitle: {
    fontWeight: '500',
  },
  galleryCardMeta: {
    lineHeight: 18,
  },
  galleryCardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mapPreviewCard: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 14,
    gap: 8,
  },
  mapPreviewTitle: {
    fontWeight: '500',
  },
  mapPreviewAddress: {
    lineHeight: 19,
  },
  mapPreviewMeta: {
    lineHeight: 18,
  },
  selectedInvitationCard: {
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  invitationCardExpanded: {
    gap: 16,
  },
  invitationCardHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  invitationCardList: {
    gap: 10,
  },
  selectedInvitationTitle: {
    flexShrink: 1,
    fontWeight: '500',
  },
  selectedInvitationHint: {
    lineHeight: 18,
  },
  personGrid: {
    gap: 10,
  },
  personCard: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 12,
    gap: 10,
  },
  personCardTitle: {
    fontWeight: '500',
  },
  personSectionLabel: {
    fontWeight: '700',
    marginTop: 2,
  },
  twoColumnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  halfField: {
    flexGrow: 1,
    flexBasis: 140,
    minWidth: 140,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dropdownField: {
    gap: 8,
  },
  dropdownLabel: {
    fontWeight: '700',
  },
  dropdownButton: {
    minHeight: 48,
    borderRadius: 0,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dropdownButtonText: {
    flex: 1,
    lineHeight: 20,
    fontWeight: '600',
  },
  dropdownArrow: {
    fontWeight: '700',
  },
  dropdownList: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 10,
    gap: 8,
  },
  dropdownOption: {
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownOptionCopy: {
    gap: 2,
  },
  dropdownOptionTitle: {
    fontWeight: '700',
  },
  dropdownOptionMeta: {
    lineHeight: 18,
  },
  commentCard: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 14,
    gap: 12,
  },
  commentStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  commentStatusBadge: {
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  commentStatusBadgeText: {
    fontWeight: '500',
  },
  commentCopy: {
    gap: 4,
  },
  commentAuthor: {
    flexShrink: 1,
    fontWeight: '700',
  },
  commentMessage: {
    lineHeight: 20,
  },
  commentMeta: {
    lineHeight: 18,
  },
  commentStatusHint: {
    lineHeight: 18,
  },
  commentActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  guestbookModalCard: {
    maxHeight: '90%',
  },
  editorModalCard: {
    height: '96%',
  },
  previewLinkModalCard: {
    height: '93%',
    maxHeight: '93%',
  },
  searchSummaryText: {
    lineHeight: 18,
    fontWeight: '600',
  },
  guestbookList: {
    maxHeight: 440,
    minHeight: 280,
  },
  guestbookListContent: {
    gap: 10,
    paddingBottom: 4,
  },
  paginationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  paginationText: {
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 18, 16, 0.58)',
  },
  modalCard: {
    maxHeight: '90%',
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 0,
    padding: 16,
    gap: 16,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  modalEyebrow: {
    fontWeight: '500',
  },
  modalTitle: {
    fontWeight: '500',
  },
  modalDescription: {
    lineHeight: 21,
  },
  modalBadge: {
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modalBadgeText: {
    fontWeight: '500',
  },
  modalErrorText: {
    lineHeight: 19,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
});
