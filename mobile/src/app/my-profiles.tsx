import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLanguage } from '../i18n';
import { configured, supabase } from '../lib/supabase';
import { ownedProfiles, setProviderSkill, skillCatalogue, skillName, skillPath, type OwnedProfile, type Skill } from '../lib/skills';
import { ServiceAreaEditor } from '../components/ServiceAreaEditor';
import { theme } from '../theme';

export default function MyProfiles() {
  const { t, language } = useLanguage();
  const [profiles, setProfiles] = useState<OwnedProfile[]>([]);
  const [catalogue, setCatalogue] = useState<Skill[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reload, setReload] = useState(0);
  const generation = useRef(0);
  const savingRef = useRef(false);
  useFocusEffect(useCallback(() => {
    const current = ++generation.current;
    let live = true;
    setLoading(true); setFailed(false); setSaved(false); setSaveFailed(false);
    setSaving(false); savingRef.current = false;
    const load = async () => {
      if (!configured) { setSignedIn(false); setLoading(false); return; }
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!live || current !== generation.current) return;
        if (error && error.name !== 'AuthSessionMissingError') throw error;
        if (!data.user) { setSignedIn(false); setProfiles([]); return; }
        setSignedIn(true);
        const [nextProfiles, nextCatalogue] = await Promise.all([ownedProfiles(data.user.id), skillCatalogue()]);
        if (!live || current !== generation.current) return;
        setProfiles(nextProfiles); setCatalogue(nextCatalogue);
        setSelectedId(id => nextProfiles.some(p => p.id === id) ? id : null);
      } catch { if (live && current === generation.current) setFailed(true); }
      finally { if (live && current === generation.current) setLoading(false); }
    };
    void load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') {
        generation.current++; setProfiles([]); setSelectedId(null); setSignedIn(false); setLoading(false);
      }
    });
    return () => { live = false; generation.current++; subscription.unsubscribe(); };
  // The retry counter intentionally restarts the focused load.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload]));
  const profile = profiles.find(p => p.id === selectedId);
  const toggle = async (skill: Skill) => {
    if (!profile || savingRef.current) return;
    const current = generation.current;
    const selected = profile.provider_skills.some(s => s.skill_id === skill.id);
    savingRef.current = true; setSaving(true); setSaveFailed(false); setSaved(false);
    try {
      await setProviderSkill(profile.id, skill.id, !selected);
      if (current !== generation.current) return;
      setProfiles(items => items.map(p => p.id !== profile.id ? p : { ...p, provider_skills: selected
        ? p.provider_skills.filter(s => s.skill_id !== skill.id) : [...p.provider_skills, { skill_id: skill.id }] }));
      setSaved(true);
    } catch { if (current === generation.current) setSaveFailed(true); }
    finally { if (current === generation.current) { savingRef.current = false; setSaving(false); } }
  };
  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={theme.goldText} />;
  if (failed) return <View style={styles.screen}><Text style={styles.body}>{t('profileLoadFailed')}</Text><Pressable style={styles.button} onPress={() => setReload(x => x + 1)} accessibilityRole="button"><Text>{t('tryAgain')}</Text></Pressable></View>;
  if (!signedIn) return <View style={styles.screen}><Text style={styles.body}>{t('signInRequired')}</Text><Link href="/account" style={styles.button}>{t('signIn')}</Link></View>;
  if (!profile) return <FlatList contentContainerStyle={styles.screen} data={profiles} keyExtractor={p => p.id}
    ListHeaderComponent={<><Text style={styles.heading}>{t('myProfiles')}</Text><Text style={styles.body}>{t('chooseProfile')}</Text></>}
    ListEmptyComponent={<><Text style={styles.body}>{t('noOwnedProfiles')}</Text><Link href="/register-provider" style={styles.button}>{t('registerProvider')}</Link></>}
    renderItem={({ item }) => <Pressable style={styles.button} accessibilityRole="button" onPress={() => { setSelectedId(item.id); setQuery(''); setSaved(false); setSaveFailed(false); }}>
      <Text style={styles.title}>{item.name}</Text><Text style={styles.body}>{item.city} · {t(item.status === 'active' ? 'profileActive' : item.status === 'pending_review' ? 'profilePending' : 'profileInactive')}</Text>
    </Pressable>} />;
  const search = query.trim().toLocaleLowerCase();
  const visible = catalogue.filter(s => s.selectable && (s.active || profile.provider_skills.some(p => p.skill_id === s.id))
    && (!search || [skillPath(s, catalogue, 'en'), skillPath(s, catalogue, 'si'), skillPath(s, catalogue, 'ta')].some(name => name.toLocaleLowerCase().includes(search))));
  return <FlatList contentContainerStyle={styles.screen} data={visible} keyExtractor={s => s.id} keyboardShouldPersistTaps="handled"
    ListHeaderComponent={<>
      <Pressable style={styles.button} disabled={saving} onPress={() => setSelectedId(null)} accessibilityRole="button"><Text>{t('chooseProfile')}</Text></Pressable>
      <Text style={styles.heading}>{profile.name}</Text>
      {profile.status === 'active' && !!profile.slug && <Link href={{ pathname: '/provider/[slug]', params: { slug: profile.slug } }} style={styles.button}>{t('viewPublicProfile')}</Link>}
      {profile.status==='active' && !!profile.slug && <Link href={{pathname:'/provider/[slug]',params:{slug:profile.slug,edit:'1'}}} style={styles.button}>{t('editProfile')}</Link>}
      <Link href={{ pathname: '/credentials', params: { providerId: profile.id } }} style={styles.button}>{t('credentials')}</Link>
      <ServiceAreaEditor key={profile.id} providerId={profile.id} initialAreas={profile.service_areas || []} />
      <Text style={styles.title}>{t('skills')}</Text>
      <Text style={styles.body}>{t('skillsHelp')}</Text>
      <TextInput style={styles.input} value={query} onChangeText={setQuery} placeholder={t('searchSkills')} accessibilityLabel={t('searchSkills')} />
      <Text accessibilityLiveRegion="polite" style={[styles.body, saveFailed && styles.error]}>{saving ? t('saving') : saveFailed ? t('saveFailed') : saved ? t('saved') : t('selfReportedSkills')}</Text>
    </>}
    ListEmptyComponent={<Text style={styles.body}>{t('noSkillsFound')}</Text>}
    renderItem={({ item }) => {
      const checked = profile.provider_skills.some(s => s.skill_id === item.id);
      return <Pressable style={[styles.button, checked && styles.selected]} disabled={saving} accessibilityRole="checkbox" accessibilityState={{ checked, disabled: saving }} onPress={() => void toggle(item)}>
        <Text style={styles.title}>{checked ? '✓ ' : '+ '}{skillName(item, language)}</Text>
        <Text style={styles.body}>{skillPath(item, catalogue, language)}{!item.active ? ` · ${t('retiredSkill')}` : ''}</Text>
      </Pressable>;
    }} />;
}
const styles = StyleSheet.create({
  screen: { padding: 20, paddingBottom: 40, flexGrow: 1 }, heading: { color: theme.ink, fontSize: 26, fontWeight: '800', marginVertical: 12 },
  title: { color: theme.ink, fontSize: 18, fontWeight: '700', lineHeight: 28 }, body: { color: theme.muted, fontSize: 15, lineHeight: 25, marginVertical: 6 },
  button: { minHeight: 56, padding: 15, marginVertical: 6, borderWidth: 1, borderColor: theme.line, borderRadius: 12, backgroundColor: theme.white },
  selected: { borderColor: theme.goldText, borderWidth: 2 }, input: { minHeight: 54, padding: 14, marginVertical: 12, fontSize: 17, borderWidth: 1, borderColor: theme.line, borderRadius: 10, backgroundColor: theme.white },
  error: { color: theme.error },
});
