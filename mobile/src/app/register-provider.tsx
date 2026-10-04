import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { professions } from '../data/professions';
import { useLanguage } from '../i18n';
import { registerProvider, registrationState } from '../lib/registration';
import { configured } from '../lib/supabase';
import { theme } from '../theme';

export default function RegisterProvider() {
  const { t, language } = useLanguage();
  const [state, setState] = useState<Awaited<ReturnType<typeof registrationState>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const lock = useRef(false);
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setFailed(false);
    if (!configured) { setLoading(false); return; }
    registrationState().then(next => {
      if (!active) return;
      setState(next);
    }).catch(() => { if (active) setFailed(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // Retry intentionally restarts the focused load without discarding form values.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retry]));
  const submit = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      await registerProvider({ name, profession });
      setSubmitted(true);
    } catch (value) {
      const code = value instanceof Error ? value.message : '';
      setError(t(code === 'invalid_phone' ? 'invalidPhone' : code === 'invalid_registration' ? 'simpleRegistrationValidation'
        : code === 'registration_exists' ? 'registrationExists' : code === 'sign_in_required' ? 'signInRequired' : 'saveFailed'));
    } finally { lock.current = false; setBusy(false); }
  };
  const pending = state?.submissions.some(item => item.status === 'pending_review');
  const category = professions.find(item => item.value === profession);
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>{t('registerProvider')}</Text>
      {loading ? <ActivityIndicator color={theme.goldText} /> : !configured ? <Text style={styles.body}>{t('setup')}</Text>
        : failed ? <Pressable style={styles.button} onPress={() => setRetry(value => value + 1)}><Text style={styles.buttonText}>{t('tryAgain')}</Text></Pressable>
        : !state?.user ? <><Text style={styles.body}>{t('registrationSignIn')}</Text><Link href="/account" style={styles.link}>{t('signIn')}</Link></>
        : state.hasProfile ? <><Text style={styles.body}>{t('registrationExists')}</Text><Link href="/my-profiles" style={styles.link}>{t('myProfiles')}</Link></>
        : submitted || pending ? <View style={styles.card}><Text style={styles.title}>{t('registrationReceived')}</Text><Text style={styles.body}>{t('registrationPending')}</Text><Link href="/account" style={styles.link}>{t('account')}</Link></View>
        : <>
          <Text style={styles.body}>{t('simpleRegistration')}</Text>
          {step === 1 ? <>
            <Text style={styles.title}>{t('selectProfession')}</Text>
            <TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder={t('search')} accessibilityLabel={t('search')} />
            {professions.filter(item => [item.en, item.si, item.ta].some(label => label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))).map(item =>
              <Pressable key={item.value} style={[styles.choice, profession === item.value && styles.selected]} accessibilityRole="radio" accessibilityState={{ checked: profession === item.value }} onPress={() => setProfession(item.value)}><Text style={styles.title}>{item[language]}</Text></Pressable>)}
            <Pressable style={[styles.button, !profession && styles.disabled]} disabled={!profession} onPress={() => setStep(2)} accessibilityRole="button"><Text style={styles.buttonText}>{t('continue')}</Text></Pressable>
          </> : <>
            <Pressable style={styles.choice} onPress={() => setStep(1)} accessibilityRole="button"><Text style={styles.title}>{category?.[language]}</Text><Text style={styles.body}>{t('changeProfession')}</Text></Pressable>
            <Field label={t('profileName')} value={name} setValue={setName} maxLength={100} />
            <Text style={styles.body}>{t('phone')}: {state.user.phone}</Text>
            <Text style={styles.body}>{t('publicContactHelp')}</Text>
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <Pressable style={[styles.button, busy && styles.disabled]} disabled={busy} onPress={() => void submit()} accessibilityRole="button"><Text style={styles.buttonText}>{busy ? t('saving') : t('submitRegistration')}</Text></Pressable>
          </>}
        </>}
    </ScrollView>
  </KeyboardAvoidingView>;
}

function Field({ label, value, setValue, maxLength, multiline, phone }: { label: string; value: string; setValue: (value: string) => void; maxLength: number; multiline?: boolean; phone?: boolean }) {
  return <View><Text style={styles.label}>{label}</Text><TextInput style={[styles.input, multiline && styles.multiline]} accessibilityLabel={label} value={value} onChangeText={setValue} maxLength={maxLength} multiline={multiline} keyboardType={phone ? 'phone-pad' : 'default'} /></View>;
}
const styles = StyleSheet.create({
  screen: { padding: 20, paddingBottom: 44 }, heading: { color: theme.ink, fontSize: 26, fontWeight: '800', marginBottom: 14 },
  title: { color: theme.ink, fontSize: 17, fontWeight: '700' }, body: { color: theme.muted, fontSize: 15, lineHeight: 24, marginVertical: 10 },
  label: { color: theme.ink, fontSize: 15, fontWeight: '700', marginTop: 14 },
  choice: { minHeight: 54, padding: 14, marginVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.white },
  selected: { borderColor: theme.goldText, borderWidth: 2 }, card: { backgroundColor: theme.white, borderRadius: 12, padding: 18 },
  input: { borderWidth: 1, borderColor: theme.line, backgroundColor: theme.white, borderRadius: 9, minHeight: 54, fontSize: 16, padding: 12, marginVertical: 8 },
  multiline: { minHeight: 100, textAlignVertical: 'top' }, button: { minHeight: 54, borderRadius: 10, backgroundColor: theme.ink, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  buttonText: { color: theme.white, fontWeight: '700', fontSize: 16 }, disabled: { opacity: 0.5 }, link: { color: theme.goldText, fontSize: 17, paddingVertical: 16 }, error: { color: theme.error, fontSize: 15 },
});
