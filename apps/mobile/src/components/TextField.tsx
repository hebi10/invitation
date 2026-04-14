import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAppState } from '../contexts/AppStateContext';

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  multiline = false,
  autoCapitalize = 'sentences',
}: TextFieldProps) {
  const { palette, fontScale } = useAppState();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: palette.text, fontSize: 13 * fontScale }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        style={[
          styles.input,
          multiline ? styles.multiline : null,
          {
            backgroundColor: palette.surfaceMuted,
            borderColor: palette.cardBorder,
            color: palette.text,
            fontSize: 15 * fontScale,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multiline: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
});
