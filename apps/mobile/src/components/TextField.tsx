import {
  StyleSheet,
  TextInput,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  View,
} from 'react-native';

import { usePreferences } from '../contexts/PreferencesContext';
import { AppText, type AppTextVariant } from './AppText';

type SupportedTextFieldProps = Pick<
  TextInputProps,
  | 'autoCapitalize'
  | 'autoCorrect'
  | 'editable'
  | 'keyboardType'
  | 'maxLength'
  | 'onSubmitEditing'
  | 'returnKeyType'
  | 'secureTextEntry'
>;

type TextFieldProps = SupportedTextFieldProps & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  helperText?: string;
  labelVariant?: AppTextVariant;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  multiline = false,
  autoCorrect,
  autoCapitalize = 'sentences',
  keyboardType,
  returnKeyType,
  onSubmitEditing,
  editable = true,
  maxLength,
  helperText,
  labelVariant = 'caption',
  containerStyle,
  inputStyle,
}: TextFieldProps) {
  const { palette, fontScale } = usePreferences();

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <AppText variant={labelVariant} style={styles.label}>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        editable={editable}
        maxLength={maxLength}
        style={[
          styles.input,
          multiline ? styles.multiline : null,
          {
            backgroundColor: palette.surface,
            borderColor: palette.cardBorder,
            color: palette.text,
            fontSize: 15 * fontScale,
            opacity: editable ? 1 : 0.6,
          },
          inputStyle,
        ]}
      />
      {helperText ? (
        <AppText variant="muted" style={styles.helperText}>
          {helperText}
        </AppText>
      ) : null}
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
  helperText: {
    marginTop: -2,
  },
});
