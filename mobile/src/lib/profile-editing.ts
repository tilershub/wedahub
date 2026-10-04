import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import type { Database } from '../types/database';
export type EditableProfile = Pick<Database['public']['Tables']['providers']['Row'],'id'|'name'|'description'|'city'|'district'|'experience_years'|'profile_image'|'cover_image'|'gallery'|'service_areas'|'updated_at'>;
const columns='id,name,description,city,district,experience_years,profile_image,cover_image,gallery,service_areas,updated_at';
export async function editableProfile(id: string): Promise<EditableProfile|null> {
 const {data:{user}}=await supabase.auth.getUser(); if(!user)return null;
 const {data,error}=await supabase.from('providers').select(columns).eq('id',id).eq('user_id',user.id).is('merged_into',null).maybeSingle();
 if(error)throw error;return data;
}
export async function saveProfile(profile: EditableProfile, patch: Partial<Omit<EditableProfile,'id'|'updated_at'>>) {
 const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('sign_in_required');
 // A strict allowlist prevents accidental writes to ratings, badges or ownership.
 const allowed=['name','description','city','district','experience_years','profile_image','cover_image','gallery','service_areas'];
 if(Object.keys(patch).some(key=>!allowed.includes(key)))throw new Error('invalid_field');
 let query=supabase.from('providers').update({...patch,updated_at:new Date().toISOString()}).eq('id',profile.id).eq('user_id',user.id).is('merged_into',null);
 query=profile.updated_at?query.eq('updated_at',profile.updated_at):query.is('updated_at',null);
 const {data,error}=await query.select(columns).single();if(error||!data)throw error||new Error('profile_changed');return data;
}
export async function pickProfileImage(providerId: string, kind: 'profiles'|'covers'|'portfolio'): Promise<string|null> {
 const selected=await DocumentPicker.getDocumentAsync({type:['image/jpeg','image/png'],copyToCacheDirectory:true,multiple:false,base64:false});
 if(selected.canceled)return null;
 const asset=selected.assets[0],file=Platform.OS==='web'?null:new File(asset.uri);
 try{
  const {data:{user}}=await supabase.auth.getUser();if(!user||!await editableProfile(providerId))throw new Error('not_owned');
  if(!['image/jpeg','image/png'].includes(asset.mimeType||'')||(asset.size||file?.size||0)>5*1024*1024)throw new Error('image_size');
  const bytes=Platform.OS==='web'?await asset.file!.arrayBuffer():await file!.arrayBuffer();
  if(!bytes.byteLength||bytes.byteLength>5*1024*1024)throw new Error('image_size');
  const path=`${kind}/${user.id}-${Date.now()}.${asset.mimeType==='image/png'?'png':'jpg'}`;
  const {error}=await supabase.storage.from('provider-assets').upload(path,bytes,{contentType:asset.mimeType,upsert:false});if(error)throw error;
  return supabase.storage.from('provider-assets').getPublicUrl(path).data.publicUrl;
 }finally{if(file?.exists)file.delete();}
}
export type PricingModel='hourly'|'daily'|'per_m2'|'per_sqft'|'per_unit'|'fixed'|'starting_from'|'range'|'quotation'|'session';
export type Offering={id:string;provider_id:string;title:string;description:string|null;pricing_model:PricingModel;amount:number|null;maximum_amount:number|null;unit_label:string|null;duration_minutes:number|null;created_at:string;updated_at:string};
export type OfferingInput=Omit<Offering,'id'|'created_at'|'updated_at'>;
export const priceLabels={hourly:'rateHourly',daily:'rateDaily',per_m2:'rateM2',per_sqft:'rateSqft',per_unit:'rateUnit',fixed:'rateFixed',starting_from:'rateStarting',range:'rateRange',quotation:'rateQuote',session:'rateSession'} as const;
export async function serviceOfferings(providerId:string){
 const {data,error}=await supabase.from('provider_service_offerings').select('*').eq('provider_id',providerId).order('created_at');if(error)throw error;return data;
}
export async function saveOffering(input:OfferingInput, existing?:Offering){
 const query=existing?supabase.from('provider_service_offerings').update(input).eq('id',existing.id).eq('provider_id',existing.provider_id).eq('updated_at',existing.updated_at):supabase.from('provider_service_offerings').insert(input);
 const {data,error}=await query.select('id').single();if(error||!data)throw error||new Error('service_changed');
}
export async function removeOffering(row:Offering){
 const {data,error}=await supabase.from('provider_service_offerings').delete().eq('id',row.id).eq('provider_id',row.provider_id).eq('updated_at',row.updated_at).select('id').single();if(error||!data)throw error||new Error('service_changed');
}
