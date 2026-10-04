import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, space } from '../theme';

const ENDPOINTS: { method: string; path: string; needsKey?: boolean }[] = [
  { method: 'POST', path: '/api/food-safety/check' },
  { method: 'GET', path: '/api/food-safety/check?pet=&food=' },
  { method: 'GET', path: '/api/food-safety/search?q=', needsKey: true },
  { method: 'GET', path: '/api/food-safety/pets', needsKey: true },
  { method: 'GET', path: '/api/food-safety/stats', needsKey: true },
];

export default function InfoScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        paddingTop: insets.top + space(8),
        paddingBottom: space(14),
        paddingHorizontal: space(5),
      }}
    >
      <Text style={styles.eyebrow}>ABOUT</Text>
      <Text style={styles.title}>How PetPal{'\n'}thinks.</Text>
      <Text style={styles.body}>
        Every check resolves in a fixed order: the local veterinary database first, then
        Open Pet Food Facts, then Gemini as a clearly-labelled fallback — and finally an
        honest “unknown”. The answer always tells you which layer it came from.
      </Text>

      <Text style={[styles.eyebrow, styles.section]}>API</Text>
      <View style={styles.table}>
        {ENDPOINTS.map((endpoint) => (
          <View key={endpoint.path} style={styles.row}>
            <Text style={styles.method}>{endpoint.method}</Text>
            <Text style={styles.path}>
              {endpoint.path}
              {endpoint.needsKey ? '  🔑' : ''}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.body}>Only /check is public. 🔑 marks endpoints that need an API key.</Text>

      <Text style={[styles.eyebrow, styles.section]}>EMERGENCY</Text>
      <Text style={styles.body}>
        If you suspect poisoning, contact your veterinarian immediately, or call the Pet
        Poison Helpline (855) 764-7661 / ASPCA Poison Control (888) 426-4435.
      </Text>

      <Text style={[styles.eyebrow, styles.section]}>DISCLAIMER</Text>
      <Text style={styles.body}>
        PetPal provides general information only and is not a substitute for professional
        veterinary care.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.parchment },
  eyebrow: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 3,
    color: colors.mist,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: space(5),
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 44,
    color: colors.ink,
  },
  body: {
    marginTop: space(5),
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    color: colors.stone,
  },
  section: { marginTop: space(10) },
  table: { marginTop: space(4), borderTopWidth: 1, borderTopColor: colors.slate },
  row: {
    flexDirection: 'row',
    gap: space(4),
    paddingVertical: space(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.slate,
  },
  method: {
    width: 48,
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    color: colors.forest,
  },
  path: { flex: 1, fontFamily: 'monospace', fontSize: 12, color: colors.charcoal },
});
