import { SAT_VERSION } from '../config/version'
import { ACTIVITY_STORAGE_KEY } from './activityRepository'
import { DAILY_TASK_STORAGE_KEY } from './dailyTaskRepository'

export const TRANSPORT_REQUEST_STORAGE_KEY='sat-intur-transport-requests-v1'
const BACKUP_FORMAT='sat-intur-local-backup'
const BACKUP_VERSION=1

export interface SatLocalBackup{
 format:typeof BACKUP_FORMAT
 backupVersion:number
 appVersion:string
 exportedAt:string
 data:{activities:unknown[];dailyTasks:unknown[];transportDrafts:Record<string,unknown>}
}

const parseStored=<T,>(key:string,fallback:T):T=>{
 const raw=localStorage.getItem(key)
 if(!raw)return fallback
 try{return JSON.parse(raw) as T}catch{return fallback}
}

export const buildLocalBackup=():SatLocalBackup=>({
 format:BACKUP_FORMAT,
 backupVersion:BACKUP_VERSION,
 appVersion:SAT_VERSION,
 exportedAt:new Date().toISOString(),
 data:{
  activities:parseStored<unknown[]>(ACTIVITY_STORAGE_KEY,[]),
  dailyTasks:parseStored<unknown[]>(DAILY_TASK_STORAGE_KEY,[]),
  transportDrafts:parseStored<Record<string,unknown>>(TRANSPORT_REQUEST_STORAGE_KEY,{}),
 },
})

const safeDateStamp=()=>new Date().toISOString().replaceAll(':','-').replace(/\.\d{3}Z$/,'')

export const downloadLocalBackup=(backup:SatLocalBackup=buildLocalBackup(),prefix='SAT_respaldo_local')=>{
 const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'})
 const url=URL.createObjectURL(blob),anchor=document.createElement('a')
 anchor.href=url;anchor.download=`${prefix}_${safeDateStamp()}.json`;anchor.click()
 window.setTimeout(()=>URL.revokeObjectURL(url),1_000)
}

const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value)
const validActivity=(value:unknown)=>isRecord(value)&&typeof value.id==='string'&&typeof value.topic==='string'&&typeof value.date==='string'&&typeof value.delegationId==='string'&&['PROGRAMADA','DESARROLLADA','CANCELADA','REPROGRAMADA'].includes(String(value.status))

export const parseLocalBackup=(text:string):SatLocalBackup=>{
 let raw:unknown
 try{raw=JSON.parse(text)}catch{throw new Error('El archivo no contiene un JSON válido.')}
 if(!isRecord(raw)||raw.format!==BACKUP_FORMAT||raw.backupVersion!==BACKUP_VERSION||!isRecord(raw.data))throw new Error('El archivo no es un respaldo compatible del SAT.')
 const activities=raw.data.activities,dailyTasks=raw.data.dailyTasks,transportDrafts=raw.data.transportDrafts
 if(!Array.isArray(activities)||!activities.every(validActivity))throw new Error('El respaldo contiene actividades incompletas o inválidas.')
 if(!Array.isArray(dailyTasks)||!dailyTasks.every(item=>isRecord(item)&&typeof item.id==='string'&&typeof item.title==='string'&&typeof item.date==='string'))throw new Error('La agenda diaria del respaldo no es válida.')
 if(!isRecord(transportDrafts))throw new Error('Los borradores de transporte del respaldo no son válidos.')
 return raw as unknown as SatLocalBackup
}

export const restoreLocalBackup=(backup:SatLocalBackup)=>{
 downloadLocalBackup(buildLocalBackup(),'SAT_respaldo_automatico_antes_restaurar')
 localStorage.setItem(ACTIVITY_STORAGE_KEY,JSON.stringify(backup.data.activities))
 localStorage.setItem(DAILY_TASK_STORAGE_KEY,JSON.stringify(backup.data.dailyTasks))
 localStorage.setItem(TRANSPORT_REQUEST_STORAGE_KEY,JSON.stringify(backup.data.transportDrafts))
}
