import {useState,type FormEvent} from 'react'
import {delegations} from '../data/delegations'
import {ddtFacilitators,trainingProviders} from '../data/facilitators'
import {useActivities} from '../hooks/useActivities'
import {multiDateScheduleFirstDate} from '../lib/activity'
import {weeklyPlanMissingFields} from '../lib/weeklyPlanReview'
import type {Activity,NewActivity} from '../types'
import {Modal} from './Modal'

type Action='review'|'rename'|'reschedule'|'cancel'|'delete'
const fields=(a:Activity):NewActivity=>({delegationId:a.delegationId,topic:a.topic,activityType:a.activityType,date:a.date,time:a.time,municipality:a.municipality,location:a.location,responsible:a.responsible,institution:a.institution,modality:a.modality,trainingProvider:a.trainingProvider,ddtFacilitator:a.ddtFacilitator,projectedParticipants:a.projectedParticipants,observations:a.observations})

export function WeeklyPlanReviewModal({activity,onClose}:{activity:Activity;onClose:()=>void}){
 const {confirmPlan,renamePlanActivity,deleteActivity,cancel,reschedule}=useActivities()
 const [form,setForm]=useState<NewActivity>(()=>fields(activity)),[action,setAction]=useState<Action>(()=>activity.status==='CANCELADA'?'reschedule':'review'),[reason,setReason]=useState(''),[error,setError]=useState('')
 const missing=weeklyPlanMissingFields({...activity,...form})
 const firstCourseDate=multiDateScheduleFirstDate(form.observations,form.date)
 const field=(key:keyof NewActivity,value:string|number)=>{setError('');setForm(current=>({...current,[key]:value,...(key==='trainingProvider'&&value!=='DDT (INTUR)'?{ddtFacilitator:''}:{})}))}
 const submit=(event:FormEvent)=>{
  event.preventDefault();setError('')
  if(action==='rename'){
   if(!form.topic.trim()){setError('Escribí el nombre de la capacitación.');return}
   renamePlanActivity(activity.id,form.topic);onClose();return
  }
  if(action==='delete'){
   deleteActivity(activity.id);onClose();return
  }
  if(action==='review'){
   if(missing.length){setError(`Falta completar: ${missing.join(', ')}.`);return}
   if(firstCourseDate&&form.date!==firstCourseDate){setError(`Este curso tiene varias fechas. La fecha principal debe ser ${firstCourseDate}; las demás permanecen en observaciones.`);return}
   confirmPlan(activity.id,form);onClose();return
  }
  if(!reason.trim()){setError(`Indicá el motivo de ${action==='cancel'?'cancelación':'reprogramación'}.`);return}
  if(action==='cancel'){cancel(activity.id,reason.trim());onClose();return}
  if(!form.date||!form.time.trim()){setError('Indicá la nueva fecha y hora.');return}
  reschedule(activity.id,form.date,form.time,reason.trim());onClose()
 }
 return <Modal title="Comprobar actividad del plan" onClose={onClose} wide>
  <form className="form-grid plan-review-form" onSubmit={submit}>
   <div className="plan-review-heading span-3"><div><span>Actividad seleccionada</span><strong>{form.topic}</strong></div>{missing.length?<p><b>{missing.length}</b> {missing.length===1?'dato pendiente':'datos pendientes'}</p>:<p className="complete">Datos completos</p>}</div>
   {action==='rename'&&<label className="span-3">Nombre de la capacitación *<input autoFocus required value={form.topic} onChange={e=>field('topic',e.target.value)} /></label>}
   {action==='review'&&<>
    <label>Delegación *<select required value={form.delegationId} onChange={e=>field('delegationId',e.target.value)}><option value="">Seleccionar</option>{delegations.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
    <label className="span-2">Tema de capacitación *<input required value={form.topic} onChange={e=>field('topic',e.target.value)}/></label>
    <label>Fecha *<input required type="date" value={form.date} onChange={e=>field('date',e.target.value)}/></label><label>Hora o duración *<input required value={form.time} onChange={e=>field('time',e.target.value)}/></label><label>Municipio *<input required value={form.municipality} onChange={e=>field('municipality',e.target.value)}/></label>
    <label className="span-2">Lugar *<input required value={form.location} onChange={e=>field('location',e.target.value)}/></label><label>Proyección *<input required type="number" min="1" value={form.projectedParticipants} onChange={e=>field('projectedParticipants',Number(e.target.value))}/></label>
    <label className="span-2">Participan / instituciones *<input required value={form.institution} onChange={e=>field('institution',e.target.value)}/></label><label>Responsable *<input required value={form.responsible} onChange={e=>field('responsible',e.target.value)}/></label>
    <label>Institución que impartirá *<select required value={form.trainingProvider} onChange={e=>field('trainingProvider',e.target.value)}><option value="">Seleccionar</option>{trainingProviders.map(provider=><option key={provider}>{provider}</option>)}</select></label>
    {form.trainingProvider==='DDT (INTUR)'&&<label className="span-2">Persona facilitadora DDT *<select required value={form.ddtFacilitator} onChange={e=>field('ddtFacilitator',e.target.value)}><option value="">Seleccionar</option>{ddtFacilitators.map(name=><option key={name}>{name}</option>)}</select></label>}
    <label className="span-3">Observaciones<textarea rows={3} value={form.observations} onChange={e=>field('observations',e.target.value)}/>{(form.trainingProvider==='INATEC'||firstCourseDate)&&<small className="field-help">Las actividades de varias fechas se registran una sola vez con la primera fecha; las demás se conservan aquí.</small>}{firstCourseDate&&<small className="field-help course-date-rule">Fecha principal detectada: {firstCourseDate}.</small>}</label>
   </>}
   {action==='reschedule'&&<><div className="reschedule-context span-3"><span>{activity.status==='CANCELADA'?'Actividad cancelada':'Fecha actual'}</span><strong>{activity.date} · {activity.time}</strong><small>{activity.status==='CANCELADA'?'Conservá la fecha para restaurarla como Programada o elegí otra para marcarla Reprogramada.':'Al guardar, la actividad aparecerá en la nueva semana o fecha.'}</small></div><label>{activity.status==='CANCELADA'?'Fecha de reactivación':'Nueva fecha'} *<input required type="date" value={form.date} onChange={e=>field('date',e.target.value)}/></label><label className="span-2">{activity.status==='CANCELADA'?'Hora o duración':'Nueva hora o duración'} *<input required value={form.time} onChange={e=>field('time',e.target.value)}/></label><label className="span-3">{activity.status==='CANCELADA'?'Motivo de reactivación o reprogramación':'Motivo'} *<textarea required rows={4} value={reason} onChange={e=>setReason(e.target.value)}/></label></>}
   {action==='cancel'&&<label className="span-3">Motivo de cancelación *<textarea required rows={4} value={reason} onChange={e=>setReason(e.target.value)}/></label>}
   {action==='delete'&&<div className="reschedule-context span-3"><span>Eliminar actividad duplicada</span><strong>{activity.topic}</strong><small>Esta acción elimina la actividad del Plan semanal y de todos los demás módulos. Usala únicamente cuando sea un registro duplicado.</small></div>}
   {error&&<p className="form-error span-3" role="alert">{error}</p>}
   <div className="plan-review-actions span-3">
    <div>{activity.status!=='CANCELADA'&&<button type="button" className={`button ${action==='review'?'primary':'ghost'}`} onClick={()=>setAction('review')}>Confirmar datos</button>}<button type="button" className={`button ${action==='rename'?'primary':'ghost'}`} onClick={()=>setAction('rename')}>Cambiar nombre</button><button type="button" className={`button ${action==='reschedule'?'warning':'ghost'}`} onClick={()=>setAction('reschedule')}>{activity.status==='CANCELADA'?'Reactivar o reprogramar':'Reprogramar'}</button>{activity.status!=='CANCELADA'&&<button type="button" className={`button ${action==='cancel'?'danger':'ghost'}`} onClick={()=>setAction('cancel')}>Cancelar actividad</button>}<button type="button" className={`button ${action==='delete'?'danger':'ghost'}`} onClick={()=>setAction('delete')}>Eliminar duplicado</button></div>
    <div><button type="button" className="button ghost" onClick={onClose}>Cerrar</button><button className={`button ${action==='delete'?'danger':'primary'}`}>{action==='review'?'Guardar como confirmada':action==='rename'?'Guardar nombre':action==='delete'?'Eliminar definitivamente':'Guardar cambio'}</button></div>
   </div>
  </form>
 </Modal>
}
