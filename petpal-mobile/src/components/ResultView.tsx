import { StyleSheet, Text, View } from 'react-native';

import { SAFETY_META } from '../pets';
import { colors, fonts, space } from '../theme';
import type { FoodSafetyResult } from '../types';
import Reveal from './Reveal';
import SafetyBadge from './SafetyBadge';

function Section({
  title,
  items,
  color,
}: {
  title: string;
  items?: string[];
  color?: string;
}) {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>{title.toUpperCase()}</Text>
      {items.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <View style={[styles.dash, color ? { backgroundColor: color } : null]} />
          <Text style={[styles.bulletText, color ? { color } : null]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export default function ResultView({ result }: { result: FoodSafetyResult }) {
  const meta = SAFETY_META[result.safety];
  const details = result.details;

  return (
    <Reveal>
      <View style={[styles.topRule, { backgroundColor: meta.color }]} />

      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.eyebrow}>VERDICT</Text>
          <Text style={[styles.verdict, { color: meta.color }]}>{meta.label}</Text>
          <Text style={styles.subject}>
            {result.pet} · {result.food}
          </Text>
        </View>
        <SafetyBadge safety={result.safety} />
      </View>

      <Text style={styles.message}>{result.message}</Text>
      {details?.description && details.description !== result.message ? (
        <Text style={styles.description}>{details.description}</Text>
      ) : null}

      <Section title="Warning signs" items={details?.symptoms} color={colors.unsafe} />
      <Section title="Benefits" items={details?.benefits} color={colors.safe} />
      <Section title="Safer alternatives" items={details?.alternatives} />
      {details?.preparation ? (
        <Section title="How to prepare" items={[details.preparation]} />
      ) : null}

      {details?.recommendation ? (
        <View style={styles.advice}>
          <Text style={styles.eyebrow}>VET-MINDED ADVICE</Text>
          <Text style={styles.adviceText}>{details.recommendation}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.footerText}>SOURCE · {result.source ?? 'unknown'}</Text>
        {result.processingTime ? (
          <Text style={styles.footerText}>{result.processingTime}</Text>
        ) : null}
      </View>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  topRule: { height: 2, width: '100%' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: space(6),
  },
  headerLeft: { flex: 1, paddingRight: space(4) },
  eyebrow: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: colors.mist,
  },
  verdict: {
    fontFamily: fonts.display,
    fontSize: 44,
    lineHeight: 50,
    marginTop: space(2),
  },
  subject: {
    marginTop: space(2),
    fontFamily: fonts.sans,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.stone,
  },
  message: {
    marginTop: space(7),
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 30,
    color: colors.ink,
  },
  description: {
    marginTop: space(4),
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    color: colors.stone,
  },
  section: { marginTop: space(8) },
  bulletRow: { flexDirection: 'row', marginTop: space(2), alignItems: 'flex-start' },
  dash: { width: 12, height: 1, marginTop: space(2.5), marginRight: space(3), backgroundColor: colors.mist },
  bulletText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: colors.charcoal,
  },
  advice: {
    marginTop: space(8),
    borderLeftWidth: 2,
    borderLeftColor: colors.forest,
    paddingLeft: space(4),
  },
  adviceText: {
    marginTop: space(2),
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: colors.charcoal,
  },
  footer: {
    marginTop: space(8),
    borderTopWidth: 1,
    borderTopColor: colors.slate,
    paddingTop: space(4),
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(4),
  },
  footerText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.mist,
  },
});
