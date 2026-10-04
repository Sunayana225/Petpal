import { useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, ApiError } from '../api';
import Button from '../components/Button';
import Reveal from '../components/Reveal';
import ResultView from '../components/ResultView';
import { PETS } from '../pets';
import { colors, fonts, space } from '../theme';
import type { FoodSafetyResult } from '../types';

const QUICK_TRIES = ['chocolate', 'apple', 'grapes', 'carrot'];

export default function CheckerScreen() {
  const insets = useSafeAreaInsets();
  const [pet, setPet] = useState('dogs');
  const [food, setFood] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FoodSafetyResult | null>(null);

  async function submit() {
    const trimmed = food.trim();
    if (!trimmed) {
      setError('Enter a food name to check.');
      setResult(null);
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      setResult(await api.checkFoodSafety(pet, trimmed));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: insets.top + space(8),
        paddingBottom: space(12),
        paddingHorizontal: space(5),
      }}
    >
      <Reveal>
        <Text style={styles.eyebrow}>VETERINARY FOOD SAFETY · TEN SPECIES</Text>
      </Reveal>
      <Reveal delay={80}>
        <Text style={styles.title}>Can my pet{'\n'}eat this?</Text>
      </Reveal>
      <Reveal delay={160}>
        <Text style={styles.sub}>
          Instant answers from veterinary data, with an AI fallback — and the source
          always stated.
        </Text>
      </Reveal>

      <Reveal delay={220}>
        <Text style={[styles.eyebrow, styles.mt]}>01 — WHO IS EATING?</Text>
        <View style={styles.chips}>
          {PETS.map((item) => {
            const active = item.key === pet;
            return (
              <Pressable
                key={item.key}
                onPress={() => setPet(item.key)}
                style={[styles.chip, active ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                  {item.emoji}  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Reveal>

      <Reveal delay={280}>
        <Text style={[styles.eyebrow, styles.mt]}>02 — WHAT FOOD?</Text>
        <TextInput
          value={food}
          onChangeText={setFood}
          onSubmitEditing={submit}
          returnKeyType="search"
          autoCapitalize="none"
          placeholder="Chocolate, salmon, bell peppers…"
          placeholderTextColor={colors.mist}
          style={styles.input}
        />
        <View style={styles.quickRow}>
          {QUICK_TRIES.map((item) => (
            <Pressable key={item} onPress={() => setFood(item)}>
              <Text style={styles.quick}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <Button
          label={loading ? 'Checking…' : 'Check safety'}
          onPress={submit}
          disabled={loading}
          style={styles.submit}
        />
      </Reveal>

      {error ? <Text style={[styles.error, styles.mt]}>{error}</Text> : null}
      {loading ? <Text style={[styles.loading, styles.mt]}>Consulting the database…</Text> : null}
      {result ? (
        <View style={styles.mt}>
          <ResultView result={result} />
        </View>
      ) : null}
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
    marginTop: space(6),
    fontFamily: fonts.display,
    fontSize: 52,
    lineHeight: 56,
    color: colors.ink,
  },
  sub: {
    marginTop: space(5),
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    color: colors.stone,
    maxWidth: 320,
  },
  mt: { marginTop: space(9) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginTop: space(4) },
  chip: { borderWidth: 1, borderColor: colors.slate, paddingHorizontal: space(3.5), paddingVertical: space(2.5) },
  chipActive: { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
  chipText: { fontFamily: fonts.sans, fontSize: 12, color: colors.charcoal },
  chipTextActive: { color: colors.parchment },
  input: {
    marginTop: space(4),
    borderWidth: 1,
    borderColor: colors.slate,
    paddingHorizontal: space(4),
    paddingVertical: space(3.5),
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.ink,
  },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space(4), marginTop: space(4) },
  quick: {
    fontFamily: fonts.sans,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.stone,
    textDecorationLine: 'underline',
  },
  submit: { marginTop: space(6) },
  error: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.unsafe,
    borderLeftWidth: 2,
    borderLeftColor: colors.unsafe,
    paddingLeft: space(4),
  },
  loading: { fontFamily: fonts.sans, fontSize: 14, color: colors.mist, fontStyle: 'italic' },
});
