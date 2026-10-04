import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../i18n';
import { engagementApiConfigured, myEngagements } from '../lib/engagements';
import { bidsForProjects, myBids, myProjects } from '../lib/jobs';
import { notificationItems, type InboxItem } from '../lib/notification-items';
import { configured, supabase } from '../lib/supabase';
import { theme } from '../theme';
export default function Notifications() {
  const { t, language } = useLanguage();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [read, setRead] = useState<string[]>([]);
  const [owner, setOwner] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [partial, setPartial] = useState(false);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setError(false); setPartial(false);
    try {
      if (!configured) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (request !== generation.current) return;
      setOwner(user?.id || ''); setItems([]); setRead([]);
      if (!user) return;
      const [projects, applications, engagements, saved] = await Promise.all([
        myProjects(user.id), myBids(user.id),
        engagementApiConfigured ? myEngagements().then(jobs => ({ jobs, failed: false })).catch(() => ({ jobs: [], failed: true })) : Promise.resolve({ jobs: [], failed: true }),
        AsyncStorage.getItem(`wedahub.inbox.read.${user.id}`).catch(() => null),
      ]);
      const bids = await bidsForProjects(projects.map(p => p.id));
      if (request !== generation.current) return;
      let readIds: unknown = [];
      try { readIds = JSON.parse(saved || '[]'); } catch { /* corrupted preference */ }
      setRead(Array.isArray(readIds) ? readIds.filter((id): id is string => typeof id === 'string').slice(-300) : []);
      setItems(notificationItems(user.id, projects, [...bids, ...applications], engagements.jobs)); setPartial(engagements.failed);
    } catch { if (request === generation.current) { setItems([]); setError(true); } }
    finally { if (request === generation.current) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); return () => { generation.current++; }; }, [refresh]));
  const markAll = async () => {
    const next = [...new Set([...read, ...items.map(item => item.id)])].slice(-300);
    setRead(next);
    try { await AsyncStorage.setItem(`wedahub.inbox.read.${owner}`, JSON.stringify(next)); } catch { setError(true); }
  };
  return <ScrollView contentContainerStyle={styles.screen} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={theme.goldText} />}>
    <Text style={styles.heading}>{t('notifications')}</Text><Text style={styles.body}>{t('inboxHelp')}</Text>
    {loading && <ActivityIndicator color={theme.goldText} />}
    {!loading && !owner && <Link href="/account" asChild><Pressable style={styles.button}><Text style={styles.buttonText}>{t('signIn')}</Text></Pressable></Link>}
    {error && <Text accessibilityRole="alert" style={styles.error}>{t('loadFailed')}</Text>}
    {partial && <Text style={styles.body}>{t('engagementUnavailable')}</Text>}
    <Pressable style={styles.button} onPress={() => void refresh()} disabled={loading} accessibilityRole="button"><Text style={styles.buttonText}>{t('refreshInbox')}</Text></Pressable>
    {!!owner && !loading && !error && !items.length && <Text style={styles.body}>{t('inboxEmpty')}</Text>}
    {!!items.length && <Pressable style={styles.button} onPress={() => void markAll()} accessibilityRole="button"><Text style={styles.buttonText}>{t('markAllRead')}</Text></Pressable>}
    {items.map(item => <View key={item.id} style={styles.card}>
      <Text style={styles.label}>{t(item.kind)}{read.includes(item.id) ? '' : ` • ${t('unread')}`}</Text><Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{new Date(item.at).toLocaleDateString(language === 'si' ? 'si-LK' : language === 'ta' ? 'ta-LK' : 'en-LK')}</Text>
      <Link href="/projects" asChild><Pressable style={styles.button} accessibilityRole="button"><Text style={styles.buttonText}>{t('viewWork')}</Text></Pressable></Link>
    </View>)}
  </ScrollView>;
}
const styles = StyleSheet.create({
  screen: { padding: 24, gap: 14, paddingBottom: 40 }, heading: { color: theme.ink, fontSize: 27, fontWeight: '800' },
  body: { color: theme.muted, fontSize: 16, lineHeight: 24 }, error: { color: theme.error, fontSize: 16 },
  card: { backgroundColor: theme.white, borderColor: theme.line, borderWidth: 1, borderRadius: 14, padding: 18, gap: 8 },
  title: { color: theme.ink, fontSize: 19, fontWeight: '700' }, label: { color: theme.goldText, fontSize: 15, fontWeight: '700' },
  button: { backgroundColor: theme.ink, minHeight: 48, borderRadius: 10, padding: 12, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: theme.white, fontSize: 16, fontWeight: '700' },
});
