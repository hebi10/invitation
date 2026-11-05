import type { PropsWithChildren, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { getPalette } from '../../constants/theme';
import { ActionButton } from '../ActionButton';
import { AppModalFrame } from '../AppModalFrame';

type InvitationEditorModalShellProps = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  title: string;
  description: string;
  palette: ReturnType<typeof getPalette>;
  fontScale: number;
  cardStyle?: StyleProp<ViewStyle>;
  closeAccessibilityLabel?: string;
  closeDisabled?: boolean;
  closeLoading?: boolean;
  closeConfirmation?: ReactNode;
  contentDisabled?: boolean;
}>;

export function InvitationEditorModalShell({
  visible,
  onClose,
  title,
  description,
  palette,
  cardStyle,
  closeAccessibilityLabel,
  closeDisabled = false,
  closeLoading = false,
  closeConfirmation,
  contentDisabled = false,
  children,
}: InvitationEditorModalShellProps) {
  return (
    <AppModalFrame
      visible={visible}
      onClose={onClose}
      title={title}
      description={description}
      placement="bottom"
      palette={palette}
      cardStyle={cardStyle}
      closeDisabled={closeDisabled || closeLoading}
      contentDisabled={contentDisabled}
      footer={closeConfirmation ?? (
        <ActionButton
          variant="secondary"
          onPress={onClose}
          disabled={closeDisabled}
          loading={closeLoading}
          accessibilityLabel={closeAccessibilityLabel ?? `${title} 닫기`}
          fullWidth
        >
          닫기
        </ActionButton>
      )}
    >
      {children}
    </AppModalFrame>
  );
}
