import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, fonts, space } from '../theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
  style?: ViewStyle;
}

/** A square-cornered action button that settles politely on press. */
export default function Button({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
  style,
}: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 0 }).start();

  const primary = variant === 'primary';

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => animate(0.97)}
        onPressOut={() => animate(1)}
        style={[
          styles.base,
          primary ? styles.primary : styles.ghost,
          disabled ? styles.disabled : null,
        ]}
      >
        <Text style={[styles.label, primary ? styles.labelPrimary : styles.labelGhost]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    paddingVertical: space(3.5),
    paddingHorizontal: space(7),
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
  ghost: { backgroundColor: 'transparent', borderColor: colors.slate },
  disabled: { opacity: 0.5 },
  label: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  labelPrimary: { color: colors.parchment },
  labelGhost: { color: colors.charcoal },
});
