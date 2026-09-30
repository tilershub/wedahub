import { StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../i18n';
import type { Provider } from '../lib/providers';
import { theme } from '../theme';
const badgeKeys = { identity: 'badgeIdentity', skill: 'badgeSkill', credential: 'badgeCredential', licence: 'badgeLicence', business: 'badgeBusiness', industry_registration: 'badgeIndustry' } as const;
export function ProviderEvidence({ provider, detailed = false }: { provider: Provider; detailed?: boolean }) {
  const { t } = useLanguage();
  const badges = provider.badge_kinds.filter((kind): kind is keyof typeof badgeKeys => kind in badgeKeys);
  const legacy = ['th_verified', 'th_certified_pro', 'th_master'].includes(provider.verification_status || '');
  return <View style={styles.container}>
    <Text style={styles.rating}>{provider.review_count ? `★ ${Number(provider.avg_rating).toFixed(1)} · ${provider.review_count} ${t('reviews')}` : t('noReviews')}</Text>
    <View style={styles.badges}><Text style={styles.count}>{provider.completed_jobs} {t('completedJobs')}</Text></View>
    {provider.confirmed_review_count > 0 && <Text style={styles.help}>{provider.confirmed_review_count} {t('confirmedReviews')}</Text>}
    <View style={styles.badges}>
      {badges.map(kind => <Text key={kind} style={styles.badge}>✓ {t(badgeKeys[kind])}</Text>)}
      {legacy && <Text style={styles.badge}>{t('badgeLegacy')}</Text>}
    </View>
    {!badges.length && !legacy && <Text style={styles.help}>{t('noBadges')}</Text>}
    {detailed && legacy && <Text style={styles.help}>{t('badgeLegacyHelp')}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  container: { gap: 8, marginBottom: 12 }, rating: { color: theme.ink, fontSize: 15, fontWeight: '700' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  count: { color: theme.ink, backgroundColor: theme.paper, padding: 8, borderRadius: 8, fontSize: 13 },
  badge: { color: theme.goldText, borderWidth: 1, borderColor: theme.line, padding: 8, borderRadius: 8, fontSize: 13 },
  help: { color: theme.muted, fontSize: 12, lineHeight: 18 },
});
