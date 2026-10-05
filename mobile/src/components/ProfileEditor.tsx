import { Link } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { useLanguage } from '../i18n';
import { pickProfileImage, saveProfile, type EditableProfile, type Offering } from '../lib/profile-editing';
import { editorStyles as s } from './profile-editor-styles';
import { AppIcon } from './AppIcon';
import { ServiceAreaEditor } from './ServiceAreaEditor';
import { OfferingEditor } from './OfferingEditor';
export function ProfileEditor({initial,offerings,onOfferingsChange,onDone}:{initial:EditableProfile;offerings:Offering[];onOfferingsChange:()=>Promise<void>;onDone:()=>void}){
 const {t}=useLanguage();const [profile,setProfile]=useState(initial);
 const [section,setSection]=useState(''),[name,setName]=useState(initial.name),[about,setAbout]=useState(initial.description||''),[city,setCity]=useState(initial.city||''),[district,setDistrict]=useState(initial.district||''),[experience,setExperience]=useState(initial.experience_years?.toString()||'');
 const [busy,setBusy]=useState(false),[error,setError]=useState(false),[saved,setSaved]=useState(false);
 const save=async(patch:Parameters<typeof saveProfile>[1])=>{setProfile(await saveProfile(profile,patch));setSaved(true);};
 const run=async(fn:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError(false);setSaved(false);try{await fn();}catch{setError(true);}finally{setBusy(false);}};
 const photo=async(kind:'profiles'|'covers'|'portfolio')=>{const url=await pickProfileImage(profile.id,kind);if(!url)return;await save(kind==='profiles'?{profile_image:url}:kind==='covers'?{cover_image:url}:{gallery:[...(profile.gallery||[]),url]});};
 const field=(label:Parameters<typeof t>[0],value:string,set:(v:string)=>void,max=100,multiline=false)=><View><Text style={s.label}>{t(label)}</Text><TextInput accessibilityLabel={t(label)} style={s.input} value={value} onChangeText={set} maxLength={max} multiline={multiline} editable={!busy}/></View>;
 return <View style={s.wrapper}>
  <Text style={s.title}>{t('editProfile')}</Text><Text style={s.body}>{t('editProfileHelp')}</Text>
  {error&&<Text style={s.error} accessibilityRole="alert">{t('profileSaveError')}</Text>}{saved&&<Text style={s.body} accessibilityLiveRegion="polite">{t('saved')}</Text>}
  <Pressable accessibilityRole="button" style={s.button} disabled={busy} onPress={onDone}><Text style={s.buttonText}>{t('viewProfile')}</Text></Pressable>
  <View style={s.card}><Pressable accessibilityRole="button" style={s.secondary} onPress={()=>setSection(section==='about'?'':'about')}><Text>{t('editBasicDetails')}</Text></Pressable>
   {section==='about'&&<>{field('profileName',name,setName)}{field('about',about,setAbout,2000,true)}{field('city',city,setCity)}{field('district',district,setDistrict)}{field('experienceYears',experience,setExperience,2)}
    <Pressable accessibilityRole="button" style={s.button} disabled={busy} onPress={()=>void run(async()=>{
     if(name.trim().length<2||(experience&&(!/^\d{1,2}$/.test(experience)||Number(experience)>80)))throw new Error('invalid');
     await save({name:name.trim(),description:about.trim()||null,city:city.trim()||null,district:district.trim()||null,experience_years:experience?Number(experience):null});setSection('');
    })}><Text style={s.buttonText}>{t('saveSection')}</Text></Pressable>
   </>}
  </View>
  <View style={s.card}><Text style={s.title}>{t('profilePhotos')}</Text><Text style={s.body}>{t('publicPhotosHelp')}</Text>
   <Pressable accessibilityRole="button" style={s.secondary} disabled={busy} onPress={()=>void run(()=>photo('profiles'))}><Text>{t('changeProfilePhoto')}</Text></Pressable>
   <Pressable accessibilityRole="button" style={s.secondary} disabled={busy} onPress={()=>void run(()=>photo('covers'))}><Text>{t('changeCoverPhoto')}</Text></Pressable>
  </View>
  <View style={s.card}><Text style={s.title}>{t('portfolio')}</Text>
   {(profile.gallery||[]).map((url,index)=><View key={`${url}-${index}`}><Image source={{uri:url}} style={s.photo}/><Pressable accessibilityRole="button" style={s.secondary} disabled={busy} onPress={()=>void run(()=>save({gallery:profile.gallery!.filter((_,i)=>i!==index)}))}><Text>{t('removeFromProfile')}</Text></Pressable></View>)}
   <Pressable accessibilityRole="button" style={s.button} disabled={busy||(profile.gallery?.length||0)>=24} onPress={()=>void run(()=>photo('portfolio'))}><Text style={s.buttonText}>{t('addPortfolioPhoto')}</Text></Pressable>
  </View>
  <Text style={s.title}>{t('services')}</Text>
  <OfferingEditor providerId={profile.id} rows={offerings} onChange={onOfferingsChange}/>
  <ServiceAreaEditor providerId={profile.id} initialAreas={profile.service_areas||[]}/>
  <Text style={s.title}>{t('skillsAndCertificates')}</Text><AppIcon name="certificate"/>
  <Link href="/my-profiles" style={s.secondary}>{t('editSkills')}</Link>
  <Link href={{pathname:'/credentials',params:{providerId:profile.id}}} style={s.secondary}>{t('credentials')}</Link>
 </View>;
}
