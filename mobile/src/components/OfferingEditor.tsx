import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useLanguage } from '../i18n';
import { priceLabels, removeOffering, saveOffering, type Offering, type PricingModel } from '../lib/profile-editing';
import { editorStyles as s } from './profile-editor-styles';
export function OfferingEditor({providerId,rows,onChange}:{providerId:string;rows:Offering[];onChange:()=>Promise<void>}){
 const {t}=useLanguage();
 const [existing,setExisting]=useState<Offering|undefined>(),[open,setOpen]=useState(false),[title,setTitle]=useState(''),[description,setDescription]=useState('');
 const [model,setModel]=useState<PricingModel>('quotation'),[amount,setAmount]=useState(''),[maximum,setMaximum]=useState(''),[unit,setUnit]=useState(''),[duration,setDuration]=useState('120');
 const [busy,setBusy]=useState(false),[error,setError]=useState(false),[deleting,setDeleting]=useState('');
 const edit=(row?:Offering)=>{setExisting(row);setTitle(row?.title||'');setDescription(row?.description||'');setModel(row?.pricing_model||'quotation');setAmount(row?.amount?.toString()||'');setMaximum(row?.maximum_amount?.toString()||'');setUnit(row?.unit_label||'');setDuration(row?.duration_minutes?.toString()||'120');setOpen(true);setError(false);};
 const run=async(fn:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError(false);try{await fn();await onChange();setOpen(false);setDeleting('');}catch{setError(true);}finally{setBusy(false);}};
 const field=(label:Parameters<typeof t>[0],value:string,set:(v:string)=>void,numeric=false,maxLength=120)=><View><Text style={s.label}>{t(label)}</Text><TextInput style={s.input} accessibilityLabel={t(label)} value={value} onChangeText={set} editable={!busy} maxLength={maxLength} keyboardType={numeric?'decimal-pad':'default'}/></View>;
 return <View style={s.card}>
  <Text style={s.title}>{t('serviceMenu')}</Text><Text style={s.body}>{t('serviceMenuHelp')}</Text>
  {rows.map(row=><View key={row.id} style={s.row}><Text style={s.label}>{row.title}</Text><Text style={s.body}>{row.amount===null?t('rateQuote'):`LKR ${row.amount.toLocaleString()} · ${t(priceLabels[row.pricing_model])}`}</Text>
   <Pressable accessibilityRole="button" style={s.secondary} disabled={busy} onPress={()=>edit(row)}><Text>{t('editSection')}</Text></Pressable>
   <Pressable accessibilityRole="button" style={s.secondary} disabled={busy} onPress={()=>deleting===row.id?void run(()=>removeOffering(row)):setDeleting(row.id)}><Text>{t(deleting===row.id?'confirmRemoveService':'removeService')}</Text></Pressable>
  </View>)}
  {error&&<Text style={s.error} accessibilityRole="alert">{t('profileSaveError')}</Text>}
  {!open?<Pressable accessibilityRole="button" style={s.button} onPress={()=>edit()}><Text style={s.buttonText}>{t('addServicePrice')}</Text></Pressable>:<View style={s.row}>
   {field('serviceTitle',title,setTitle)}{field('serviceDescription',description,setDescription,false,1000)}
   {(Object.keys(priceLabels) as PricingModel[]).map(value=><Pressable accessibilityRole="radio" accessibilityState={{checked:model===value}} key={value} style={[s.secondary,model===value&&s.selected]} disabled={busy} onPress={()=>setModel(value)}><Text>{t(priceLabels[value])}</Text></Pressable>)}
   {model!=='quotation'&&field('priceLkr',amount,setAmount,true)}
   {model==='range'&&field('maximumPrice',maximum,setMaximum,true)}
   {model==='per_unit'&&field('priceUnit',unit,setUnit,false,60)}
   {model==='session'&&field('sessionMinutes',duration,setDuration,true)}
   <Pressable accessibilityRole="button" style={s.button} disabled={busy} onPress={()=>void run(async()=>{
    if(title.trim().length<2||(model!=='quotation'&&(!amount.trim()||!Number.isFinite(Number(amount)))))throw new Error('invalid');
    await saveOffering({provider_id:providerId,title:title.trim(),description:description.trim()||null,pricing_model:model,amount:model==='quotation'?null:Number(amount),maximum_amount:model==='range'&&maximum.trim()?Number(maximum):null,unit_label:model==='per_unit'?unit.trim():null,duration_minutes:model==='session'?Number(duration):null},existing);
   })}><Text style={s.buttonText}>{t('saveSection')}</Text></Pressable>
   <Pressable accessibilityRole="button" style={s.secondary} disabled={busy} onPress={()=>setOpen(false)}><Text>{t('cancelEdit')}</Text></Pressable>
  </View>}
 </View>;
}
