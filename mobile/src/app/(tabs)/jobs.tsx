import type { User } from '@supabase/supabase-js';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLanguage } from '../../i18n';
import { availableJobs, createProject, expressInterest, type Job } from '../../lib/jobs';
import { configured, supabase } from '../../lib/supabase';
import { useMode } from '../../mode';
import { uploadJobPhoto } from '../../lib/job-photos';
import { PhotoCarousel } from '../../components/PhotoCarousel';
import { AppIcon } from '../../components/AppIcon';
import { theme } from '../../theme';

type Profile = { id: string; name: string; slug: string; services: string[] | null; city: string | null; status: string; claim_status: string };

export default function Jobs() {
  const { t } = useLanguage();
  const { mode } = useMode();
  const [images,setImages]=useState<string[]>([]);
  const submitLock=useRef(false);
  const [user, setUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [service, setService] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [interestId, setInterestId] = useState('');
  const [message, setMessage] = useState('');
  const refresh = useCallback(async () => {
    if (!configured) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [{ data: { user: current } }, rows] = await Promise.all([supabase.auth.getUser(), availableJobs()]);
      setUser(current); setJobs(rows);
      if (current) {
        const { data, error: profileError } = await supabase.from('providers')
          .select('id,name,slug,services,city,status,claim_status').eq('user_id', current.id).is('merged_into', null);
        if (profileError) throw profileError;
        setProfiles(data); setSelected(previous => data.some(p => p.id === previous) ? previous : data[0]?.id || '');
      } else { setProfiles([]); setSelected(''); }
    } catch { setError(t('loadFailed')); } finally { setLoading(false); }
  }, [t]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  const profile = profiles.find(p => p.id === selected);
  const relevant = (job: Job) => !!profile && [job.project_type, job.description || ''].some(value =>
    (profile.services || []).some(serviceName => serviceName.length > 2 && value.toLocaleLowerCase().includes(serviceName.toLocaleLowerCase())));
  const ordered = mode === 'provider' ? [...jobs].sort((a, b) => Number(relevant(b)) - Number(relevant(a))) : jobs;
  const submitProject = async () => {
    if(submitLock.current)return;
    if (!user) { setError(t('signInRequired')); return; }
    if(images.length<1||images.length>5){setError(t('jobPhotosHelp'));return;}
    if (!service.trim() || !city.trim() || description.trim().length < 20 || !customerName.trim()) { setError(t('jobValidation')); return; }
    submitLock.current=true;setBusy(true); setError('');
    try {
      await createProject({ userId: user.id, customerName, phone: user.phone || '', service, city, description, budget, images });
      setFormOpen(false); setImages([]); setService(''); setCity(''); setDescription(''); setBudget(''); setNotice(t('jobPosted'));
      await refresh();
    } catch { setError(t('saveFailed')); } finally { submitLock.current=false;setBusy(false); }
  };
  const apply = async (job: Job) => {
    if (!user || !profile || profile.status !== 'active' || profile.claim_status !== 'claimed') { setError(t('activeProfileRequired')); return; }
    if (message.trim().length < 20) { setError(t('interestValidation')); return; }
    setBusy(true); setError('');
    try {
      await expressInterest({ userId: user.id, jobId: job.id, name: profile.name,
        phone: user.phone || '', providerSlug: profile.slug, message });
      setInterestId(''); setMessage(''); setNotice(t('interestSent'));
    } catch { setError(t('saveFailed')); } finally { setBusy(false); }
  };
  return <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
    <Text style={styles.title}>{mode === 'provider' ? t('opportunities') : t('jobs')}</Text>
    <Text style={styles.subtitle}>{mode === 'provider' ? t('providerJobsIntro') : t('customerJobsIntro')}</Text>
    {!configured && <Text style={styles.error}>{t('setup')}</Text>}
    {mode === 'customer' && <>
      <Pressable style={styles.primary} onPress={() => setFormOpen(value => !value)} accessibilityRole="button"><Text style={styles.primaryText}>{t('postJob')}</Text></Pressable>
      {formOpen && <View style={styles.form}>
        {!user && <><Text style={styles.error}>{t('signInRequired')}</Text><Link href="/account" asChild><Pressable style={styles.primary}><Text style={styles.primaryText}>{t('signIn')}</Text></Pressable></Link></>}
        <Field label={t('service')} value={service} onChangeText={setService} />
        <Field label={t('city')} value={city} onChangeText={setCity} />
        <Field label={t('yourName')} value={customerName} onChangeText={setCustomerName} />
        <Field label={t('description')} value={description} onChangeText={setDescription} multiline />
        <Text style={styles.label}>{t('jobPhotos')}</Text><Text style={styles.subtitle}>{t('jobPhotosHelp')}</Text>
        <ScrollView horizontal>{images.map((uri,index)=><View key={uri} style={{marginRight:8}}><Image source={{uri}} style={{width:110,height:90,borderRadius:9}}/><Pressable accessibilityRole="button" accessibilityLabel={`${t('removePhoto')} ${index+1}`} style={styles.secondary} disabled={busy} onPress={()=>setImages(rows=>rows.filter((_,i)=>i!==index))}><AppIcon name="close"/></Pressable></View>)}</ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel={t('addJobPhoto')} style={styles.secondary} disabled={busy||!user||images.length>=5} onPress={async()=>{if(submitLock.current)return;submitLock.current=true;setBusy(true);setError('');try{const uri=await uploadJobPhoto();if(uri)setImages(rows=>[...rows,uri]);}catch{setError(t('photoUploadFailed'));}finally{submitLock.current=false;setBusy(false);}}}><AppIcon name="camera"/><Text>{t('addJobPhoto')}</Text></Pressable>
        <Field label={t('budgetOptional')} value={budget} onChangeText={setBudget} />
        <Pressable style={styles.primary} disabled={busy || !user || images.length<1} onPress={() => void submitProject()} accessibilityRole="button"><Text style={styles.primaryText}>{busy ? t('saving') : t('publishJob')}</Text></Pressable>
      </View>}
    </>}
    {mode === 'provider' && !loading && <View style={styles.form}>
      {!user ? <><Text style={styles.subtitle}>{t('signInRequired')}</Text><Link href="/account" asChild><Pressable style={styles.primary}><Text style={styles.primaryText}>{t('signIn')}</Text></Pressable></Link></> : <>
      <Text style={styles.label}>{t('chooseProfile')}</Text>
      {profiles.length ? profiles.map(p => <Pressable key={p.id} onPress={() => setSelected(p.id)} style={[styles.chip, p.id === selected && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: p.id === selected }}><Text style={p.id === selected ? styles.chipActiveText : styles.chipText}>{p.name}</Text></Pressable>) : <Text style={styles.subtitle}>{t('noOwnedProfiles')}</Text>}
      {!profiles.length && <Link href="/register-provider" asChild><Pressable style={styles.primary}><Text style={styles.primaryText}>{t('registerProvider')}</Text></Pressable></Link>}
      {profile && <Text style={styles.subtitle}>{t('matchingHint')}</Text>}
      </>}
    </View>}
    {!!notice && <Text accessibilityRole="alert" style={styles.success}>{notice}</Text>}
    {!!error && <Pressable onPress={() => void refresh()}><Text accessibilityRole="alert" style={styles.error}>{error} {t('tryAgain')}</Text></Pressable>}
    {loading && <ActivityIndicator color={theme.goldText} style={{ marginVertical: 24 }} />}
    {!loading && !ordered.length && <Text style={styles.subtitle}>{t('noJobs')}</Text>}
    {ordered.map(job => <View key={job.id} style={styles.card}>
      {mode === 'provider' && relevant(job) && <Text style={styles.match}>{t('matchingSkill')}</Text>}
      <Text style={styles.jobTitle}>{job.project_type}</Text>
      {!!job.images?.length&&<PhotoCarousel images={job.images} label={t('jobPhotos')}/>}
      <Text style={styles.meta}>{job.city}{job.district ? ` • ${job.district}` : ''}{job.budget_range ? ` • ${job.budget_range}` : ''}</Text>
      {!!job.description && <Text style={styles.body}>{job.description}</Text>}
      {mode === 'provider' && user && profile && job.user_id !== user.id && <>
        {interestId === job.id ? <View>
          <Text style={styles.label}>{t('shortMessage')}</Text>
          <TextInput style={[styles.input, styles.multiline]} value={message} onChangeText={setMessage} multiline placeholder={t('interestHint')} placeholderTextColor={theme.muted} />
          <Pressable style={styles.primary} disabled={busy} onPress={() => void apply(job)} accessibilityRole="button"><Text style={styles.primaryText}>{t('interested')}</Text></Pressable>
        </View> : <Pressable style={styles.secondary} onPress={() => { setInterestId(job.id); setMessage(''); setNotice(''); }} accessibilityRole="button"><Text style={styles.secondaryText}>{t('interested')}</Text></Pressable>}
      </>}
    </View>)}
  </ScrollView>;
}

function Field({ label, value, onChangeText, multiline }: { label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean }) {
  return <View><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} style={[styles.input, multiline && styles.multiline]} value={value} onChangeText={onChangeText} multiline={multiline} /></View>;
}

