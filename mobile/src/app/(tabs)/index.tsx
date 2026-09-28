import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { professions } from '../../data/professions';
import { useLanguage, type Language } from '../../i18n';
import { useMode } from '../../mode';
import { theme } from '../../theme';

const groups = [
  { key: 'buildingServices', icon: '▦', services: ['tiler', 'mason', 'contractor', 'construction_company', 'architect', 'interior_designer', 'welder'] },
  { key: 'homeServices', icon: '⌂', services: ['plumber', 'electrician', 'carpenter', 'painter', 'cleaner', 'gardener', 'technician', 'general_worker'] },
  { key: 'learningServices', icon: '▤', services: ['tutor', 'fitness_trainer'] },
  { key: 'transportServices', icon: '↗', services: ['driver', 'mover', 'mechanic', 'workshop'] },
  { key: 'eventServices', icon: '✧', services: ['caterer', 'event_provider', 'photographer'] },
  { key: 'moreServices', icon: '＋', services: ['it_specialist', 'digital_professional', 'business_professional', 'beauty_professional', 'tailor', 'caregiver', 'pet_service', 'other_service'] },
] as const;
const languages: { value: Language; label: string }[] = [
  { value: 'si', label: 'සිංහල' }, { value: 'ta', label: 'தமிழ்' }, { value: 'en', label: 'English' },
];

