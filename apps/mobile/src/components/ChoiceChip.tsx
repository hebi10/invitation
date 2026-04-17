import {
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

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
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? palette.accentSoft : palette.surfaceMuted,
          borderColor: selected ? palette.accent : palette.cardBorder,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: selected ? palette.accent : palette.text,
            fontSize: 13 * fontScale,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  label: {
    fontWeight: '700',
  },
});
