import { septemberActivities } from '../data/septemberActivities'
import { octoberActivities } from '../data/octoberActivities'
import {collapseKnownMatagalpaDuplicate} from '../lib/duplicateActivities'
import type { Activity } from '../types'

export interface ActivityRepository { list():Promise<Activity[]>; save(items:Activity[]):Promise<void> }
export const ACTIVITY_STORAGE_KEY='sat-intur-september-2026-v4'
const OCTOBER_MIGRATION_KEY='sat-intur-october-2026-imported-v2'
const initialActivities=[...septemberActivities,...octoberActivities]
const fingerprint=(activity:Activity)=>`${activity.delegationId}|${activity.date}|${activity.topic.trim().toLocaleLowerCase('es')}`
export const localActivityRepository:ActivityRepository={
 async list(){
  const raw=localStorage.getItem(ACTIVITY_STORAGE_KEY)
  if(!raw){const cleaned=collapseKnownMatagalpaDuplicate(initialActivities);localStorage.setItem(ACTIVITY_STORAGE_KEY,JSON.stringify(cleaned));localStorage.setItem(OCTOBER_MIGRATION_KEY,'1');return cleaned}
  try{
   const stored=JSON.parse(raw) as Activity[]
   const migrated=localStorage.getItem(OCTOBER_MIGRATION_KEY)?stored:(()=>{const known=new Set(stored.map(fingerprint)),additions=octoberActivities.filter(activity=>!known.has(fingerprint(activity)));return [...stored,...additions]})()
   const cleaned=collapseKnownMatagalpaDuplicate(migrated)
   if(cleaned.length!==stored.length||!localStorage.getItem(OCTOBER_MIGRATION_KEY))localStorage.setItem(ACTIVITY_STORAGE_KEY,JSON.stringify(cleaned))
   localStorage.setItem(OCTOBER_MIGRATION_KEY,'1');return cleaned
  }catch{localStorage.setItem(ACTIVITY_STORAGE_KEY,JSON.stringify(initialActivities));localStorage.setItem(OCTOBER_MIGRATION_KEY,'1');return initialActivities}
 },
 async save(items){localStorage.setItem(ACTIVITY_STORAGE_KEY,JSON.stringify(items))},
}

// Sustituir esta implementación por SupabaseActivityRepository cuando existan credenciales.
export const activityRepository:ActivityRepository=localActivityRepository