export default function Home() {
  const { t, language, setLanguage } = useLanguage();
  const { mode, setMode } = useMode();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const selectedGroup = groups.find(item => item.key === group);
  const search = () => { Keyboard.dismiss(); router.push({ pathname: '/discover', params: { q: query.trim() } }); };
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.modeRow}>{(['customer', 'provider'] as const).map(value => <Pressable key={value} onPress={() => setMode(value)} style={[styles.mode, mode === value && styles.activeMode]} accessibilityRole="button" accessibilityState={{ selected: mode === value }}><Text style={[styles.modeText, mode === value && styles.whiteText]}>{t(value === 'customer' ? 'homeownerShort' : 'providerShort')}</Text></Pressable>)}</View>
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>{t(mode === 'customer' ? 'homeownerWorkspace' : 'providerWorkspace')}</Text>
      <Text style={styles.heading}>{t(mode === 'customer' ? 'homeownerHeadline' : 'providerHeadline')}</Text>
      <Text style={styles.heroBody}>{t(mode === 'customer' ? 'homeownerHomeHelp' : 'providerHomeHelp')}</Text>
    </View>
    {mode === 'customer' ? <>
      <View style={styles.searchRow}><TextInput style={styles.input} value={query} onChangeText={setQuery} onSubmitEditing={search} placeholder={t('searchHint')} placeholderTextColor={theme.muted} accessibilityLabel={t('search')} returnKeyType="search" /><Pressable style={styles.searchButton} onPress={search} accessibilityRole="button"><Text style={styles.whiteText}>{t('searchButton')}</Text></Pressable></View>
      <Link href="/jobs" asChild><Pressable style={styles.primary} accessibilityRole="button"><Text style={styles.primaryTitle}>{t('postJob')}</Text><Text style={styles.primaryBody}>{t('postJobHelp')}</Text></Pressable></Link>
      <Text style={styles.section}>{t('browseServices')}</Text>
      <View style={styles.grid}>{groups.map(item => <Pressable key={item.key} style={[styles.category, group === item.key && styles.selectedCategory]} onPress={() => setGroup(group === item.key ? null : item.key)} accessibilityRole="button" accessibilityState={{ expanded: group === item.key }}><Text style={styles.icon}>{item.icon}</Text><Text style={styles.cardTitle}>{t(item.key)}</Text></Pressable>)}</View>
      {selectedGroup && <View style={styles.serviceList}><Text style={styles.section}>{t(selectedGroup.key)}</Text>{selectedGroup.services.map(id => {
        const item = professions.find(entry => entry.value === id);
        return item ? <Link key={id} href={{ pathname: '/discover', params: { profession: id } }} asChild><Pressable style={styles.service} accessibilityRole="button"><Text style={styles.serviceText}>{item[language]}</Text><Text style={styles.arrow}>→</Text></Pressable></Link> : null;
      })}</View>}
      <Link href="/discover" style={styles.link}>{t('browseAllProviders')} →</Link>
      <Link href="/projects" asChild><Pressable style={styles.card} accessibilityRole="button"><Text style={styles.cardTitle}>{t('myProjects')}</Text><Text style={styles.cardBody}>{t('projectsQuickHelp')}</Text></Pressable></Link>
    </> : <>
      <Link href="/jobs" asChild><Pressable style={styles.primary} accessibilityRole="button"><Text style={styles.primaryTitle}>{t('browseJobs')} →</Text><Text style={styles.primaryBody}>{t('providerJobsIntro')}</Text></Pressable></Link>
      <Text style={styles.section}>{t('manageWork')}</Text>
      <Link href="/projects" asChild><Pressable style={styles.card} accessibilityRole="button"><Text style={styles.cardTitle}>{t('myApplications')}</Text><Text style={styles.cardBody}>{t('providerProjectsIntro')}</Text></Pressable></Link>
      <Link href="/my-profiles" asChild><Pressable style={styles.card} accessibilityRole="button"><Text style={styles.cardTitle}>{t('myProfiles')}</Text><Text style={styles.cardBody}>{t('profileQuickHelp')}</Text></Pressable></Link>
      <Link href="/register-provider" asChild><Pressable style={styles.card} accessibilityRole="button"><Text style={styles.cardTitle}>{t('registerProvider')}</Text><Text style={styles.cardBody}>{t('registrationHomeHelp')}</Text></Pressable></Link>
      <Pressable onPress={() => setMode('customer')} accessibilityRole="button"><Text style={styles.link}>{t('needToHire')} →</Text></Pressable>
    </>}
    <View style={styles.languageRow}>{languages.map(item => <Pressable key={item.value} onPress={() => setLanguage(item.value)} style={[styles.language, language === item.value && styles.selectedCategory]} accessibilityRole="button" accessibilityState={{ selected: language === item.value }}><Text style={styles.modeText}>{item.label}</Text></Pressable>)}</View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.paper }, content: { padding: 18, paddingBottom: 36, width: '100%', maxWidth: 900, alignSelf: 'center' },
  modeRow: { flexDirection: 'row', gap: 6, backgroundColor: theme.line, padding: 4, borderRadius: 12, marginBottom: 18 }, mode: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 9, padding: 8 }, activeMode: { backgroundColor: theme.ink }, modeText: { color: theme.ink, fontSize: 15, fontWeight: '600' }, whiteText: { color: theme.white, fontWeight: '700' },
  hero: { paddingVertical: 9, marginBottom: 12 }, eyebrow: { color: theme.goldText, fontSize: 13, fontWeight: '700' }, heading: { color: theme.ink, fontSize: 29, fontWeight: '800', marginTop: 9, lineHeight: 39 }, heroBody: { color: theme.muted, fontSize: 16, lineHeight: 24, marginTop: 10 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 18 }, input: { flex: 1, minHeight: 54, backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 10, padding: 12, fontSize: 16 }, searchButton: { backgroundColor: theme.ink, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 10 },
  primary: { backgroundColor: theme.ink, borderRadius: 15, padding: 22, marginBottom: 20, minHeight: 110 }, primaryTitle: { color: theme.white, fontSize: 21, fontWeight: '700' }, primaryBody: { color: theme.gold, fontSize: 15, lineHeight: 23, marginTop: 8 },
  section: { color: theme.ink, fontSize: 20, fontWeight: '700', marginVertical: 12 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, category: { width: '48%', flexGrow: 1, minHeight: 114, borderRadius: 12, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.white, padding: 15 }, selectedCategory: { borderColor: theme.goldText, backgroundColor: '#F3EBDF' }, icon: { fontSize: 26, color: theme.goldText, marginBottom: 9 }, cardTitle: { color: theme.ink, fontSize: 17, fontWeight: '700', lineHeight: 25 },
  card: { padding: 19, backgroundColor: theme.white, borderRadius: 12, borderWidth: 1, borderColor: theme.line, marginBottom: 12, minHeight: 90 }, cardBody: { color: theme.muted, fontSize: 15, lineHeight: 22, marginTop: 7 }, serviceList: { marginTop: 10 }, service: { flexDirection: 'row', alignItems: 'center', minHeight: 56, padding: 15, backgroundColor: theme.white, borderBottomWidth: 1, borderBottomColor: theme.line }, serviceText: { flex: 1, color: theme.ink, fontSize: 16 }, arrow: { color: theme.goldText, fontSize: 22 }, link: { color: theme.goldText, fontSize: 16, fontWeight: '700', paddingVertical: 18 },
  languageRow: { flexDirection: 'row', gap: 8, marginTop: 20 }, language: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: theme.line },
});
