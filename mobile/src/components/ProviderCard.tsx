import { Link } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../i18n';
import type { Provider } from '../lib/providers';
import { theme } from '../theme';

export function ProviderCard({ provider }: { provider: Provider }) {
  const { t } = useLanguage();
  return <Link href={{ pathname: '/provider/[slug]', params: { slug: provider.slug } }} asChild>
    <Pressable accessibilityRole="button" accessibilityLabel={`${t('view')}: ${provider.name}`} style={styles.card}>
      <View style={styles.row}>
        {provider.profile_image ? <Image source={{ uri: provider.profile_image }} style={styles.avatar} />
          : <View style={[styles.avatar, styles.placeholder]}><Text style={styles.initial}>{provider.name.slice(0, 1)}</Text></View>}
        <View style={styles.info}>
          <Text style={styles.name}>{provider.name}</Text>
          <Text style={styles.detail}>{provider.provider_type.replace(/_/g, ' ')}</Text>
          <Text style={styles.detail}>{[provider.city, provider.district].filter(Boolean).join(' · ')}</Text>
        </View>
      </View>
      <Text style={styles.services} numberOfLines={2}>{(provider.services || []).slice(0, 3).join(' · ')}</Text>
      <View style={styles.footer}>
        <Text style={styles.rating}>{provider.review_count ? `★ ${Number(provider.avg_rating || 0).toFixed(1)} (${provider.review_count} ${t('reviews')})` : t('noReviews')}</Text>
        <Text style={styles.link}>{t('view')} →</Text>
      </View>
    </Pressable>
  </Link>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: theme.white, borderRadius: 16, padding: 17, marginBottom: 12, borderWidth: 1, borderColor: theme.line, minHeight: 150 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 }, avatar: { width: 64, height: 64, borderRadius: 12 },
  placeholder: { backgroundColor: theme.ink, alignItems: 'center', justifyContent: 'center' }, initial: { color: theme.gold, fontSize: 28 },
  info: { flex: 1 }, name: { fontSize: 19, fontWeight: '700', color: theme.ink }, detail: { color: theme.muted, fontSize: 14, marginTop: 3 },
  services: { color: theme.muted, marginVertical: 14, fontSize: 15 }, footer: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  rating: { color: theme.ink, flex: 1, fontSize: 13 }, link: { color: theme.goldText, fontWeight: '700', fontSize: 13 },
});
