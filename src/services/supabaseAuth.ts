const SUPABASE_URL = 'https://etcgdcrmitnlpucckglt.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_KUiEoJtl1th9ojKnm_iM8w_AN3VtZec'
const SESSION_KEY = 'sat-central-supabase-session-v1'

export interface SatSession { access_token:string; refresh_token:string; expires_at?:number; user:{ email?:string } }

export const session = ():SatSession|null => {
  try { const raw=localStorage.getItem(SESSION_KEY); return raw?JSON.parse(raw) as SatSession:null } catch { return null }
}
export const saveSession=(value:SatSession)=>localStorage.setItem(SESSION_KEY,JSON.stringify(value))
export const clearSession=()=>localStorage.removeItem(SESSION_KEY)

async function refreshSession(active:SatSession){
  const response=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:active.refresh_token})})
  const payload=await response.json() as SatSession
  if(!response.ok||!payload.access_token){clearSession();throw new Error('La sesión ha vencido. Iniciá sesión nuevamente.')}
  saveSession(payload);return payload
}

export async function signIn(email:string,password:string){
  const response=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})})
  const payload=await response.json() as SatSession&{error_description?:string;message?:string}
  if(!response.ok||!payload.access_token)throw new Error(payload.error_description??payload.message??'No se pudo iniciar sesión.')
  saveSession(payload);return payload
}

export async function supabaseRequest(path:string,init:RequestInit={}){
  let active=session()
  if(!active?.access_token)throw new Error('La sesión ha vencido. Iniciá sesión nuevamente.')
  if(active.expires_at&&active.expires_at*1000<=Date.now()+60_000)active=await refreshSession(active)
  const request=async()=>{const headers=new Headers(init.headers);headers.set('apikey',SUPABASE_PUBLISHABLE_KEY);headers.set('Authorization',`Bearer ${active!.access_token}`);return fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...init,headers})}
  let response=await request()
  if(response.status===401){active=await refreshSession(active);response=await request()}
  return response
}
