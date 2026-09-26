import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { useLanguage } from '../i18n';
import { normalizeMobile } from '../lib/phone';
import { configured, supabase } from '../lib/supabase';
import { theme } from '../theme';

export default function Account() {
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(configured);
  const [phone, setPhone] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retryAt, setRetryAt] = useState(0);
  useEffect(() => {
    if (!configured) return;
    let active = true;
    supabase.auth.getUser().then(({ data }) => { if (active) setUser(data.user); }).finally(() => { if (active) setChecking(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { if (active) setUser(session?.user || null); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  const showError = (value: unknown) => {
    const e = value as { message?: string; status?: number; code?: string };
    setError(e.code === 'invalid_phone' ? t('invalidPhone') : e.code === 'invalid_code' || e.code === 'otp_expired' ? t('invalidCode')
      : e.status === 429 || e.code === 'over_sms_send_rate_limit' ? t('resendWait') : t('authError'));
  };
  const send = async () => {
    if (busy || Date.now() < retryAt) { if (Date.now() < retryAt) setError(t('resendWait')); return; }
    setBusy(true); setError('');
    try {
      const normalized = normalizeMobile(phone);
      const { error: authError } = await supabase.auth.signInWithOtp({ phone: normalized, options: { channel: 'sms' } });
      if (authError) throw authError;
      setSentTo(normalized); setRetryAt(Date.now() + 60_000);
    } catch (e) { showError(e); } finally { setBusy(false); }
  };
  const verify = async () => {
    if (busy) return;
    if (!/^\d{6}$/.test(code)) { setError(t('invalidCode')); return; }
    setBusy(true); setError('');
    try {
      const { data, error: authError } = await supabase.auth.verifyOtp({ phone: sentTo, token: code, type: 'sms' });
      if (authError || !data.user) throw authError || new Error('verification_failed');
      setUser(data.user); setCode('');
    } catch (e) { showError(e); } finally { setBusy(false); }
  };
  if (checking) return <ActivityIndicator style={{ flex: 1 }} color={theme.goldText} />;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>{t('account')}</Text>
      {!configured ? <Text style={styles.notice}>{t('setup')}</Text> : user ? <>
        <Text style={styles.body}>{t('signedIn')}: {user.phone || user.email}</Text>
        <Pressable style={styles.button} accessibilityRole="button" onPress={() => void supabase.auth.signOut()}><Text style={styles.buttonText}>{t('signOut')}</Text></Pressable>
      </> : <>
        <Text style={styles.body}>{t('signInRequired')}</Text>
        <Text style={styles.label}>{sentTo ? t('code') : t('phone')}</Text>
        {sentTo ? <>
          <Text style={styles.body}>{t('sent')} {sentTo}</Text>
          <TextInput style={styles.input} accessibilityLabel={t('code')} keyboardType="number-pad" textContentType="oneTimeCode"
            value={code} onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))} maxLength={6} />
          <Pressable style={styles.button} onPress={verify} disabled={busy} accessibilityRole="button"><Text style={styles.buttonText}>{t('verify')}</Text></Pressable>
          <Pressable onPress={() => { setSentTo(''); setCode(''); setError(''); }} style={styles.secondary} accessibilityRole="button"><Text style={styles.secondaryText}>{t('change')}</Text></Pressable>
        </> : <>
          <TextInput style={styles.input} accessibilityLabel={t('phone')} keyboardType="phone-pad" textContentType="telephoneNumber"
            value={phone} onChangeText={setPhone} placeholder={t('phoneHint')} placeholderTextColor="#777" />
          <Pressable style={styles.button} onPress={send} disabled={busy} accessibilityRole="button"><Text style={styles.buttonText}>{t('send')}</Text></Pressable>
        </>}
        {busy && <ActivityIndicator color={theme.goldText} style={{ marginTop: 15 }} />}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <Text style={styles.help}>{t('existing')}</Text>
      </>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  screen: { padding: 24, paddingTop: 34, flexGrow: 1 }, heading: { color: theme.ink, fontSize: 27, fontWeight: '800', marginBottom: 18 },
  label: { fontSize: 16, color: theme.ink, fontWeight: '700', marginTop: 18, marginBottom: 8 },
  body: { fontSize: 16, lineHeight: 24, color: theme.muted, marginBottom: 12 }, input: { borderWidth: 1, borderColor: theme.line, backgroundColor: theme.white, borderRadius: 10, padding: 14, minHeight: 54, fontSize: 18 },
  button: { backgroundColor: theme.ink, borderRadius: 10, minHeight: 54, padding: 12, justifyContent: 'center', alignItems: 'center', marginTop: 14 },
  buttonText: { color: theme.white, fontSize: 16, fontWeight: '700' }, secondary: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  secondaryText: { color: theme.goldText, fontSize: 15 }, help: { marginTop: 28, color: theme.muted, lineHeight: 23, fontSize: 14 },
  error: { color: theme.error, fontSize: 15, marginTop: 12 }, notice: { color: theme.error, fontSize: 16 },
});
