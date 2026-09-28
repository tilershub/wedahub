import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useLanguage } from '../../i18n';
import { useMode } from '../../mode';
import { theme } from '../../theme';

export default function TabLayout() {
  const { t } = useLanguage();
  const { mode } = useMode();
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.goldText,
    tabBarInactiveTintColor: theme.muted, tabBarStyle: { backgroundColor: theme.white, borderTopColor: theme.line, minHeight: 62 },
    tabBarLabelStyle: { fontSize: 12, fontWeight: '700', paddingBottom: 5 }, tabBarItemStyle: { minHeight: 54 } }}>
    <Tabs.Screen name="index" options={{ title: t('home'), tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>⌂</Text> }} />
    <Tabs.Screen name="jobs" options={{ title: mode === 'provider' ? t('opportunities') : t('jobs'), tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>▤</Text> }} />
    <Tabs.Screen name="projects" options={{ title: t('projects'), tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>▣</Text> }} />
    <Tabs.Screen name="account" options={{ title: t('account'), tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>◉</Text> }} />
  </Tabs>;
}
