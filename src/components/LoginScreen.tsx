import { useState,type FormEvent } from 'react'
import { signIn } from '../services/supabaseAuth'

export function LoginScreen({onAuthenticated}:{onAuthenticated:()=>void}){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false)
 const submit=async(event:FormEvent)=>{event.preventDefault();setError('');setSaving(true);try{await signIn(email.trim(),password);onAuthenticated()}catch(reason){setError(reason instanceof Error?reason.message:'No se pudo iniciar sesión.')}finally{setSaving(false)}}
 return <main className="login-shell"><form className="login-card" onSubmit={submit}><div className="login-mark">INTUR</div><p>Sistema de Acompañamiento Técnico</p><h1>SAT Central</h1><span>Ingresá con tu cuenta administradora para consultar y actualizar los registros protegidos.</span><label>Correo electrónico<input type="email" required autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/></label><label>Contraseña<input type="password" required autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)}/></label>{error&&<div className="form-error">{error}</div>}<button className="button primary" disabled={saving}>{saving?'Ingresando...':'Ingresar al SAT'}</button></form></main>
}
