import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, type ViewStyle } from 'react-native';

/**
 * Fade-and-lift an element in on mount. Uses the core Animated API so the app
 * needs no extra native modules for its entrance motion.
 */
export default function Reveal({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: ViewStyle | ViewStyle[];
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 700,
      delay,
      useNativeDriver: true,
    }).start();
  }, [progress, delay]);

  return (
    <Animated.View
      style={[
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }),
            },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
