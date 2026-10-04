import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, ApiError } from '../api';
import { CATEGORY_META, PETS } from '../pets';
import { colors, fonts, space } from '../theme';
import type { FoodCategory, FoodItem } from '../types';

const CATEGORIES: FoodCategory[] = ['safe', 'caution', 'unsafe'];

const FETCHERS = {
  safe: api.getSafeFoods,
  caution: api.getCautionFoods,
  unsafe: api.getUnsafeFoods,
} as const;

export default function BrowseScreen() {
  const insets = useSafeAreaInsets();
  const [pet, setPet] = useState('dogs');
  const [category, setCategory] = useState<FoodCategory>('safe');
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    FETCHERS[category](pet)
      .then((response) => {
        if (cancelled) return;
        setItems(response.safeFoods ?? response.cautionFoods ?? response.unsafeFoods ?? []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setItems([]);
        setError(err instanceof ApiError ? err.message : 'Could not load foods.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pet, category]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + space(8) }]}>
        <Text style={styles.eyebrow}>THE LIBRARY</Text>
        <Text style={styles.title}>Every food{'\n'}on record.</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {PETS.map((item) => {
            const active = item.key === pet;
            return (
              <Pressable
                key={item.key}
                onPress={() => setPet(item.key)}
                style={[styles.chip, active ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.tabs}>
          {CATEGORIES.map((item) => {
            const active = item === category;
            return (
              <Pressable key={item} onPress={() => setCategory(item)} style={styles.tab}>
                <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
                  {CATEGORY_META[item].label.toUpperCase()}
                </Text>
                {active ? <View style={styles.tabRule} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.forest} style={styles.center} />
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !error ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.food}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.food}</Text>
              <Text style={styles.cardDesc} numberOfLines={3}>
                {item.description}
              </Text>
              {item.source ? <Text style={styles.cardMeta}>{item.source}</Text> : null}
            </View>
          )}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.parchment },
  header: { paddingHorizontal: space(5), paddingBottom: space(2) },
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
    fontSize: 38,
    lineHeight: 42,
    color: colors.ink,
  },
  chipRow: { gap: space(2), paddingVertical: space(5) },
  chip: { borderWidth: 1, borderColor: colors.slate, paddingHorizontal: space(3.5), paddingVertical: space(2) },
  chipActive: { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
  chipText: { fontFamily: fonts.sans, fontSize: 12, color: colors.charcoal },
  chipTextActive: { color: colors.parchment },
  tabs: { flexDirection: 'row', gap: space(8), borderBottomWidth: 1, borderBottomColor: colors.slate },
  tab: { paddingVertical: space(3) },
  tabText: { fontFamily: fonts.sans, fontSize: 11, letterSpacing: 2, color: colors.stone },
  tabTextActive: { color: colors.ink },
  tabRule: { height: 1, backgroundColor: colors.ink, marginTop: space(2) },
  center: { marginTop: space(12) },
  error: {
    marginTop: space(10),
    marginHorizontal: space(5),
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.unsafe,
  },
  list: { paddingHorizontal: space(5), paddingTop: space(4), paddingBottom: space(12) },
  separator: { height: 1, backgroundColor: colors.slate },
  card: { paddingVertical: space(5) },
  cardTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.ink, textTransform: 'capitalize' },
  cardDesc: { marginTop: space(2), fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, color: colors.stone },
  cardMeta: {
    marginTop: space(3),
    fontFamily: fonts.sans,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.mist,
  },
});
