import { Link, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text } from 'react-native';
import { LanguageProvider, useLanguage } from '../i18n';
import { theme } from '../theme';

export default function Layout() {
  return <LanguageProvider>
    <StatusBar style="light" />
    <AppStack />
  </LanguageProvider>;
}

function BrandTitle() {
  return <Text style={styles.brand}>වැඩ<Text style={styles.gold}>HUB</Text></Text>;
}

function AppStack() {
  const { t } = useLanguage();
  return <Stack screenOptions={{ headerStyle: { backgroundColor: theme.ink }, headerTintColor: theme.white,
    headerTitleStyle: { fontWeight: '700' }, headerShadowVisible: false,
    contentStyle: { backgroundColor: theme.paper } }}>
    <Stack.Screen name="index" options={{ headerTitle: () => <BrandTitle />,
      headerRight: () => <Link href="/account" asChild><Pressable style={styles.account} accessibilityRole="button"
        accessibilityLabel={t('account')}><Text numberOfLines={1} style={styles.accountText}>{t('account')}</Text></Pressable></Link> }} />
    <Stack.Screen name="provider/[slug]" options={{ title: t('profile') }} />
    <Stack.Screen name="account" options={{ title: t('account') }} />
    <Stack.Screen name="my-profiles" options={{ title: t('myProfiles') }} />
  </Stack>;
}

const styles = StyleSheet.create({
  brand: { color: theme.white, fontSize: 23, fontWeight: '800' },
  gold: { color: theme.gold },
  account: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8, maxWidth: 140 },
  accountText: { color: theme.gold, fontSize: 14, fontWeight: '700' },
});
