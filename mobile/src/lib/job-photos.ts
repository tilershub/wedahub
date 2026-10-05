import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from './supabase';
export async function uploadJobPhoto():Promise<string|null>{
 const result=await DocumentPicker.getDocumentAsync({type:['image/jpeg','image/png'],copyToCacheDirectory:true,base64:false,multiple:false});
 if(result.canceled)return null;
 const asset=result.assets[0],file=Platform.OS==='web'?null:new File(asset.uri);
 try{
  const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)throw new Error('sign_in_required');
  const mime=asset.mimeType||'';
  if(!['image/jpeg','image/png'].includes(mime)||(asset.size||file?.size||0)>5*1024*1024)throw new Error('invalid_image');
  const bytes=Platform.OS==='web'?await asset.file!.arrayBuffer():await file!.arrayBuffer();
  if(!bytes.byteLength||bytes.byteLength>5*1024*1024)throw new Error('invalid_image');
  const path=`${user.id}/${Date.now()}-${Math.random().toString(16).slice(2)}.${mime==='image/png'?'png':'jpg'}`;
  const {error}=await supabase.storage.from('job-images').upload(path,bytes,{contentType:mime,upsert:false});if(error)throw error;
  return supabase.storage.from('job-images').getPublicUrl(path).data.publicUrl;
 }finally{if(file?.exists)file.delete();}
}
