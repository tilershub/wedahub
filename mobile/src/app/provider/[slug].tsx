import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../../i18n';
import { providerBySlug, type ProviderDetail } from '../../lib/providers';
import { publicProviderSkills, skillName, type Skill } from '../../lib/skills';
import { ProviderEvidence } from '../../components/ProviderEvidence';
import { theme } from '../../theme';

export default function ProviderProfile() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, language } = useLanguage();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsFailed, setSkillsFailed] = useState(false);
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);
  const loading = typeof slug === 'string' && loadedSlug !== slug;
  useEffect(() => {
    let active = true;
    if (typeof slug !== 'string') return;
    providerBySlug(slug).then(async row => {
      if (!active) return;
      setProvider(row); setSkills([]); setSkillsFailed(false);
      if (row) {
        try { const next = await publicProviderSkills(row.id); if (active) setSkills(next); }
        catch { if (active) setSkillsFailed(true); }
      }
    }).catch(() => { if (active) setProvider(null); }).finally(() => { if (active) setLoadedSlug(slug); });
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
      {!!provider.description && <><Text style={styles.title}>{t('about')}</Text><Text style={styles.body}>{provider.description}</Text></>}
      {!!provider.experience_years && <><Text style={styles.title}>{t('experience')}</Text><Text style={styles.body}>{provider.experience_years} {t('years')}</Text></>}
      {!!provider.service_areas?.length && <><Text style={styles.title}>{t('serviceAreas')}</Text><Text style={styles.body}>{provider.service_areas.join(' · ')}</Text></>}
      {(!!provider.daily_rate_min || !!provider.daily_rate_max || !!provider.visit_fee) && <>
        <Text style={styles.title}>{t('pricing')}</Text>
        {!!provider.daily_rate_min && <Text style={styles.body}>{t('dailyRate')}: LKR {provider.daily_rate_min.toLocaleString()}{provider.daily_rate_max ? `–${provider.daily_rate_max.toLocaleString()}` : ''}</Text>}
        {!!provider.visit_fee && <Text style={styles.body}>{t('visitFee')}: LKR {provider.visit_fee.toLocaleString()}</Text>}
      </>}
      {!!provider.gallery?.length && <><Text style={styles.title}>{t('portfolio')}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>{provider.gallery.map((url, index) => <Image key={`${url}-${index}`} source={{ uri: url }} style={styles.galleryImage} accessibilityLabel={`${t('portfolio')} ${index + 1}`} />)}</ScrollView></>}
      {(skills.length > 0 || skillsFailed) && <>
        <Text style={styles.title}>{t('skills')}</Text>
        <Text style={styles.body}>{skillsFailed ? t('skillsUnavailable') : skills.map(s => skillName(s, language)).join(' · ')}</Text>
        {!skillsFailed && <Text style={styles.evidence}>{t('selfReportedSkills')}</Text>}
      </>}
      <Text style={styles.title}>{t('reputation')}</Text>
      <ProviderEvidence provider={provider} detailed details={provider.badges} />
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
  gallery: { marginTop: 8 }, galleryImage: { width: 170, height: 130, borderRadius: 10, marginRight: 9 },
});
