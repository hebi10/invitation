import { StyleSheet } from 'react-native';

export const manageStyles = StyleSheet.create({
  editorPreparingCard: {
    alignItems: 'center',
  },
  editorStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  editorStepTitle: {
    fontWeight: '800',
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
    width: '48%',
    flexBasis: '48%',
    flexGrow: 1,
  },
  noticeText: {
    lineHeight: 20,
  },
  helperText: {
    lineHeight: 18,
  },
  coverPreviewImage: {
    width: '100%',
    aspectRatio: 1.45,
    borderRadius: 18,
  },
  emptyImageState: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  galleryList: {
    gap: 10,
  },
  galleryCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 12,
  },
  galleryPreviewImage: {
    width: '100%',
    aspectRatio: 1.25,
    borderRadius: 16,
    backgroundColor: '#f3efe8',
  },
  galleryCardCopy: {
    gap: 4,
  },
  galleryCardTitle: {
    fontWeight: '800',
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
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  mapPreviewTitle: {
    fontWeight: '800',
  },
  mapPreviewAddress: {
    lineHeight: 19,
  },
  mapPreviewMeta: {
    lineHeight: 18,
  },
  selectedInvitationCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  selectedInvitationTitle: {
    fontWeight: '800',
  },
  selectedInvitationHint: {
    lineHeight: 18,
  },
  personGrid: {
    gap: 10,
  },
  personCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 10,
  },
  personCardTitle: {
    fontWeight: '800',
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
    flexBasis: '48%',
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
    borderRadius: 16,
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
    borderRadius: 16,
    padding: 10,
    gap: 8,
  },
  dropdownOption: {
    borderWidth: 1,
    borderRadius: 14,
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
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  commentCopy: {
    gap: 4,
  },
  commentAuthor: {
    fontWeight: '700',
  },
  commentMessage: {
    lineHeight: 20,
  },
  commentMeta: {
    lineHeight: 18,
  },
  guestbookModalCard: {
    maxHeight: '90%',
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
    backgroundColor: 'rgba(15, 12, 10, 0.58)',
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
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
    gap: 6,
  },
  modalEyebrow: {
    fontWeight: '800',
  },
  modalTitle: {
    fontWeight: '800',
  },
  modalDescription: {
    lineHeight: 21,
  },
  modalBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modalBadgeText: {
    fontWeight: '800',
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
