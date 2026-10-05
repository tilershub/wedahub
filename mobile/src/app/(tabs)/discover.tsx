import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ProviderCard } from '../../components/ProviderCard';
import { useLanguage } from '../../i18n';
import { areas } from '../../data/areas';
import { professions } from '../../data/professions';
import { configured } from '../../lib/supabase';
import { searchProviders, type Provider } from '../../lib/providers';
import { theme } from '../../theme';

export default function Discover() {
  const params = useLocalSearchParams<{ q?: string; profession?: string }>();
  const initialQuery = typeof params.q === 'string' ? params.q : '';
  const profession = typeof params.profession === 'string' ? params.profession : '';
  return <DiscoveryResults key={`${profession}:${initialQuery}`} initialQuery={initialQuery} profession={profession} />;
}
function DiscoveryResults({ initialQuery, profession }: { initialQuery: string; profession: string }) {
  const { language, t } = useLanguage();
  const category = professions.find(item => item.value === profession);
  const [area, setArea] = useState('');
  const [areaOpen, setAreaOpen] = useState(false);
  const [town, setTown] = useState('');
  const [query, setQuery] = useState(initialQuery);
  const [term, setTerm] = useState(initialQuery);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState(false);
  const [more, setMore] = useState(true);
  useEffect(() => {
    if (!configured) return;
    let active = true;
    searchProviders(term, area, page, profession).then(rows => {
      if (!active) return;
      setProviders(current => page ? [...current, ...rows.slice(0, 20)] : rows.slice(0, 20));
      setMore(rows.length > 20);
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [term, page, reload, profession, area]);
  const changeArea = (next: string) => { Keyboard.dismiss(); setArea(next.trim()); setAreaOpen(false); setProviders([]); setPage(0); setLoading(true); setError(false); setMore(true); setReload(n => n + 1); };
  const search = () => { Keyboard.dismiss(); setLoading(true); setError(false); setProviders([]); setPage(0); setTerm(query.trim()); setReload(n => n + 1); };
  return <View style={styles.screen}>
    <FlatList data={providers} keyExtractor={p => p.id} renderItem={({ item }) => <ProviderCard provider={item} />}
      contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled"
      ListHeaderComponent={<>
        <Text style={styles.heading}>{category ? category[language] : t('find')}</Text>
        <Text style={styles.label}>{t('search')}</Text>
        <View style={styles.searchRow}>
          <TextInput style={styles.input} value={query} maxLength={200} onChangeText={setQuery} onSubmitEditing={search}
            placeholder={t('searchHint')} placeholderTextColor={theme.placeholder} returnKeyType="search" autoCapitalize="none" accessibilityLabel={t('search')} />
          <Pressable onPress={search} style={styles.searchButton} accessibilityRole="button"><Text style={styles.searchText}>{t('searchButton')}</Text></Pressable>
        </View>
        <Pressable style={styles.areaButton} onPress={() => setAreaOpen(!areaOpen)} accessibilityRole="button" accessibilityState={{ expanded: areaOpen }}>
          <Text style={styles.label}>{t('workArea')}: {areas.find(item => item.value === area)?.[language] || area || t('allSriLanka')}</Text>
          <Text style={styles.areaLink}>{t('changeArea')} ▾</Text>
        </Pressable>
        {areaOpen && <View style={styles.areaPanel}>
          <Text style={styles.scope}>{t('areaHelp')}</Text>
          <View style={styles.areaChoices}>
            <Pressable style={styles.areaChoice} onPress={() => changeArea('')} accessibilityRole="button" accessibilityState={{ selected: !area }}><Text>{t('allSriLanka')}</Text></Pressable>
            {areas.map(item => <Pressable key={item.value} style={[styles.areaChoice, area === item.value && styles.selectedArea]} onPress={() => changeArea(item.value)} accessibilityRole="button" accessibilityState={{ selected: area === item.value }}><Text>{item[language]}</Text></Pressable>)}
          </View>
          <TextInput style={styles.input} value={town} onChangeText={setTown} placeholder={t('areaTown')} accessibilityLabel={t('areaTown')} onSubmitEditing={() => changeArea(town)} />
          <Pressable style={styles.areaChoice} onPress={() => changeArea(town)} accessibilityRole="button"><Text>{t('applyArea')}</Text></Pressable>
        </View>}
        <Text style={styles.scope}>{t('sortEvidence')}</Text>
        {!configured && <Text style={styles.notice}>{t('setup')}</Text>}
        {error && <Pressable onPress={() => { setLoading(true); setError(false); setPage(0); setTerm(query.trim()); setReload(n => n + 1); }} accessibilityRole="button"><Text style={styles.notice}>{t('retry')}</Text></Pressable>}
      </>}
      ListEmptyComponent={configured && !loading && !error ? <Text style={styles.empty}>{t('empty')}</Text> : null}
      ListFooterComponent={loading ? <ActivityIndicator color={theme.goldText} style={styles.spinner} /> : null}
      onEndReached={() => { if (configured && more && !loading && !error) { setLoading(true); setPage(p => p + 1); } }} onEndReachedThreshold={0.4}
    />
  </View>;
}
const styles = StyleSheet.create({
  areaButton: { marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, minHeight: 54 },
  areaLink: { color: theme.goldText, fontWeight: '700' }, areaPanel: { paddingVertical: 12, gap: 12 },
  areaChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  areaChoice: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: theme.line, borderRadius: 10, backgroundColor: theme.white, justifyContent: 'center' },
  selectedArea: { borderColor: theme.goldText, borderWidth: 2 },
  screen: { flex: 1, backgroundColor: theme.paper }, content: { padding: 18, paddingBottom: 40 },
  hero: { marginHorizontal: -18, marginTop: -18, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 30, backgroundColor: theme.ink },
  tagline: { color: theme.gold, fontSize: 11, letterSpacing: 1.2 },
  heading: { color: theme.ink, fontSize: 25, fontWeight: '800', marginBottom: 20 },
  quickActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  quickCard: { flex: 1, minHeight: 110, backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 12, padding: 14 },
  quickTitle: { color: theme.ink, fontSize: 17, fontWeight: '700' }, quickBody: { color: theme.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  langRow: { flexDirection: 'row', gap: 8, marginVertical: 20 }, langButton: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: theme.line },
  activeLang: { backgroundColor: theme.ink, borderColor: theme.ink }, langText: { color: theme.ink, fontSize: 14 }, activeLangText: { color: theme.white },
  label: { color: theme.ink, fontWeight: '700', fontSize: 16, marginBottom: 8 }, searchRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, minHeight: 54, borderWidth: 1, borderColor: theme.line, borderRadius: 10, paddingHorizontal: 14, backgroundColor: theme.white, fontSize: 16 },
  searchButton: { backgroundColor: theme.ink, borderRadius: 10, paddingHorizontal: 18, minHeight: 54, justifyContent: 'center' }, searchText: { color: theme.white, fontWeight: '700' },
  scope: { color: theme.muted, marginVertical: 16 }, notice: { color: theme.error, fontSize: 15, marginVertical: 14 },
  empty: { color: theme.muted, fontSize: 16, paddingVertical: 30, textAlign: 'center' }, spinner: { marginVertical: 20 },
});
