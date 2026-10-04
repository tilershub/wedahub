import { SessionBoundary } from '../components/SessionBoundary';
import { Link, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text } from 'react-native';
import { LanguageProvider, useLanguage } from '../i18n';
import { ModeProvider } from '../mode';
import { theme } from '../theme';

export default function Layout() {
  return <LanguageProvider><ModeProvider>
    <StatusBar style="dark" />
    <SessionBoundary><AppStack /></SessionBoundary>
  </ModeProvider></LanguageProvider>;
}

function BrandTitle() {
  return <Text style={styles.brand}>වැඩ<Text style={styles.gold}>HUB</Text></Text>;
}

function AppStack() {
  const { t } = useLanguage();
  return <Stack screenOptions={{ headerStyle: { backgroundColor: theme.paper }, headerTintColor: theme.ink,
    headerTitleStyle: { fontWeight: '700' }, headerShadowVisible: false,
    contentStyle: { backgroundColor: theme.paper } }}>
    <Stack.Screen name="(tabs)" options={{ headerTitle: () => <BrandTitle />, headerRight: () => <Link href="/notifications" asChild><Pressable accessibilityRole="button" accessibilityLabel={t('notifications')} style={styles.inbox}><Text style={styles.inboxText}>{t('notifications')}</Text></Pressable></Link> }} />
    <Stack.Screen name="provider/[slug]" options={{ title: t('profile') }} />
    <Stack.Screen name="credentials" options={{ title: t('credentials') }} />
    <Stack.Screen name="notifications" options={{ title: t('notifications') }} />
    <Stack.Screen name="my-profiles" options={{ title: t('myProfiles') }} />
    <Stack.Screen name="register-provider" options={{ title: t('registerProvider') }} />
  </Stack>;
}

const styles = StyleSheet.create({
  inbox: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 10 },
  inboxText: { color: theme.ink, fontSize: 14, fontWeight: '700' },
  brand: { color: theme.ink, fontSize: 23, fontWeight: '800' },
  gold: { color: theme.goldText },
});
