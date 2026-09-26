import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ProviderCard } from '../components/ProviderCard';
import { useLanguage, type Language } from '../i18n';
import { configured } from '../lib/supabase';
import { searchProviders, type Provider } from '../lib/providers';
import { theme } from '../theme';

const languages: { value: Language; label: string }[] = [
  { value: 'si', label: 'සිංහල' }, { value: 'ta', label: 'தமிழ்' }, { value: 'en', label: 'English' },
];
export default function Home() {
  const { language, setLanguage, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [term, setTerm] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState(false);
  const [more, setMore] = useState(true);
  useEffect(() => {
    if (!configured) return;
    let active = true;
    searchProviders(term, '', page).then(rows => {
      if (!active) return;
      setProviders(current => page ? [...current, ...rows.slice(0, 20)] : rows.slice(0, 20));
      setMore(rows.length > 20);
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [term, page, reload]);
  const search = () => { Keyboard.dismiss(); setLoading(true); setError(false); setPage(0); setTerm(query); setReload(n => n + 1); };
  return <SafeAreaView style={styles.screen}>
    <FlatList data={providers} keyExtractor={p => p.id} renderItem={({ item }) => <ProviderCard provider={item} />}
      contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
      ListHeaderComponent={<>
        <View style={styles.hero}>
          <Text style={styles.wordmark}>වැඩ<Text style={{ color: theme.gold }}>HUB</Text></Text>
          <Text style={styles.tagline}>{t('tagline')}</Text>
          <Text style={styles.heading}>{t('find')}</Text>
          <Link href="/account" asChild><Pressable style={styles.account} accessibilityRole="button"><Text style={styles.accountText}>{t('account')} →</Text></Pressable></Link>
        </View>
        <View style={styles.langRow} accessibilityLabel={t('selectLanguage')}>
          {languages.map(item => <Pressable key={item.value} onPress={() => setLanguage(item.value)} accessibilityRole="button"
            accessibilityState={{ selected: language === item.value }} style={[styles.langButton, language === item.value && styles.activeLang]}>
            <Text style={[styles.langText, language === item.value && styles.activeLangText]}>{item.label}</Text>
          </Pressable>)}
        </View>
        <Text style={styles.label}>{t('search')}</Text>
        <View style={styles.searchRow}>
          <TextInput style={styles.input} value={query} onChangeText={setQuery} onSubmitEditing={search}
            placeholder={t('searchHint')} placeholderTextColor="#777" returnKeyType="search" autoCapitalize="none" accessibilityLabel={t('search')} />
          <Pressable onPress={search} style={styles.searchButton} accessibilityRole="button"><Text style={styles.searchText}>{t('searchButton')}</Text></Pressable>
        </View>
        <Text style={styles.scope}>{t('allIsland')}</Text>
        {!configured && <Text style={styles.notice}>{t('setup')}</Text>}
        {error && <Pressable onPress={() => { setLoading(true); setError(false); setPage(0); setTerm(query.trim()); setReload(n => n + 1); }} accessibilityRole="button"><Text style={styles.notice}>{t('retry')}</Text></Pressable>}
      </>}
      ListEmptyComponent={configured && !loading && !error ? <Text style={styles.empty}>{t('empty')}</Text> : null}
      ListFooterComponent={loading ? <ActivityIndicator color={theme.goldText} style={styles.spinner} /> : null}
      onEndReached={() => { if (configured && more && !loading && !error) { setLoading(true); setPage(p => p + 1); } }} onEndReachedThreshold={0.4}
    />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.paper }, content: { padding: 18, paddingBottom: 40 },
  hero: { marginHorizontal: -18, marginTop: -18, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 32, backgroundColor: theme.ink },
  wordmark: { color: theme.white, fontSize: 38, fontWeight: '800' }, tagline: { color: theme.gold, fontSize: 11, letterSpacing: 1.2, marginTop: 5 },
  heading: { color: theme.white, fontSize: 23, fontWeight: '700', marginTop: 34 },
  account: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center', marginTop: 12 }, accountText: { color: theme.gold, fontSize: 16, fontWeight: '700' },
  langRow: { flexDirection: 'row', gap: 8, marginVertical: 20 }, langButton: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: theme.line },
  activeLang: { backgroundColor: theme.ink, borderColor: theme.ink }, langText: { color: theme.ink, fontSize: 14 }, activeLangText: { color: theme.white },
  label: { color: theme.ink, fontWeight: '700', fontSize: 16, marginBottom: 8 }, searchRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, minHeight: 54, borderWidth: 1, borderColor: theme.line, borderRadius: 10, paddingHorizontal: 14, backgroundColor: theme.white, fontSize: 16 },
  searchButton: { backgroundColor: theme.ink, borderRadius: 10, paddingHorizontal: 18, minHeight: 54, justifyContent: 'center' }, searchText: { color: theme.white, fontWeight: '700' },
  scope: { color: theme.muted, marginVertical: 16 }, notice: { color: theme.error, fontSize: 15, marginVertical: 14 },
  empty: { color: theme.muted, fontSize: 16, paddingVertical: 30, textAlign: 'center' }, spinner: { marginVertical: 20 },
});
