import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLanguage } from '../i18n';
import { addCredential, credentialsFor, credentialStatus, submitCredential, trustedIssuers, uploadCredential, type Credential, type CredentialType, type Issuer } from '../lib/credentials';
import { supabase } from '../lib/supabase';
import { ownedProfiles } from '../lib/skills';
import { theme } from '../theme';
const kinds = { identity:'typeIdentity',credential:'typeCredential',licence:'typeLicence',business:'typeBusiness',industry_registration:'typeIndustry' } as const;
const statuses = { self_reported:'credentialSelfReported',pending:'credentialPending',verified:'credentialVerified',rejected:'credentialRejected',expired:'credentialExpired' } as const;
export default function Credentials() {
 const { providerId }=useLocalSearchParams<{providerId:string}>();
 const { t }=useLanguage();
 const [rows,setRows]=useState<Credential[]>([]),[issuers,setIssuers]=useState<Issuer[]>([]);
 const [owner,setOwner]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(false);
 const [kind,setKind]=useState<CredentialType>('credential'),[name,setName]=useState(''),[organization,setOrganization]=useState(''),[issuer,setIssuer]=useState<string|null>(null);
 const [details,setDetails]=useState(false),[field,setField]=useState(''),[level,setLevel]=useState(''),[number,setNumber]=useState(''),[issued,setIssued]=useState(''),[expires,setExpires]=useState('');
 const generation=useRef(0),locked=useRef(false);
 const refresh=useCallback(async()=>{
  const ticket=++generation.current; setLoading(true);setError(false);
  try {
   const {data:{user},error:authError}=await supabase.auth.getUser();
   if(authError || !user || !providerId) throw new Error('sign_in_required');
   const profiles=await ownedProfiles(user.id);
   if(!profiles.some(p=>p.id===providerId)) throw new Error('not_owned');
   const [next,list]=await Promise.all([credentialsFor(providerId),trustedIssuers()]);
   if(ticket===generation.current){setRows(next);setIssuers(list);setOwner(user.id);}
  }catch{if(ticket===generation.current){setError(true);setOwner('');setRows([]);}}
  finally{if(ticket===generation.current)setLoading(false);}
 },[providerId]);
 useFocusEffect(useCallback(()=>{void refresh();return()=>{generation.current++;};},[refresh]));
 const run=async(action:()=>Promise<void>)=>{
  if(locked.current)return;locked.current=true;setBusy(true);setError(false);
  try{await action();await refresh();}catch{setError(true);}finally{locked.current=false;setBusy(false);}
 };
 const input=(label:Parameters<typeof t>[0],value:string,onChangeText:(s:string)=>void,maxLength=160)=><View><Text style={styles.label}>{t(label)}</Text><TextInput style={styles.input} accessibilityLabel={t(label)} value={value} onChangeText={onChangeText} maxLength={maxLength} editable={!busy}/></View>;
 return <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
  <Text style={styles.heading}>{t('credentials')}</Text><Text style={styles.body}>{t('credentialPrivacy')}</Text><Text style={styles.body}>{t('credentialLimits')}</Text>
  {loading&&<ActivityIndicator color={theme.goldText}/>}
  {error&&<Text style={styles.error} accessibilityRole="alert">{t('credentialError')}</Text>}
  <Pressable style={styles.secondary} disabled={busy||loading} onPress={()=>void refresh()}><Text>{t('retry')}</Text></Pressable>
  {rows.map(row=><View key={row.id} style={styles.card}>
   <Text style={styles.title}>{row.qualification_name}</Text><Text style={styles.body}>{row.issuing_organization}</Text>
   <Text style={styles.label}>{t(statuses[credentialStatus(row)])}</Text>
   {!!row.review_note&&<Text style={styles.body}>{row.review_note}</Text>}
   {!!row.expiry_date&&<Text style={styles.body}>{t('expiryDate')}: {row.expiry_date}</Text>}
   {row.status==='self_reported'&&<>
    <Pressable style={styles.button} disabled={busy} onPress={()=>void run(()=>uploadCredential(row))}><Text style={styles.buttonText}>{row.document_path?t('replaceDocument'):t('uploadDocument')}</Text></Pressable>
    {!!row.document_path&&<Pressable style={styles.button} disabled={busy} onPress={()=>void run(()=>submitCredential(row.id))}><Text style={styles.buttonText}>{t('requestVerification')}</Text></Pressable>}
   </>}
  </View>)}
  {!!owner&&!loading&&<View style={styles.card}>
   <Text style={styles.title}>{t('addCredential')}</Text>
   <Text style={styles.body}>{t('credentialKindHelp')}</Text>
   {(Object.keys(kinds) as CredentialType[]).map(value=><Pressable key={value} style={[styles.secondary,kind===value&&styles.selected]} accessibilityRole="button" accessibilityState={{selected:kind===value}} disabled={busy} onPress={()=>{setKind(value);setIssuer(null);}}><Text>{t(kinds[value])}</Text></Pressable>)}
   {input('qualificationName',name,setName)}
   <Text style={styles.label}>{t('trustedIssuer')}</Text>
   <Pressable style={[styles.secondary,issuer===null&&styles.selected]} onPress={()=>setIssuer(null)} disabled={busy}><Text>{t('otherIssuer')}</Text></Pressable>
   {issuers.filter(i=>i.credential_types.includes(kind)).map(i=><Pressable key={i.id} style={[styles.secondary,issuer===i.id&&styles.selected]} disabled={busy} onPress={()=>{setIssuer(i.id);setOrganization(i.name);}}><Text>{i.name}</Text></Pressable>)}
   {!issuer&&input('issuingOrganization',organization,setOrganization)}
   <Pressable style={styles.secondary} onPress={()=>setDetails(!details)}><Text>{t('credentialOptionalDetails')}</Text></Pressable>
   {details&&<>{input('credentialField',field,setField)}{input('credentialLevel',level,setLevel,100)}{input('certificateNumber',number,setNumber)}{input('issueDateInput',issued,setIssued,10)}{input('expiryDateInput',expires,setExpires,10)}</>}
   <Pressable style={styles.button} disabled={busy||name.trim().length<2||organization.trim().length<2} onPress={()=>void run(async()=>{
    if((issued&&!/^\d{4}-\d{2}-\d{2}$/.test(issued))||(expires&&!/^\d{4}-\d{2}-\d{2}$/.test(expires)))throw new Error('date');
    await addCredential({provider_id:providerId,user_id:owner,credential_type:kind,qualification_name:name.trim(),issuing_organization:organization.trim(),issuer_id:issuer,field:field.trim()||null,level:level.trim()||null,certificate_number:number.trim()||null,issue_date:issued||null,expiry_date:expires||null});
    setName('');setNumber('');setIssued('');setExpires('');setField('');setLevel('');
   })}><Text style={styles.buttonText}>{t('saveSelfReported')}</Text></Pressable>
  </View>}
 </ScrollView>;
}
const styles=StyleSheet.create({screen:{padding:22,gap:14,paddingBottom:40},heading:{fontSize:27,fontWeight:'800',color:theme.ink},title:{fontSize:20,fontWeight:'700',color:theme.ink},body:{fontSize:16,lineHeight:24,color:theme.muted},label:{fontSize:15,fontWeight:'700',color:theme.ink,marginBottom:6},error:{color:theme.error,fontSize:16},card:{padding:18,gap:12,backgroundColor:theme.white,borderRadius:14,borderWidth:1,borderColor:theme.line},input:{minHeight:50,borderWidth:1,borderColor:theme.line,borderRadius:8,padding:12,fontSize:16,color:theme.ink},button:{minHeight:50,padding:12,backgroundColor:theme.ink,borderRadius:9,justifyContent:'center',alignItems:'center'},buttonText:{fontSize:16,fontWeight:'700',color:theme.white},secondary:{minHeight:48,padding:12,borderWidth:1,borderColor:theme.line,borderRadius:8,justifyContent:'center'},selected:{backgroundColor:theme.selected}});
