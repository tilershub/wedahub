import { Link } from 'expo-router';
import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLanguage } from '../../i18n';
import { normalizeMobile } from '../../lib/phone';
import { configured, supabase } from '../../lib/supabase';
import { useMode } from '../../mode';
import { AppIcon, type IconName } from '../../components/AppIcon';
import { theme } from '../../theme';

export default function Account() {
  const { t, language, setLanguage } = useLanguage();
  const { mode, setMode } = useMode();
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
    const key = e.code || e.message;
    setError(key === 'invalid_phone' ? t('invalidPhone') : key === 'invalid_code' || key === 'otp_expired' ? t('invalidCode')
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
  const signOut = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setPhone(''); setSentTo(''); setCode('');
    } catch (e) { showError(e); } finally { setBusy(false); }
  };
  if (checking) return <ActivityIndicator style={{ flex: 1 }} color={theme.ink} />;
  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.heading}>{t('account')}</Text>
      <View style={styles.hero}>
        <View style={styles.avatar}><AppIcon name="user" size={30} color={theme.ink}/></View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>{user ? t('signedIn') : t('welcome')}</Text>
          <Text style={styles.heroDetail}>{user ? user.phone || user.email : t('tagline')}</Text>
        </View>
      </View>

      <Text style={styles.section}>{t('useAs')}</Text>
      <View style={styles.modeSwitch}>
        {(['customer', 'provider'] as const).map(value => {
          const selected = mode === value;
          return <Pressable key={value} style={[styles.mode, selected && styles.modeSelected]} onPress={() => setMode(value)}
            accessibilityRole="button" accessibilityState={{ selected }}>
            <AppIcon name={value === 'customer' ? 'home' : 'work'} color={theme.ink}/>
            <Text style={[styles.modeText, selected && styles.modeTextSelected]}>{t(value === 'customer' ? 'homeownerShort' : 'providerShort')}</Text>
          </Pressable>;
        })}
      </View>

      {!configured ? <Text accessibilityRole="alert" style={styles.error}>{t('setup')}</Text> : !user && <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>{t('signIn')}</Text>
        <Text style={styles.body}>{t('signInRequired')}</Text>
        <Text style={styles.label}>{sentTo ? t('code') : t('phone')}</Text>
        {sentTo ? <>
          <Text style={styles.body}>{t('sent')} {sentTo}</Text>
          <TextInput style={[styles.input, styles.code]} accessibilityLabel={t('code')} keyboardType="number-pad" textContentType="oneTimeCode"
            editable={!busy} value={code} onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))} maxLength={6}/>
          <Pressable style={[styles.button, busy && styles.disabled]} onPress={verify} disabled={busy} accessibilityRole="button">
            <Text style={styles.buttonText}>{t('verify')}</Text><AppIcon name="right" size={18} color={theme.paper}/>
          </Pressable>
          <Pressable onPress={() => { setSentTo(''); setCode(''); setError(''); }} disabled={busy} style={styles.secondary} accessibilityRole="button"><Text style={styles.secondaryText}>{t('change')}</Text></Pressable>
        </> : <>
          <TextInput style={styles.input} accessibilityLabel={t('phone')} keyboardType="phone-pad" textContentType="telephoneNumber"
            editable={!busy} value={phone} onChangeText={setPhone} placeholder={t('phoneHint')} placeholderTextColor={theme.placeholder}/>
          <Pressable style={[styles.button, busy && styles.disabled]} onPress={send} disabled={busy} accessibilityRole="button">
            <Text style={styles.buttonText}>{t('send')}</Text><AppIcon name="right" size={18} color={theme.paper}/>
          </Pressable>
        </>}
        {busy && <ActivityIndicator color={theme.ink}/>}
        <Text style={styles.help}>{t('existing')}</Text>
      </View>}

      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {user && <>
        <Text style={styles.section}>{t('manageWork')}</Text>
        <View style={styles.group}>
          <AccountRow href="/projects" icon="work" label={t(mode === 'provider' ? 'myWork' : 'myProjects')}/>
          <AccountRow href="/notifications" icon="bell" label={t('notifications')}/>
          <AccountRow href="/my-profiles" icon="user" label={t('myProfiles')}/>
        </View>
      </>}
      {mode === 'provider' && <Link href="/register-provider" asChild>
        <Pressable style={styles.recruit}><View style={styles.rowIcon}><AppIcon name="plus"/></View><View style={styles.rowCopy}>
          <Text style={styles.rowLabel}>{t('registerProvider')}</Text><Text style={styles.rowHelp}>{t('registrationHomeHelp')}</Text>
        </View><AppIcon name="right" size={18}/></Pressable>
      </Link>}
      <Text style={styles.section}>{t('selectLanguage')}</Text>
      <View style={styles.languages}>
        {([{value:'si',label:'සිංහල'},{value:'ta',label:'தமிழ்'},{value:'en',label:'English'}] as const).map(item =>
          <Pressable key={item.value} onPress={() => setLanguage(item.value)} style={[styles.language, language === item.value && styles.languageSelected]}
            accessibilityRole="button" accessibilityState={{selected:language === item.value}}>
            <Text style={[styles.languageText, language === item.value && styles.languageTextSelected]}>{item.label}</Text>
          </Pressable>)}
      </View>
      {user && <Pressable disabled={busy} onPress={() => void signOut()} accessibilityRole="button" style={styles.signOut}><Text style={styles.signOutText}>{t('signOut')}</Text></Pressable>}
      <Text style={styles.footer}>{t('tagline')}</Text>
    </ScrollView>
  </KeyboardAvoidingView>;
}
function AccountRow({href,icon,label}:{href:'/projects'|'/notifications'|'/my-profiles';icon:IconName;label:string}){
  return <Link href={href} asChild><Pressable style={styles.row}>
    <View style={styles.rowIcon}><AppIcon name={icon} size={22}/></View>
    <Text style={[styles.rowLabel,styles.rowCopy]}>{label}</Text><AppIcon name="right" size={18} color={theme.muted}/>
  </Pressable></Link>;
}
const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:theme.paper},
  screen:{padding:20,paddingBottom:36,width:'100%',maxWidth:600,alignSelf:'center',gap:14},
  heading:{fontSize:28,fontWeight:'800',color:theme.navyDark,marginTop:6},
  hero:{backgroundColor:theme.ink,borderRadius:24,padding:24,flexDirection:'row',alignItems:'center',gap:16},
  avatar:{width:64,height:64,borderRadius:22,backgroundColor:theme.gold,alignItems:'center',justifyContent:'center'},
  heroCopy:{flex:1,gap:7},heroTitle:{fontSize:22,fontWeight:'700',color:theme.paper},
  heroDetail:{fontSize:13,lineHeight:20,color:theme.goldLight},
  section:{color:theme.muted,fontSize:14,fontWeight:'700',marginTop:8},
  modeSwitch:{flexDirection:'row',backgroundColor:theme.line,padding:5,borderRadius:18,gap:5},
  mode:{flex:1,minHeight:64,borderRadius:14,alignItems:'center',justifyContent:'center',gap:6,padding:10},
  modeSelected:{backgroundColor:theme.gold},
  modeText:{color:theme.ink,fontSize:14,textAlign:'center'},modeTextSelected:{fontWeight:'800'},
  card:{backgroundColor:theme.white,borderRadius:22,padding:22,gap:12,borderWidth:1,borderColor:theme.line},
  cardTitle:{fontSize:21,fontWeight:'700',color:theme.navyDark},
  body:{fontSize:15,lineHeight:23,color:theme.muted},
  label:{fontSize:14,fontWeight:'700',color:theme.ink,marginTop:4},
  input:{borderWidth:1,borderColor:theme.line,backgroundColor:theme.paper,borderRadius:14,minHeight:58,paddingHorizontal:16,fontSize:19,color:theme.navyDark},
  code:{letterSpacing:8,textAlign:'center',fontSize:26},
  button:{backgroundColor:theme.ink,borderRadius:14,minHeight:56,padding:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10},
  buttonText:{color:theme.paper,fontSize:16,fontWeight:'700'},disabled:{opacity:0.55},
  secondary:{minHeight:48,justifyContent:'center',alignItems:'center'},secondaryText:{color:theme.ink,fontSize:15,fontWeight:'600'},
  help:{fontSize:13,lineHeight:21,color:theme.muted},
  group:{backgroundColor:theme.white,borderRadius:20,paddingHorizontal:16,borderWidth:1,borderColor:theme.line},
  row:{flexDirection:'row',alignItems:'center',gap:12,minHeight:76,paddingVertical:14},
  rowIcon:{width:42,height:42,borderRadius:14,backgroundColor:theme.paper,alignItems:'center',justifyContent:'center'},
  rowCopy:{flex:1},rowLabel:{fontSize:16,fontWeight:'600',color:theme.ink},rowHelp:{fontSize:13,color:theme.muted,lineHeight:20,marginTop:5},
  recruit:{flexDirection:'row',alignItems:'center',padding:18,gap:12,borderRadius:20,borderWidth:1,borderColor:theme.gold,backgroundColor:theme.paper,marginTop:4},
  languages:{flexDirection:'row',flexWrap:'wrap',gap:8},
  language:{flexGrow:1,minHeight:50,paddingHorizontal:16,paddingVertical:13,borderRadius:13,backgroundColor:theme.white,borderWidth:1,borderColor:theme.line,alignItems:'center',justifyContent:'center'},
  languageSelected:{backgroundColor:theme.ink,borderColor:theme.ink},languageText:{color:theme.ink,fontSize:15},languageTextSelected:{color:theme.paper,fontWeight:'700'},
  signOut:{minHeight:52,alignItems:'center',justifyContent:'center',marginTop:8},signOutText:{color:theme.error,fontSize:15,fontWeight:'600'},
  footer:{fontSize:10,letterSpacing:1.2,color:theme.muted,textAlign:'center',marginTop:12},
  error:{color:theme.error,fontSize:15,lineHeight:22},
});
