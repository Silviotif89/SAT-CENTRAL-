import { createContext,useContext,useEffect,useMemo,useState,type ReactNode } from 'react'
import { ACTIVITY_STORAGE_KEY,activityRepository } from '../services/activityRepository'
import { totalParticipants } from '../lib/activity'
import type { Activity,NewActivity,WeeklyReportStatus } from '../types'

interface Store {activities:Activity[];loading:boolean;create:(input:NewActivity)=>void;update:(id:string,input:NewActivity)=>void;confirmPlan:(id:string,input:NewActivity)=>void;renamePlanActivity:(id:string,topic:string)=>void;deleteActivity:(id:string)=>void;setWeeklyReportStatus:(id:string,status:WeeklyReportStatus)=>void;report:(id:string,men:number,women:number,summary:string,observations:string)=>void;cancel:(id:string,reason:string)=>void;reschedule:(id:string,date:string,time:string,reason:string)=>void;resetDemo:()=>void}
const Context=createContext<Store|null>(null)
const uid=()=>crypto.randomUUID()
export function ActivitiesProvider({children}:{children:ReactNode}){
 const [activities,setActivities]=useState<Activity[]>([]),[loading,setLoading]=useState(true)
 useEffect(()=>{void activityRepository.list().then(setActivities).finally(()=>setLoading(false))},[])
 useEffect(()=>{if(!loading)void activityRepository.save(activities)},[activities,loading])
 const value=useMemo<Store>(()=>({activities,loading,
  create(input){const now=new Date().toISOString();setActivities(x=>[{...input,id:uid(),status:'PROGRAMADA',men:null,women:null,totalParticipants:null,summary:'',cancellationReason:'',rescheduleReason:'',originalDate:null,createdAt:now,updatedAt:now,statusHistory:[],weeklyReportStatus:'PENDIENTE'},...x])},
  update(id,input){setActivities(x=>x.map(a=>a.id!==id?a:{...a,...input,planReviewStatus:'PENDIENTE',planReviewedAt:undefined,weeklyReportStatus:'PENDIENTE',weeklyReportReviewedAt:undefined,updatedAt:new Date().toISOString(),report:a.report?{...a.report,observations:input.observations}:a.report}))},
  confirmPlan(id,input){setActivities(x=>x.map(a=>a.id!==id?a:{...a,...input,planReviewStatus:'CONFIRMADA',planReviewedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),report:a.report?{...a.report,observations:input.observations}:a.report}))},
  renamePlanActivity(id,topic){setActivities(x=>x.map(a=>a.id!==id?a:{...a,topic:topic.trim(),updatedAt:new Date().toISOString()}))},
  deleteActivity(id){setActivities(x=>x.filter(a=>a.id!==id))},
  setWeeklyReportStatus(id,status){const now=new Date().toISOString();setActivities(x=>x.map(a=>a.id!==id?a:{...a,weeklyReportStatus:status,weeklyReportReviewedAt:now,updatedAt:now}))},
  report(id,men,women,summary,observations){if(!Number.isInteger(men)||!Number.isInteger(women)||men<0||women<0||!summary.trim())return;setActivities(x=>x.map(a=>{if(a.id!==id||!['PROGRAMADA','REPROGRAMADA','DESARROLLADA'].includes(a.status))return a;const now=new Date().toISOString(),wasDeveloped=a.status==='DESARROLLADA';return {...a,status:'DESARROLLADA',men,women,totalParticipants:totalParticipants(men,women),summary:summary.trim(),observations,weeklyReportStatus:'PENDIENTE',weeklyReportReviewedAt:undefined,updatedAt:now,report:{id:a.report?.id??uid(),activityId:id,men,women,totalParticipants:totalParticipants(men,women),summary:summary.trim(),observations,reportedAt:now},statusHistory:wasDeveloped?a.statusHistory:[...a.statusHistory,{id:uid(),activityId:id,from:a.status,to:'DESARROLLADA',changedAt:now}]}}))},
  cancel(id,reason){const cleanReason=reason.trim();if(!cleanReason)return;setActivities(x=>x.map(a=>a.id!==id||!['PROGRAMADA','REPROGRAMADA'].includes(a.status)?a:{...a,status:'CANCELADA',planReviewStatus:'CANCELADA',planReviewedAt:new Date().toISOString(),weeklyReportStatus:'EXCLUIDA',weeklyReportReviewedAt:new Date().toISOString(),cancellationReason:cleanReason,updatedAt:new Date().toISOString(),statusHistory:[...a.statusHistory,{id:uid(),activityId:id,from:a.status,to:'CANCELADA',reason:cleanReason,changedAt:new Date().toISOString()}]}))},
  reschedule(id,date,time,reason){const cleanReason=reason.trim();if(!date||!time||!cleanReason)return;setActivities(x=>x.map(a=>{if(a.id!==id||!['PROGRAMADA','REPROGRAMADA','CANCELADA'].includes(a.status))return a;const now=new Date().toISOString(),restored=a.status==='CANCELADA'&&date===a.date&&!a.originalDate,nextStatus=restored?'PROGRAMADA':'REPROGRAMADA',history=a.status==='CANCELADA'&&a.cancellationReason.trim()&&!a.statusHistory.some(change=>change.to==='CANCELADA')?[...a.statusHistory,{id:uid(),activityId:id,from:'PROGRAMADA' as const,to:'CANCELADA' as const,reason:a.cancellationReason,changedAt:a.updatedAt||now}]:a.statusHistory;return {...a,status:nextStatus,planReviewStatus:restored?'PENDIENTE':'REPROGRAMADA',planReviewedAt:restored?undefined:now,weeklyReportStatus:'PENDIENTE',weeklyReportReviewedAt:undefined,originalDate:restored?a.originalDate:a.originalDate??a.date,date,time,cancellationReason:'',rescheduleReason:restored?'':cleanReason,updatedAt:now,statusHistory:[...history,{id:uid(),activityId:id,from:a.status,to:nextStatus,reason:cleanReason,changedAt:now}]}}))},
  resetDemo(){localStorage.removeItem(ACTIVITY_STORAGE_KEY);void activityRepository.list().then(setActivities)}
 }),[activities,loading])
 return <Context.Provider value={value}>{children}</Context.Provider>
}
// eslint-disable-next-line react-refresh/only-export-components
export const useActivities=()=>{const v=useContext(Context);if(!v)throw new Error('ActivitiesProvider requerido');return v}
