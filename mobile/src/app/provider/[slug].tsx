import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../../i18n';
import { providerBySlug, providerReviews, type PublicReview, type ProviderDetail } from '../../lib/providers';
import { publicProviderSkills, skillName, type Skill } from '../../lib/skills';
import { ProviderEvidence } from '../../components/ProviderEvidence';
import { ProfileEditor } from '../../components/ProfileEditor';
import { editableProfile, serviceOfferings, priceLabels, type EditableProfile, type Offering } from '../../lib/profile-editing';
import { theme } from '../../theme';

export default function ProviderProfile() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, language } = useLanguage();
  const [owner, setOwner] = useState<EditableProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [revision, setRevision] = useState(0);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [detailsFailed, setDetailsFailed] = useState(false);
  const [reviewPage, setReviewPage] = useState(0);
  const [moreReviews, setMoreReviews] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
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
      setOwner(null); setOfferings([]); setReviews([]); setDetailsFailed(false); setReviewPage(0);
      if (row) {
        const results = await Promise.allSettled([editableProfile(row.id), serviceOfferings(row.id), providerReviews(row.id)]);
        if (!active) return;
        if (results[0].status === "fulfilled") setOwner(results[0].value);
        if (results[1].status === "fulfilled") setOfferings(results[1].value);
        if (results[2].status === "fulfilled") { setReviews(results[2].value); setMoreReviews(results[2].value.length === 20); }
        setDetailsFailed(results.slice(1).some(result => result.status === "rejected"));
        try { const next = await publicProviderSkills(row.id); if (active) setSkills(next); }
        catch { if (active) setSkillsFailed(true); }
      }
    }).catch(() => { if (active) setProvider(null); }).finally(() => { if (active) setLoadedSlug(slug); });
    return () => { active = false; };
  }, [slug, revision]);
  if (loading) return <ActivityIndicator style={styles.loading} color={theme.goldText} />;
  if (!provider) return <Text style={styles.missing}>{t('profileMissing')}</Text>;
  if (editing && owner) return <ScrollView contentContainerStyle={{padding:18,paddingBottom:40}}><ProfileEditor initial={owner} offerings={offerings} onOfferingsChange={async()=>setOfferings(await serviceOfferings(provider.id))} onDone={()=>{setEditing(false);setRevision(value=>value+1);}}/></ScrollView>;
  return <ScrollView contentContainerStyle={styles.content}>
    {!!provider.cover_image && <Image source={{uri:provider.cover_image}} style={{width:"100%",height:180}} accessibilityLabel={t("coverPhoto")}/> }
    <View style={styles.banner}>
      {provider.profile_image ? <Image source={{ uri: provider.profile_image }} style={styles.avatar} />
        : <View style={[styles.avatar, styles.blank]}><Text style={styles.initial}>{provider.name.slice(0, 1)}</Text></View>}
      <Text style={styles.name}>{provider.name}</Text>
      <Text style={styles.kind}>{provider.provider_type.replace(/_/g, ' ')}</Text>
    </View>
    {owner && <Pressable accessibilityRole="button" style={styles.card} onPress={()=>setEditing(true)}><Text style={styles.title}>{t('editProfile')}</Text></Pressable>}
    {!!provider.gallery?.length && <View style={styles.card}><Text style={styles.title}>{t('portfolio')}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{provider.gallery.map((url,index)=><Image key={`${url}-${index}`} source={{uri:url}} style={styles.galleryImage} accessibilityLabel={`${t('portfolio')} ${index+1}`}/>)}</ScrollView></View>}
    <View style={styles.card}>
      <Text style={styles.title}>{t('reputation')}</Text><ProviderEvidence provider={provider} detailed details={provider.badges}/>
      <Text style={styles.title}>{t('customerReviews')}</Text>
      {detailsFailed && <Text style={styles.body}>{t('profileDetailsUnavailable')}</Text>}
      {!detailsFailed && !reviews.length && <Text style={styles.body}>{t('noReviews')}</Text>}
      {reviews.map(review=><View key={review.id} style={{borderTopWidth:1,borderColor:theme.line,paddingVertical:14}}>
        <Text style={styles.title}>{review.reviewer_name} · {review.rating}/5</Text>
        <Text style={styles.body}>{review.confirmed_job?t('confirmedJobReview'):t('publishedReview')}</Text>
        <Text style={styles.body}>{review.comment}</Text>
        {!!review.provider_reply && <><Text style={styles.title}>{t('providerResponse')}</Text><Text style={styles.body}>{review.provider_reply}</Text></>}
      </View>)}
      {moreReviews && <Pressable accessibilityRole="button" disabled={reviewBusy} style={{minHeight:48,justifyContent:'center'}} onPress={async()=>{
        setReviewBusy(true);try{const next=await providerReviews(provider.id,reviewPage+1);setReviews(current=>[...current,...next.filter(row=>!current.some(old=>old.id===row.id))]);setReviewPage(page=>page+1);setMoreReviews(next.length===20);}catch{setDetailsFailed(true);}finally{setReviewBusy(false);}
      }}><Text>{t('moreReviews')}</Text></Pressable>}
    </View>
    {!!offerings.length && <View style={styles.card}><Text style={styles.title}>{t('serviceMenu')}</Text>{offerings.map(item=><View key={item.id} style={{paddingVertical:12}}>
      <Text style={styles.title}>{item.title}</Text>{!!item.description&&<Text style={styles.body}>{item.description}</Text>}
      <Text style={styles.body}>{item.amount!==null?`LKR ${item.amount.toLocaleString()}${item.maximum_amount!==null?` – ${item.maximum_amount.toLocaleString()}`:''} · `:''}{t(priceLabels[item.pricing_model])}{item.unit_label?` · ${item.unit_label}`:''}{item.duration_minutes?` · ${item.duration_minutes} ${t('minutes')}`:''}</Text>
    </View>)}</View>}
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
      {(skills.length > 0 || skillsFailed) && <>
        <Text style={styles.title}>{t('skills')}</Text>
        <Text style={styles.body}>{skillsFailed ? t('skillsUnavailable') : skills.map(s => skillName(s, language)).join(' · ')}</Text>
        {!skillsFailed && <Text style={styles.evidence}>{t('selfReportedSkills')}</Text>}
      </>}
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
