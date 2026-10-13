import type { Activity, ActivityStatus } from '../types'
import { delegations } from './delegations'

const today = new Date()
const year=today.getFullYear(), month=String(today.getMonth()+1).padStart(2,'0')
const date=(day:number)=>`${year}-${month}-${String(day).padStart(2,'0')}`
const id=(name:string)=>delegations.find(d=>d.name===name)!.id
const base=(key:string, delegation:string, topic:string, day:number, status:ActivityStatus):Activity=>({
 id:`demo-${key}`, delegationId:id(delegation), topic, activityType:'Capacitación', date:date(day), time:'09:00', municipality:delegation,
 location:'Establecimiento turístico DEMO', responsible:'Responsable DEMO', institution:'INTUR / Aliado DEMO', modality:'Presencial',
 trainingProvider:'DDT (INTUR)',ddtFacilitator:'Silvio Rodríguez',
 projectedParticipants:25,status,men:null,women:null,totalParticipants:null,summary:'',observations:'Registro de demostración.',cancellationReason:'',rescheduleReason:'',originalDate:null,
 createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),isDemo:true,statusHistory:[]
})
const developed=(a:Activity,men:number,women:number):Activity=>({...a,men,women,totalParticipants:men+women,summary:'Actividad desarrollada satisfactoriamente.',report:{id:`report-${a.id}`,activityId:a.id,men,women,totalParticipants:men+women,summary:'Actividad desarrollada satisfactoriamente.',observations:'Datos DEMO.',reportedAt:new Date().toISOString()}})

export const demoActivities:Activity[]=[
 base('atencion','Río San Juan','Técnicas efectivas de atención al cliente',Math.min(29,new Date(year,today.getMonth()+1,0).getDate()),'PROGRAMADA'),
 developed(base('redes','Chinandega','Gestión de redes sociales para negocios turísticos',Math.max(1,today.getDate()-2),'DESARROLLADA'),8,15),
 developed(base('cocina','Managua','Manipulación higiénica de alimentos y bebidas',Math.max(1,today.getDate()-3),'DESARROLLADA'),10,9),
 developed(base('meseros','Río San Juan','Técnicas de cocina para meseros',Math.max(1,today.getDate()-4),'DESARROLLADA'),11,14),
 {...base('turismo','Granada','Innovación aplicada al turismo',Math.min(26,new Date(year,today.getMonth()+1,0).getDate()),'REPROGRAMADA'),originalDate:date(Math.max(1,today.getDate()-5)),rescheduleReason:'Disponibilidad del local DEMO'},
 {...base('ley','Chontales','Actualización sobre normativa turística',Math.min(27,new Date(year,today.getMonth()+1,0).getDate()),'CANCELADA'),cancellationReason:'Condiciones climáticas DEMO'},
 base('marketing','Madriz','Marketing digital para emprendimientos',Math.min(25,new Date(year,today.getMonth()+1,0).getDate()),'PROGRAMADA'),
 base('servicio','Boaco','Calidad en el servicio turístico',Math.min(24,new Date(year,today.getMonth()+1,0).getDate()),'PROGRAMADA'),
]
