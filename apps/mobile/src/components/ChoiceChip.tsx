import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { APP_CONTROL_MIN_HEIGHT, getScaledTypography } from '../constants/uiTokens';
import { useVisualPreferences } from '../contexts/PreferencesContext';

type ChoiceChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function ChoiceChip({ label, selected, onPress }: ChoiceChipProps) {
  const { palette, fontScale } = useVisualPreferences();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={selected ? `${label}, 선택됨` : label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? palette.accent : palette.surface,
          borderColor: selected ? palette.accent : palette.cardBorder,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <View style={styles.content}>
        {selected ? <Ionicons name="checkmark" size={16} color={palette.surface} /> : null}
        <Text
          style={[
            { color: selected ? palette.surface : palette.text },
            getScaledTypography('chip', fontScale),
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 0,
    minHeight: APP_CONTROL_MIN_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
