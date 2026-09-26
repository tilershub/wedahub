import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LanguageProvider } from '../i18n';
import { theme } from '../theme';

export default function Layout() {
  return <LanguageProvider>
    <StatusBar style="light" />
    <Stack screenOptions={{ headerStyle: { backgroundColor: theme.ink }, headerTintColor: theme.white,
      contentStyle: { backgroundColor: theme.paper }, headerTitle: 'වැඩHUB' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="provider/[slug]" />
      <Stack.Screen name="account" />
    </Stack>
  </LanguageProvider>;
}
