import { StyleSheet, Text, View } from 'react-native';

import { useAppState } from '../contexts/AppStateContext';

export function BulletList({ items }: { items: readonly string[] }) {
  const { palette, fontScale } = useAppState();

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item} style={styles.row}>
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
