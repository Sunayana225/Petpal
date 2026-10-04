import { useState } from 'react';
import {
  Keyboard,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { foodSafetyApi } from '../api';
import Button from '../components/Button';
import Reveal from '../components/Reveal';
import { saveGeminiKey } from '../lib/geminiKey';
import { colors, fonts, space } from '../theme';

const AI_STUDIO_URL = 'https://aistudio.google.com/apikey';

const STEPS = [
  {
    title: 'Open Google AI Studio',
    body: 'Go to aistudio.google.com/apikey — tap the link below to open it.',
  },
  {
    title: 'Create an API key',
    body: 'Sign in, tap “Create API key”, then copy the value it shows.',
  },
  {
    title: 'Paste it below',
    body: 'We verify it once. It powers AI answers for you — nothing else.',
  },
];

interface Props {
  onDone: () => void;
}

/**
 * First-run screen: the visitor supplies their own Gemini key so AI fallback
 * calls use their quota. Once verified (or skipped) we drop into the checker.
 */
export default function WelcomeScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState('');
  const [state, setState] = useState<'idle' | 'checking' | 'invalid'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function verify() {
    const key = value.trim();
    if (!key) {
      setState('invalid');
      setMessage('Paste your key to continue.');
      return;
    }

    Keyboard.dismiss();
    setState('checking');
    setMessage('Checking with Google…');

    try {
      const { valid } = await foodSafetyApi.validateGeminiKey(key);
      if (valid) {
        await saveGeminiKey(key);
        onDone();
      } else {
        setState('invalid');
        setMessage('Invalid key — Google rejected it. Check it and try again.');
      }
    } catch {
      setState('invalid');
      setMessage('Could not reach the server. Check your connection and retry.');
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: insets.top + space(10),
        paddingBottom: insets.bottom + space(12),
        paddingHorizontal: space(5),
      }}
    >
      <Reveal>
        <Text style={styles.eyebrow}>GETTING STARTED</Text>
      </Reveal>
      <Reveal delay={80}>
        <Text style={styles.title}>Enter your{'\n'}Gemini API key</Text>
      </Reveal>
      <Reveal delay={140}>
        <Text style={styles.sub}>
          PetPal uses AI only for foods our veterinary database doesn’t know. Bring your own
          key and those calls are yours.
        </Text>
      </Reveal>

      <View style={styles.steps}>
        {STEPS.map((step, index) => (
          <Reveal key={step.title} delay={200 + index * 70}>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</Text>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepText}>{step.body}</Text>
              </View>
            </View>
          </Reveal>
        ))}
      </View>

      <Pressable onPress={() => Linking.openURL(AI_STUDIO_URL)}>
        <Text style={styles.link}>Open aistudio.google.com/apikey →</Text>
      </Pressable>

      <Reveal delay={420}>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="Paste your key (AIza…)"
          placeholderTextColor={colors.mist}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          spellCheck={false}
          onSubmitEditing={verify}
          returnKeyType="done"
          style={styles.input}
        />
        {message ? (
          <Text style={[styles.message, state === 'invalid' ? styles.messageError : null]}>
            {message}
          </Text>
        ) : null}

        <Button
          label={state === 'checking' ? 'Verifying…' : 'Verify & continue'}
          onPress={verify}
          disabled={state === 'checking'}
          style={styles.primary}
        />

        <Pressable onPress={onDone} style={styles.skip}>
          <Text style={styles.skipText}>Skip — use PetPal’s AI instead</Text>
        </Pressable>
      </Reveal>
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
  },
  title: {
    marginTop: space(6),
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 44,
    color: colors.ink,
  },
  sub: {
    marginTop: space(5),
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    color: colors.stone,
    maxWidth: 340,
  },
  steps: { marginTop: space(9), borderTopWidth: 1, borderTopColor: colors.slate },
  step: {
    flexDirection: 'row',
    gap: space(4),
    paddingVertical: space(5),
    borderBottomWidth: 1,
    borderBottomColor: colors.slate,
  },
  stepNumber: {
    width: 28,
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.mist,
  },
  stepBody: { flex: 1 },
  stepTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  stepText: {
    marginTop: space(1.5),
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 20,
    color: colors.stone,
  },
  link: {
    marginTop: space(5),
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.forest,
    textDecorationLine: 'underline',
  },
  input: {
    marginTop: space(7),
    borderWidth: 1,
    borderColor: colors.slate,
    paddingHorizontal: space(4),
    paddingVertical: space(3.5),
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
  },
  message: {
    marginTop: space(3),
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.stone,
  },
  messageError: { color: colors.unsafe },
  primary: { marginTop: space(5) },
  skip: { marginTop: space(5), alignSelf: 'center' },
  skipText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.mist,
  },
});
