export const prerender = false
import type { APIRoute } from 'astro'
export const GET: APIRoute = async ({locals,url}) => {
 const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}
 if(!locals.user)return new Response('Sign in required',{status:401,headers})
 const {data:admin,error:authError}=await locals.supabase.rpc('is_admin')
 if(authError||admin!==true)return new Response('Administrator access required',{status:403,headers})
 const id=url.searchParams.get('id')||''
 if(!/^[0-9a-f-]{36}$/i.test(id))return new Response('Invalid credential',{status:400,headers})
 const {data,error}=await locals.supabase.from('provider_credentials').select('document_path').eq('id',id).single()
 if(error||!data?.document_path)return new Response('Document unavailable',{status:404,headers})
 const {data:signed,error:signError}=await locals.supabase.storage.from('credential-documents').createSignedUrl(data.document_path,60,{download:true})
 if(signError||!signed?.signedUrl)return new Response('Document unavailable',{status:503,headers})
 return new Response(null,{status:302,headers:{...headers,Location:signed.signedUrl}})
}
