import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../../i18n';
import { providerBySlug, type Provider } from '../../lib/providers';
import { theme } from '../../theme';

export default function ProviderProfile() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useLanguage();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(typeof slug === 'string');
  useEffect(() => {
    let active = true;
    if (typeof slug !== 'string') return;
    providerBySlug(slug).then(row => { if (active) setProvider(row); }).catch(() => {}).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);
  if (loading) return <ActivityIndicator style={styles.loading} color={theme.goldText} />;
  if (!provider) return <Text style={styles.missing}>{t('profileMissing')}</Text>;
  return <ScrollView contentContainerStyle={styles.content}>
    <View style={styles.banner}>
      {provider.profile_image ? <Image source={{ uri: provider.profile_image }} style={styles.avatar} />
        : <View style={[styles.avatar, styles.blank]}><Text style={styles.initial}>{provider.name.slice(0, 1)}</Text></View>}
      <Text style={styles.name}>{provider.name}</Text>
      <Text style={styles.kind}>{provider.provider_type.replace(/_/g, ' ')}</Text>
    </View>
    <View style={styles.card}>
      <Text style={styles.title}>{t('location')}</Text>
      <Text style={styles.body}>{[provider.city, provider.district].filter(Boolean).join(' · ') || '—'}</Text>
      <Text style={styles.title}>{t('services')}</Text>
      <Text style={styles.body}>{(provider.services || []).join(' · ') || '—'}</Text>
      <Text style={styles.title}>{t('reviews')}</Text>
      <Text style={styles.body}>{provider.review_count ? `★ ${Number(provider.avg_rating || 0).toFixed(1)} · ${provider.review_count} ${t('reviews')}` : t('noReviews')}</Text>
      <Text style={styles.evidence}>{t('verificationUnknown')}</Text>
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  loading: { flex: 1 }, missing: { padding: 24, color: theme.muted }, content: { paddingBottom: 30 },
  banner: { backgroundColor: theme.ink, padding: 24, alignItems: 'center' }, avatar: { height: 100, width: 100, borderRadius: 20 },
  blank: { backgroundColor: theme.gold, justifyContent: 'center', alignItems: 'center' }, initial: { fontSize: 40, color: theme.ink },
  name: { fontSize: 25, fontWeight: '800', color: theme.white, marginTop: 15 }, kind: { fontSize: 16, color: theme.gold, marginTop: 5 },
  card: { margin: 18, padding: 22, borderRadius: 15, backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line },
  title: { fontSize: 16, fontWeight: '700', color: theme.ink, marginTop: 14, marginBottom: 5 },
  body: { fontSize: 16, lineHeight: 24, color: theme.muted }, evidence: { color: theme.muted, marginTop: 22, fontSize: 13 },
});
