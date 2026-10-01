import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { areas } from '../data/areas';
import { useLanguage } from '../i18n';
import { supabase } from '../lib/supabase';
import { theme } from '../theme';
const nationwide = (value: string) => ['sri lanka', 'all island', 'all-island', 'islandwide', 'island-wide', 'nationwide'].includes(value.trim().toLowerCase());
export function ServiceAreaEditor({ providerId, initialAreas }: { providerId: string; initialAreas: string[] }) {
  const { t, language } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState(initialAreas.filter(value => !nationwide(value)));
  const [islandwide, setIslandwide] = useState(initialAreas.some(nationwide));
  const [savedAreas, setSavedAreas] = useState(initialAreas);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'saved' | 'failed' | null>(null);
  const label = (value: string) => nationwide(value) ? t('allSriLanka') : areas.find(item => item.value === value)?.[language] || value;
  const toggle = (value: string) => { setStatus(null); setSelected(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]); };
  const save = async () => {
    if (busy) return;
    setBusy(true); setStatus(null);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error('sign_in_required');
      const next = islandwide ? ['Islandwide'] : [...new Set(selected)];
      const { data, error } = await supabase.from('providers').update({ service_areas: next })
        .eq('id', providerId).eq('user_id', auth.user.id).is('merged_into', null).select('service_areas').single();
      if (error || !data) throw error || new Error('not_updated');
      setSavedAreas(data.service_areas || []); setStatus('saved'); setExpanded(false);
    } catch { setStatus('failed'); }
    finally { setBusy(false); }
  };
  return <View style={styles.panel}>
    <Text style={styles.title}>{t('serviceAreas')}</Text>
    <Text style={styles.body}>{savedAreas.length ? savedAreas.map(label).join(' · ') : t('coverageNotSet')}</Text>
    <Pressable style={styles.button} disabled={busy} accessibilityRole="button" accessibilityState={{ expanded, disabled: busy }} onPress={() => setExpanded(!expanded)}><Text>{t('editCoverage')}</Text></Pressable>
    {expanded && <>
      <Text style={styles.body}>{t('coverageHelp')}</Text>
      <Pressable style={[styles.button, islandwide && styles.selected]} disabled={busy} accessibilityRole="checkbox" accessibilityState={{ checked: islandwide, disabled: busy }} onPress={() => { setIslandwide(!islandwide); setStatus(null); }}><Text>{islandwide ? '✓ ' : '+ '}{t('allSriLanka')}</Text></Pressable>
      {!islandwide && <View style={styles.choices}>{[...areas.map(item => item.value), ...selected.filter(value => !areas.some(item => item.value === value))].map(value => <Pressable key={value} style={[styles.button, selected.includes(value) && styles.selected]} disabled={busy} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(value), disabled: busy }} onPress={() => toggle(value)}><Text>{selected.includes(value) ? '✓ ' : '+ '}{label(value)}</Text></Pressable>)}</View>}
      <Pressable style={[styles.button, styles.save]} disabled={busy} accessibilityRole="button" accessibilityState={{ disabled: busy }} onPress={() => void save()}><Text style={styles.saveText}>{busy ? t('saving') : t('saveCoverage')}</Text></Pressable>
    </>}
    {!!status && <Text accessibilityLiveRegion="polite" style={[styles.body, status === 'failed' && styles.error]}>{status === 'saved' ? t('saved') : t('saveFailed')}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  panel: { padding: 16, borderRadius: 14, backgroundColor: theme.white, borderColor: theme.line, borderWidth: 1, marginVertical: 12 },
  title: { fontSize: 18, fontWeight: '700', color: theme.ink }, body: { color: theme.muted, fontSize: 14, lineHeight: 23, marginVertical: 8 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, button: { minHeight: 48, justifyContent: 'center', borderWidth: 1, borderColor: theme.line, borderRadius: 10, padding: 12, marginVertical: 5 },
  selected: { borderColor: theme.goldText, borderWidth: 2 }, save: { backgroundColor: theme.ink }, saveText: { color: theme.white, fontWeight: '700' }, error: { color: theme.error },
});
