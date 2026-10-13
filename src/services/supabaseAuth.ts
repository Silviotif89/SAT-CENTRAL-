const SUPABASE_URL = 'https://etcgdcrmitnlpucckglt.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_KUiEoJtl1th9ojKnm_iM8w_AN3VtZec'
const SESSION_KEY = 'sat-central-supabase-session-v1'

export interface SatSession { access_token:string; refresh_token:string; expires_at?:number; user:{ email?:string } }

export const session = ():SatSession|null => {
  try { const raw=localStorage.getItem(SESSION_KEY); return raw?JSON.parse(raw) as SatSession:null } catch { return null }
}
export const saveSession=(value:SatSession)=>localStorage.setItem(SESSION_KEY,JSON.stringify(value))
export const clearSession=()=>localStorage.removeItem(SESSION_KEY)

export async function signIn(email:string,password:string){
  const response=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})})
  const payload=await response.json() as SatSession&{error_description?:string;message?:string}
  if(!response.ok||!payload.access_token)throw new Error(payload.error_description??payload.message??'No se pudo iniciar sesión.')
  saveSession(payload);return payload
}

export async function supabaseRequest(path:string,init:RequestInit={}){
  const active=session()
  if(!active?.access_token)throw new Error('La sesión ha vencido. Iniciá sesión nuevamente.')
  const headers=new Headers(init.headers)
  headers.set('apikey',SUPABASE_PUBLISHABLE_KEY);headers.set('Authorization',`Bearer ${active.access_token}`)
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...init,headers})
}