const styles = StyleSheet.create({
  screen: { padding: 18, paddingBottom: 48, backgroundColor: theme.paper, flexGrow: 1 },
  title: { fontSize: 27, fontWeight: '800', color: theme.ink, marginBottom: 8 },
  subtitle: { color: theme.muted, fontSize: 15, lineHeight: 22, marginBottom: 14 },
  form: { padding: 15, borderRadius: 12, backgroundColor: theme.white, marginBottom: 18, gap: 7 },
  label: { fontSize: 15, color: theme.ink, fontWeight: '700', marginTop: 9 },
  input: { minHeight: 52, borderWidth: 1, borderColor: theme.line, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9, fontSize: 16, backgroundColor: theme.white },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  primary: { backgroundColor: theme.ink, minHeight: 54, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginBottom: 15 },
  primaryText: { color: theme.white, fontSize: 16, fontWeight: '700' },
  secondary: { borderRadius: 9, borderWidth: 1, borderColor: theme.ink, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  secondaryText: { color: theme.ink, fontWeight: '700', fontSize: 16 },
  card: { backgroundColor: theme.white, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.line },
  jobTitle: { fontSize: 19, color: theme.ink, fontWeight: '700', marginBottom: 6 },
  meta: { color: theme.muted, fontSize: 14 }, body: { color: theme.ink, fontSize: 15, lineHeight: 22, marginTop: 9 },
  chip: { minHeight: 48, borderWidth: 1, borderColor: theme.line, borderRadius: 9, padding: 10, justifyContent: 'center' },
  chipActive: { backgroundColor: theme.ink, borderColor: theme.ink }, chipText: { color: theme.ink }, chipActiveText: { color: theme.white, fontWeight: '700' },
  match: { color: theme.goldText, fontWeight: '700', marginBottom: 7 },
  error: { color: theme.error, marginVertical: 12, fontSize: 15 }, success: { color: theme.success, marginBottom: 12, fontSize: 15 },
});
