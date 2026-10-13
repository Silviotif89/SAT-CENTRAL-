import { septemberActivities } from '../data/septemberActivities'
import { octoberActivities } from '../data/octoberActivities'
import {collapseKnownMatagalpaDuplicate} from '../lib/duplicateActivities'
import type { Activity } from '../types'
import { supabaseRequest } from './supabaseAuth'

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

const asRow=(activity:Activity)=>({
 id:activity.id,delegation_id:activity.delegationId,topic:activity.topic,activity_type:activity.activityType,activity_date:activity.date,activity_time:activity.time??'',municipality:activity.municipality??'',location:activity.location??'',responsible:activity.responsible??'',institution:activity.institution??'',modality:activity.modality??'',training_provider:activity.trainingProvider??'',ddt_facilitator:activity.ddtFacilitator??'',projected_participants:activity.projectedParticipants??0,status:activity.status,men:activity.men,women:activity.women,total_participants:activity.totalParticipants,summary:activity.summary??'',observations:activity.observations??'',cancellation_reason:activity.cancellationReason??'',reschedule_reason:activity.rescheduleReason??'',original_date:activity.originalDate,created_at:activity.createdAt,updated_at:activity.updatedAt,payload:activity
})
export const supabaseActivityRepository:ActivityRepository={
 async list(){const response=await supabaseRequest('sat_activities?select=payload&order=activity_date.asc&limit=1000');if(!response.ok)throw new Error('No se pudieron cargar las actividades de SAT Central.');const rows=await response.json() as Array<{payload:Activity}>;return rows.map(row=>row.payload).filter(Boolean)},
 async save(items){const response=await supabaseRequest('sat_activities?on_conflict=id',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(items.map(asRow))});if(!response.ok)throw new Error('No se pudieron guardar los cambios en SAT Central.')},
}
export const activityRepository:ActivityRepository=supabaseActivityRepository
