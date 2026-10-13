import { useEffect } from 'react'
import { delegations } from '../data/delegations'
import type { NewActivity } from '../types'
import { useActivities } from './useActivities'

type ToolDefinition={name:string;title?:string;description:string;inputSchema:object;annotations?:{readOnlyHint?:boolean;untrustedContentHint?:boolean};execute:(input:unknown)=>unknown|Promise<unknown>}
type ModelContext={registerTool:(tool:ToolDefinition,options?:{signal?:AbortSignal})=>void|Promise<void>}
declare global {interface Document {readonly modelContext?:ModelContext}}

export function useWebMcp(){
 const {activities,create}=useActivities()
 useEffect(()=>{
  const context=document.modelContext
  if(!context?.registerTool)return
  const lifecycle=new AbortController()
  const register=(tool:ToolDefinition)=>{try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(console.error)}catch(error){console.error(error)}}
  register({name:'list_activities',title:'Listar actividades',description:'Consulta las actividades de acompañamiento técnico visibles en el sistema.',inputSchema:{type:'object',properties:{status:{type:'string',enum:['PROGRAMADA','DESARROLLADA','REPROGRAMADA','CANCELADA']},delegationId:{type:'string'}},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input){const filters=(input??{}) as {status?:string;delegationId?:string};return activities.filter(a=>(!filters.status||a.status===filters.status)&&(!filters.delegationId||a.delegationId===filters.delegationId)).map(({id,delegationId,topic,date,time,status,totalParticipants,trainingProvider,ddtFacilitator})=>({id,delegationId,topic,date,time,status,totalParticipants,trainingProvider,ddtFacilitator}))}})
  register({
   name:'create_activity',title:'Crear actividad',description:'Crea una actividad programada usando los mismos datos del formulario visible.',
   inputSchema:{type:'object',properties:{delegationId:{type:'string'},topic:{type:'string'},activityType:{type:'string'},date:{type:'string'},time:{type:'string'},municipality:{type:'string'},location:{type:'string'},responsible:{type:'string'},institution:{type:'string'},modality:{type:'string'},trainingProvider:{type:'string',enum:['MIFIC','MINSA','SETEC','BOMBEROS','POLICÍA','INATEC','DDT (INTUR)','Delegación Departamental']},ddtFacilitator:{type:'string'},projectedParticipants:{type:'number'},observations:{type:'string'}},required:['delegationId','topic','date','time','municipality','location','responsible','trainingProvider'],additionalProperties:false},
   annotations:{readOnlyHint:false,untrustedContentHint:false},
   execute(input){
    const raw=input as Partial<NewActivity>
    if(!raw||!delegations.some(d=>d.id===raw.delegationId)||!raw.topic?.trim()||!raw.date||!raw.time||!raw.municipality?.trim()||!raw.location?.trim()||!raw.responsible?.trim()||!raw.trainingProvider||(raw.trainingProvider==='DDT (INTUR)'&&!raw.ddtFacilitator))throw new Error('Datos obligatorios inválidos.')
    const item:NewActivity={delegationId:raw.delegationId!,topic:raw.topic.trim(),activityType:raw.activityType?.trim()||'Capacitación',date:raw.date,time:raw.time,municipality:raw.municipality.trim(),location:raw.location.trim(),responsible:raw.responsible.trim(),institution:raw.institution?.trim()||'INTUR',modality:raw.modality?.trim()||'Presencial',trainingProvider:raw.trainingProvider,ddtFacilitator:raw.ddtFacilitator?.trim()||'',projectedParticipants:Math.max(0,Number(raw.projectedParticipants??0)),observations:raw.observations?.trim()||''}
    create(item);return {status:'PROGRAMADA',topic:item.topic,date:item.date,delegationId:item.delegationId,trainingProvider:item.trainingProvider}
   }
  })
  return()=>lifecycle.abort()
 },[activities,create])
}
