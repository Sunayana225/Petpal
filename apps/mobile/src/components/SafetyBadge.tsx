import { StyleSheet, Text, View } from 'react-native';

import { SAFETY_META } from '../domain/pets';
import { fonts, space } from '../theme';
import type { SafetyLevel } from '../domain/types';

/** A verdict tag: a word inside a hairline border, no fill. */
export default function SafetyBadge({ safety }: { safety: SafetyLevel }) {
  const meta = SAFETY_META[safety];

  return (
    <View style={[styles.badge, { borderColor: meta.color }]}>
      <Text style={[styles.text, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    paddingHorizontal: space(3),
    paddingVertical: space(1),
    alignSelf: 'flex-start',
  },
  text: { fontFamily: fonts.sans, fontSize: 10, fontWeight: '600', letterSpacing: 2 },
});
