import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import BrowseScreen from './src/screens/BrowseScreen';
import CheckerScreen from './src/screens/CheckerScreen';
import InfoScreen from './src/screens/InfoScreen';
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

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        <StatusBar style="dark" />
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
          <Tab.Screen
            name="Checker"
            component={CheckerScreen}
            options={{ tabBarIcon: tabIcon('🐾') }}
          />
          <Tab.Screen
            name="Browse"
            component={BrowseScreen}
            options={{ tabBarIcon: tabIcon('📚') }}
          />
          <Tab.Screen
            name="Info"
            component={InfoScreen}
            options={{ tabBarIcon: tabIcon('ℹ') }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
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
