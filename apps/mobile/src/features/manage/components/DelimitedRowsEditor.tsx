import { StyleSheet, View } from 'react-native';
import { ActionButton } from '../../../components/ActionButton';
import { AppText } from '../../../components/AppText';
import { TextField } from '../../../components/TextField';
import { useVisualPreferences } from '../../../contexts/PreferencesContext';
import { appendEditorRow, readEditorRows, removeEditorRow, updateEditorCell } from '../editorDelimitedRows';

type DelimitedRowsEditorProps = {
  label: string;
  value: string;
  fields: readonly string[];
  onChange: (value: string) => void;
};

export function DelimitedRowsEditor({ label, value, fields, onChange }: DelimitedRowsEditorProps) {
  const { palette } = useVisualPreferences();
  const rows = readEditorRows(value, fields.length);
  return (
    <View style={styles.group}>
      <AppText accessibilityRole="header" style={styles.title}>{label}</AppText>
      {rows.map((cells, row) => (
        <View key={row} style={[styles.row, { backgroundColor: palette.surfaceMuted }]}>
          {fields.map((field, column) => <TextField key={field} label={`${field} ${row + 1}`} value={cells[column]}
            onChangeText={next => onChange(updateEditorCell(value, row, column, next, fields.length))} />)}
          <ActionButton variant="secondary" onPress={() => onChange(removeEditorRow(value, row))}
            accessibilityLabel={`${label} ${row + 1}번째 항목 삭제`}>항목 삭제</ActionButton>
        </View>
      ))}
      {rows.length < 3 ? <ActionButton variant="secondary" onPress={() => onChange(appendEditorRow(value, fields.length))}>
        {label} 추가
      </ActionButton> : null}
      <AppText variant="caption" color={palette.textMuted}>최대 3개까지 입력할 수 있습니다.</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 12 },
  title: { fontWeight: '500' },
  row: { padding: 16, gap: 16 },
});
