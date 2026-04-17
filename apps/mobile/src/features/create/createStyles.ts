import { StyleSheet } from 'react-native';

export const createStyles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  stepTabsSection: {
    gap: 10,
  },
  stepTabsCaption: {
    fontWeight: '700',
  },
  stepTabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stepTab: {
    flexGrow: 1,
    minWidth: 72,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  stepTabIndex: {
    fontWeight: '800',
  },
  stepTabLabel: {
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectionFeatureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectionFeatureChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selectionSummaryCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
  },
  selectionSummaryLabel: {
    fontWeight: '700',
  },
  selectionSummaryValue: {
    fontWeight: '800',
  },
  selectionSummaryDescription: {
    lineHeight: 21,
  },
  sampleLinkBox: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  sampleLinkText: {
    lineHeight: 19,
  },
  sampleLinkButton: {
    alignSelf: 'flex-start',
  },
  helperText: {
    lineHeight: 21,
  },
  divider: {
    height: 1,
    opacity: 0.7,
  },
  previewLabel: {
    fontWeight: '700',
  },
  noticeBox: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  noticeText: {
    lineHeight: 19,
    fontWeight: '600',
  },
  securityGuideCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  ticketPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ticketCounterCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  ticketCounterButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketCounterButtonDisabled: {
    opacity: 0.45,
  },
  ticketCounterButtonLabel: {
    fontWeight: '800',
  },
  ticketCounterValueBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  ticketCounterValue: {
    fontWeight: '800',
  },
  ticketCounterCaption: {
    fontWeight: '600',
  },
  ticketSummaryCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  ticketSummaryText: {
    lineHeight: 20,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  summaryLabel: {
    lineHeight: 20,
  },
  summaryValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontWeight: '700',
  },
  totalLabel: {
    fontWeight: '800',
  },
  actionColumn: {
    gap: 10,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  stickyBarCompact: {
    paddingTop: 10,
  },
  stickyBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stickyBarContentCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  stickyPriceBox: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  stickyPriceLabel: {
    fontWeight: '700',
  },
  stickyPriceValue: {
    fontWeight: '800',
  },
  stickyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stickyActionRowCompact: {
    width: '100%',
  },
  stickyPrimaryActionButton: {
    minWidth: 136,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  stickySecondaryActionButton: {
    minWidth: 88,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  stickyActionButtonCompact: {
    flex: 1,
  },
});
