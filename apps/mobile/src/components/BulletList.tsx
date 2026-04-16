import { StyleSheet, Text, View } from 'react-native';

import { usePreferences } from '../contexts/PreferencesContext';

export function BulletList({ items }: { items: readonly string[] }) {
  const { palette, fontScale } = usePreferences();

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View
          key={item}
          accessible
          accessibilityRole="text"
          accessibilityLabel={item}
          style={styles.row}
        >
          <View style={[styles.dot, { backgroundColor: palette.accent }]} />
          <Text style={[styles.text, { color: palette.text, fontSize: 14 * fontScale }]}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    marginTop: 7,
  },
  text: {
    flex: 1,
    lineHeight: 21,
  },
});
