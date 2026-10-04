import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from './supabase';
export type CredentialType = 'identity' | 'credential' | 'licence' | 'business' | 'industry_registration';
export type Credential = {
 id: string; provider_id: string; user_id: string; credential_type: CredentialType; qualification_name: string;
 field: string | null; level: string | null; issuing_organization: string; issuer_id: string | null;
 certificate_number: string | null; issue_date: string | null; expiry_date: string | null; document_path: string | null;
 status: 'self_reported' | 'pending' | 'verified' | 'rejected'; verification_method: string | null;
 verified_at: string | null; reviewed_by: string | null; review_note: string | null; created_at: string; updated_at: string;
};
export type Issuer = { id: string; name: string; website: string | null; credential_types: string[]; active: boolean; created_at: string };
export type CredentialInput = Pick<Credential,'provider_id'|'user_id'|'credential_type'|'qualification_name'|'issuing_organization'|'issuer_id'|'field'|'level'|'certificate_number'|'issue_date'|'expiry_date'>;
export async function credentialsFor(providerId: string) {
 const { data,error }=await supabase.from('provider_credentials').select('*').eq('provider_id',providerId).order('created_at',{ascending:false}).limit(100);
 if(error) throw error; return data;
}
export async function trustedIssuers() {
 const { data,error }=await supabase.from('trusted_issuers').select('*').eq('active',true).order('name').limit(500);
 if(error) throw error; return data;
}
export async function addCredential(input: CredentialInput) {
 const { error }=await supabase.from('provider_credentials').insert(input);
 if(error) throw error;
}
export async function uploadCredential(credential: Credential) {
 const result=await DocumentPicker.getDocumentAsync({type:['application/pdf','image/jpeg','image/png'],multiple:false,copyToCacheDirectory:true,base64:false});
 if(result.canceled) return;
 const asset=result.assets[0];
 const localFile=Platform.OS==='web' ? null : new File(asset.uri);
 try {
  const mime=asset.mimeType || '';
  if(!['application/pdf','image/jpeg','image/png'].includes(mime) || (asset.size || localFile?.size || 0)>10*1024*1024) throw new Error('invalid_document');
  const bytes=Platform.OS==='web' ? await asset.file!.arrayBuffer() : await localFile!.arrayBuffer();
  if(bytes.byteLength===0 || bytes.byteLength>10*1024*1024) throw new Error('invalid_document');
  const ext=mime==='application/pdf'?'pdf':mime==='image/jpeg'?'jpg':'png';
  const path=`${credential.user_id}/${credential.id}/${Date.now()}.${ext}`;
  const {error:uploadError}=await supabase.storage.from('credential-documents').upload(path,bytes,{contentType:mime,upsert:false});
  if(uploadError) throw uploadError;
  const {data,error}=await supabase.from('provider_credentials').update({document_path:path}).eq('id',credential.id).eq('status','self_reported').select('id');
  if(error || !data?.length) throw error || new Error('credential_changed');
 } finally {
  // The picker made this temporary copy; never delete the user's original file.
  if(localFile?.exists) localFile.delete();
 }
}
export async function submitCredential(id: string) {
 const {data,error}=await supabase.from('provider_credentials').update({status:'pending'}).eq('id',id).eq('status','self_reported').select('id');
 if(error || !data?.length) throw error || new Error('credential_changed');
}
export function credentialStatus(row: Credential) {
 return row.status==='verified' && row.expiry_date && row.expiry_date < new Date(Date.now()+5.5*60*60*1000).toISOString().slice(0,10) ? 'expired' : row.status;
}
