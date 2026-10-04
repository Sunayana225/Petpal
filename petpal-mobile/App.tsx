import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { isOnboarded, loadGeminiKey, markOnboarded } from './src/lib/geminiKey';
import BrowseScreen from './src/screens/BrowseScreen';
import CheckerScreen from './src/screens/CheckerScreen';
import InfoScreen from './src/screens/InfoScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import { colors, fonts, space } from './src/theme';

const Tab = createBottomTabNavigator();

const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.parchment,
    card: colors.parchment,
    text: colors.charcoal,
    border: colors.slate,
    primary: colors.forest,
  },
};

const tabIcon =
  (emoji: string) =>
  () => <Text style={styles.icon}>{emoji}</Text>;

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.mist,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tab.Screen name="Checker" component={CheckerScreen} options={{ tabBarIcon: tabIcon('🐾') }} />
      <Tab.Screen name="Browse" component={BrowseScreen} options={{ tabBarIcon: tabIcon('📚') }} />
      <Tab.Screen name="Info" component={InfoScreen} options={{ tabBarIcon: tabIcon('ℹ') }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    (async () => {
      await loadGeminiKey();
      setOnboarded(await isOnboarded());
      setReady(true);
    })().catch(() => setReady(true));
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {!ready ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.forest} />
        </View>
      ) : onboarded ? (
        <NavigationContainer theme={navigationTheme}>
          <Tabs />
        </NavigationContainer>
      ) : (
        <WelcomeScreen
          onDone={async () => {
            await markOnboarded();
            setOnboarded(true);
          }}
        />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.parchment,
  },
  icon: { fontSize: 16 },
  tabBar: {
    backgroundColor: colors.parchment,
    borderTopColor: colors.slate,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: 64,
    paddingTop: space(2),
    paddingBottom: space(2),
  },
  tabLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  tabItem: { paddingVertical: space(1) },
});
