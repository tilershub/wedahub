import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLanguage } from '../../i18n';
import { engagementApiConfigured, invite, myEngagements, transition, type Engagement } from '../../lib/engagements';
import { bidsForProjects, myBids, myProjects, type Bid, type Job } from '../../lib/jobs';
import { configured, supabase } from '../../lib/supabase';
import { useMode } from '../../mode';
import { theme } from '../../theme';

export default function Projects() {
  const { t } = useLanguage();
  const { mode } = useMode();
  const [signedIn, setSignedIn] = useState(false);
  const [userId, setUserId] = useState('');
  const [projects, setProjects] = useState<Job[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [apiError, setApiError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [note, setNote] = useState('');
  const [reviewId, setReviewId] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [evidence, setEvidence] = useState('');
  const refresh = useCallback(async () => {
    if (!configured) { setLoading(false); return; }
    setLoading(true); setError(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setSignedIn(!!user);
      setUserId(user?.id || '');
      if (!user) { setProjects([]); setBids([]); setEngagements([]); return; }
      if (mode === 'customer') {
        const rows = await myProjects(user.id);
        setProjects(rows); setBids(await bidsForProjects(rows.map(item => item.id)));
      } else { setBids(await myBids(user.id)); setProjects([]); }
      if (engagementApiConfigured) {
        try { setEngagements(await myEngagements()); setApiError(false); }
        catch { setEngagements([]); setApiError(true); }
      }
    } catch { setError(true); } finally { setLoading(false); }
  }, [mode]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  const run = async (job: Engagement, action: string, extras: object = {}) => {
    if (busy) return;
    setBusy(true); setActionError('');
    try { await transition(job, action, extras); setNote(''); setReviewId(''); await refresh(); }
    catch { setActionError(t('actionFailed')); }
    finally { setBusy(false); }
  };
  const selectProvider = async (projectId: string, slug: string) => {
    if (busy) return;
    setBusy(true); setActionError('');
    try { await invite(projectId, slug); await refresh(); }
    catch { setActionError(t('actionFailed')); }
    finally { setBusy(false); }
  };
  return <ScrollView contentContainerStyle={styles.screen}>
    <Text style={styles.heading}>{mode === 'customer' ? t('myProjects') : t('myApplications')}</Text>
    <Text style={styles.subtitle}>{mode === 'customer' ? t('customerProjectsIntro') : t('providerProjectsIntro')}</Text>
    {!configured && <Text style={styles.error}>{t('setup')}</Text>}
    {!signedIn && !loading && <Link href="/account" asChild><Pressable style={styles.button} accessibilityRole="button"><Text style={styles.buttonText}>{t('signIn')}</Text></Pressable></Link>}
    {loading && <ActivityIndicator color={theme.goldText} style={styles.spinner} />}
    {error && <Pressable onPress={() => void refresh()} accessibilityRole="button"><Text style={styles.error}>{t('loadFailed')} {t('tryAgain')}</Text></Pressable>}
    {signedIn && !engagementApiConfigured && <Text style={styles.notice}>{t('engagementPending')}</Text>}
    {signedIn && apiError && <Text style={styles.notice}>{t('engagementUnavailable')}</Text>}
    {!!actionError && <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text>}
    {signedIn && !loading && !error && mode === 'customer' && <>
      {!projects.length && <Text style={styles.subtitle}>{t('noProjects')}</Text>}
      {projects.map(project => <View key={project.id} style={styles.card}>
        <Text style={styles.title}>{project.project_type}</Text>
        <Text style={styles.meta}>{project.city} • {t('status')}: {project.status}</Text>
        <Text style={styles.body}>{project.description}</Text>
        <Text style={styles.section}>{t('interestedProviders')} ({bids.filter(bid => bid.job_id === project.id).length})</Text>
        {bids.filter(bid => bid.job_id === project.id).map(bid => <View key={bid.id} style={styles.bid}>
          <Text style={styles.title}>{bid.bidder_name}</Text>
          <Text style={styles.body}>{bid.message}</Text>
          <Text style={styles.meta}>{t('status')}: {bid.status || t('pending')}</Text>
          {!!bid.provider_slug && engagementApiConfigured && !engagements.some(item => item.project_id === project.id && item.data.provider_slug === bid.provider_slug) &&
            <Pressable style={styles.button} disabled={busy} onPress={() => void selectProvider(project.id, bid.provider_slug!)} accessibilityRole="button"><Text style={styles.buttonText}>{t('selectProvider')}</Text></Pressable>}
        </View>)}
      </View>)}
    </>}
    {signedIn && !loading && !error && mode === 'provider' && <>
      {!bids.length && <Text style={styles.subtitle}>{t('noApplications')}</Text>}
      {bids.map(bid => <View key={bid.id} style={styles.card}>
        <Text style={styles.title}>{t('application')}</Text>
        <Text style={styles.body}>{bid.message}</Text>
        <Text style={styles.meta}>{t('status')}: {bid.status || t('pending')}</Text>
      </View>)}
    </>}
    {signedIn && !!engagements.length && <>
      <Text style={styles.heading}>{t('confirmedWork')}</Text>
      {engagements.map(job => {
        const role = mode === 'customer' ? 'customer' : 'provider';
        const mine = mode === 'customer' ? job.customer_id === userId : job.provider_user_id === userId;
        if (!mine) return null;
        const status = job.data.status;
        return <View key={job.id} style={styles.card}>
          <Text style={styles.title}>{job.data.title || t('confirmedWork')}</Text>
          <Text style={styles.meta}>{t('reference')}: {job.id.slice(0, 8).toUpperCase()} • {t('status')}: {status}</Text>
          {mode === 'provider' && status === 'invited' && <><Action label={t('accept')} disabled={busy} onPress={() => void run(job, 'accept')} /><Action label={t('decline')} disabled={busy} onPress={() => void run(job, 'decline')} /></>}
          {['accepted', 'in_progress', 'completion_requested'].includes(status) && <>
            {!job.data.started?.[role] && <Action label={t('confirmStart')} disabled={busy} onPress={() => void run(job, 'start')} />}
            {!!job.data.started?.[role] && ['accepted', 'in_progress'].includes(status) && <Action label={t('requestCompletion')} disabled={busy} onPress={() => void run(job, 'request_completion')} />}
            {status === 'completion_requested' && job.data.completion_requested_by !== role && <Action label={t('confirmCompletion')} disabled={busy} onPress={() => void run(job, 'confirm_completion')} />}
            <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder={t('issueReason')} placeholderTextColor={theme.muted} />
            {note.trim().length >= 10 && <><Action label={t('reportProblem')} disabled={busy} onPress={() => void run(job, 'dispute', { reason: note })} /><Action label={t('stopWork')} disabled={busy} onPress={() => void run(job, 'stop', { reason: note })} /></>}
          </>}
          {mode === 'customer' && ['completion_requested', 'completed', 'stopped', 'abandoned', 'disputed'].includes(status) && !!job.data.started?.customer && !job.data.review && <>
            <Action label={t('writeReview')} disabled={busy} onPress={() => setReviewId(job.id)} />
            {reviewId === job.id && <View>
              <Text style={styles.section}>{t('rating')}: {rating}/5</Text>
              <View style={styles.ratingRow}>{[1, 2, 3, 4, 5].map(value => <Pressable key={value} onPress={() => setRating(value)} style={[styles.rating, rating === value && styles.ratingSelected]} accessibilityRole="button"><Text style={rating === value ? styles.buttonText : styles.title}>{value}</Text></Pressable>)}</View>
              <TextInput style={styles.input} value={reviewerName} onChangeText={setReviewerName} placeholder={t('yourName')} placeholderTextColor={theme.muted} />
              <TextInput style={[styles.input, styles.longInput]} value={comment} onChangeText={setComment} multiline placeholder={t('reviewComment')} placeholderTextColor={theme.muted} />
              {!job.data.started?.provider && <TextInput style={[styles.input, styles.longInput]} value={evidence} onChangeText={setEvidence} multiline placeholder={t('privateEvidence')} placeholderTextColor={theme.muted} />}
              <Action label={t('submitReview')} disabled={busy || reviewerName.trim().length < 2 || comment.trim().length < 20 || (!job.data.started?.provider && evidence.trim().length < 10)} onPress={() => void run(job, 'review', { rating, reviewer_name: reviewerName, comment, evidence })} />
            </View>}
          </>}
          {!!job.data.review && <View style={styles.bid}><Text style={styles.section}>{t('review')}: {job.data.review.rating}/5</Text><Text style={styles.body}>{job.data.review.comment}</Text><Text style={styles.meta}>{t('status')}: {job.data.review.status}</Text>{!!job.data.review.reply && <Text style={styles.body}>{job.data.review.reply}</Text>}</View>}
        </View>;
      })}
    </>}
  </ScrollView>;
}

function Action({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={styles.button}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: theme.paper, flexGrow: 1, padding: 18, paddingBottom: 40 },
  heading: { color: theme.ink, fontWeight: '800', fontSize: 27, marginBottom: 8 },
  subtitle: { color: theme.muted, fontSize: 15, lineHeight: 22, marginBottom: 18 },
  card: { backgroundColor: theme.white, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.line, marginBottom: 13 },
  bid: { borderTopWidth: 1, borderTopColor: theme.line, paddingTop: 12, marginTop: 12 },
  title: { color: theme.ink, fontSize: 18, fontWeight: '700' }, meta: { color: theme.muted, marginTop: 6, fontSize: 14 },
  body: { color: theme.ink, marginTop: 8, fontSize: 15, lineHeight: 22 },
  section: { color: theme.ink, fontWeight: '700', marginTop: 18 },
  button: { backgroundColor: theme.ink, minHeight: 54, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: theme.white, fontWeight: '700', fontSize: 16 },
  spinner: { marginTop: 20 }, error: { color: theme.error, fontSize: 15 },
  notice: { color: theme.muted, fontSize: 14, lineHeight: 21, marginBottom: 15 },
  input: { minHeight: 50, borderWidth: 1, borderColor: theme.line, borderRadius: 9, padding: 11, marginTop: 12, backgroundColor: theme.white, fontSize: 16 },
  longInput: { minHeight: 100, textAlignVertical: 'top' },
  ratingRow: { flexDirection: 'row', gap: 7, marginVertical: 9 },
  rating: { minWidth: 46, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: theme.line },
  ratingSelected: { backgroundColor: theme.ink, borderColor: theme.ink },
});
