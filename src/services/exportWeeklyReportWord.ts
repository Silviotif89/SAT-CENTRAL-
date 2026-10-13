import PizZip from 'pizzip'
import {delegationName} from '../data/delegations'
import {inWorkWeek,wasRescheduled,weekRange} from '../lib/activity'
import type {Activity} from '../types'

const WORD_NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const XML_NS='http://www.w3.org/XML/1998/namespace'
const TEMPLATE_URL='/templates/Informe_semanal_INTUR_base.docx'
const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const days=['domingo','lunes','martes','miércoles','jueves','viernes','sábado']

type Segment={text:string;bold?:boolean;breakBefore?:boolean}
type WeekRange={start:string;end:string}

const parseDate=(value:string)=>new Date(`${value}T12:00:00`)
const clean=(value:string|undefined|null,fallback='Pendiente de confirmar')=>value?.trim()||fallback
const sentence=(value:string)=>/[.!?]$/.test(value.trim())?value.trim():`${value.trim()}.`
const cap=(value:string)=>value.charAt(0).toUpperCase()+value.slice(1)
const lowerFirst=(value:string)=>value.charAt(0).toLocaleLowerCase('es')+value.slice(1)
const topicForSummary=(value:string)=>lowerFirst(value.replace(/[.]$/,'').replace(/^(capacitación|taller|curso)\s+(en|sobre|de)?\s*/i,'').toLocaleLowerCase('es')).replace(/\b(setec|intur|unan|inatec|mific|minsa|dgi)\b/gi,match=>match.toLocaleUpperCase('es'))
const formatDay=(value:string)=>{const d=parseDate(value);return `${cap(days[d.getDay()]??'día')} ${d.getDate()} de ${months[d.getMonth()]??'mes'}`}
const formatFullDate=(value:string)=>{const d=parseDate(value);return `${d.getDate()} de ${months[d.getMonth()]??'mes'} de ${d.getFullYear()}`}
const formatPeriod=(range:WeekRange)=>`${formatDay(range.start)} al ${formatDay(range.end).toLocaleLowerCase('es')} de ${parseDate(range.end).getFullYear()}`
const validAttendance=(a:Activity)=>a.status==='DESARROLLADA'&&a.men!==null&&a.women!==null&&a.totalParticipants!==null&&a.men+a.women===a.totalParticipants

function joinSpanish(values:string[]){
 if(values.length<2)return values[0]??''
 if(values.length===2)return `${values[0]} y ${values[1]}`
 return `${values.slice(0,-1).join(', ')} y ${values.at(-1)}`
}

function buildSummary(items:Activity[]){
 const executed=items.filter(validAttendance)
 const incomplete=items.filter(a=>a.status==='DESARROLLADA'&&!validAttendance(a))
 const programmed=items.filter(a=>a.status==='PROGRAMADA')
 const rescheduled=items.filter(a=>a.status==='REPROGRAMADA')
 const cancelled=items.filter(a=>a.status==='CANCELADA')
 if(!items.length)return 'No se registran actividades para el período seleccionado.'
 const delegationCounts=new Map<string,number>()
 for(const activity of executed){const name=delegationName(activity.delegationId);delegationCounts.set(name,(delegationCounts.get(name)??0)+1)}
 const territories=[...delegationCounts.entries()].sort(([a],[b])=>a.localeCompare(b,'es')).map(([name,count])=>`${name} (${count})`)
 const topics=[...new Set(executed.map(a=>topicForSummary(clean(a.topic,'actividad de capacitación'))))]
 let summary=executed.length
  ?`Se realizaron ${executed.length} ${executed.length===1?'capacitación dirigida':'capacitaciones dirigidas'} a protagonistas, colaboradores y prestadores de servicios del sector turístico ${territories.length===1?'de la delegación':'de las delegaciones'} de ${joinSpanish(territories)}, abordando ${topics.length===1?'el tema':'temas como'} ${joinSpanish(topics)}.`
  :'No se registran capacitaciones ejecutadas con asistencia validada en el período seleccionado.'
 const differences:string[]=[]
 if(cancelled.length)differences.push(`${cancelled.length} ${cancelled.length===1?'no fue ejecutada':'no fueron ejecutadas'}`)
 if(programmed.length)differences.push(`${programmed.length} ${programmed.length===1?'permanece pendiente de reporte':'permanecen pendientes de reporte'}`)
 if(incomplete.length)differences.push(`${incomplete.length} ${incomplete.length===1?'tiene':'tienen'} ejecución reportada con asistencia pendiente de validar`)
 if(rescheduled.length)differences.push(`${rescheduled.length} ${rescheduled.length===1?'fue reprogramada':'fueron reprogramadas'}`)
 if(differences.length)summary+=` De las ${items.length} actividades programadas, ${joinSpanish(differences)}.`
 return summary
}

function activityObservation(a:Activity){
 const notes:string[]=[]
 if(wasRescheduled(a)){
  if(a.originalDate)notes.push(`Fecha original: ${formatFullDate(a.originalDate)}; nueva fecha: ${formatFullDate(a.date)}`)
  else notes.push(`Actividad reprogramada para el ${formatFullDate(a.date)}`)
  if(a.rescheduleReason.trim())notes.push(`Motivo: ${sentence(a.rescheduleReason)}`)
 }
 if(a.status==='PROGRAMADA')notes.push('Actividad programada; sin reporte de ejecución recibido.')
 if(a.status==='REPROGRAMADA'&&!wasRescheduled(a))notes.push('Actividad reprogramada; sin reporte de ejecución recibido.')
 if(a.status==='DESARROLLADA'&&!validAttendance(a))notes.push('Actividad ejecutada con asistencia pendiente de completar o verificar.')
 if(a.status==='CANCELADA')notes.push(a.cancellationReason.trim()?`Actividad no ejecutada. Motivo: ${sentence(a.cancellationReason)}`:'Actividad no ejecutada.')
 const reportNote=a.report?.observations?.trim()
 if(reportNote)notes.push(sentence(reportNote))
 else if(a.status==='DESARROLLADA'&&a.observations.trim())notes.push(sentence(a.observations))
 return notes.join(' ')
}

function fileName(range:WeekRange){
 const start=parseDate(range.start),end=parseDate(range.end)
 const startPart=`${start.getDate()}_${months[start.getMonth()]??'mes'}`
 const endPart=`${end.getDate()}_${months[end.getMonth()]??'mes'}_${end.getFullYear()}`
 return `Informe_semanal_${startPart}_al_${endPart}.docx`
}

function clearParagraph(paragraph:Element){
 for(const child of [...paragraph.children])if(child.localName!=='pPr')paragraph.removeChild(child)
}

function runIsBold(run:Element){return Boolean(run.getElementsByTagNameNS(WORD_NS,'b').length)}

function cloneRun(xml:XMLDocument, source:Element, segment:Segment){
 const runs=[...source.getElementsByTagNameNS(WORD_NS,'r')]
 const selected=runs.find(run=>runIsBold(run)===Boolean(segment.bold))??runs[0]
 const run=(selected?.cloneNode(true)??xml.createElementNS(WORD_NS,'w:r')) as Element
 for(const child of [...run.children])if(child.localName!=='rPr')run.removeChild(child)
 if(segment.breakBefore)run.appendChild(xml.createElementNS(WORD_NS,'w:br'))
 const text=xml.createElementNS(WORD_NS,'w:t')
 text.setAttributeNS(XML_NS,'xml:space','preserve')
 text.textContent=segment.text
 run.appendChild(text)
 return run
}

function paragraphFrom(xml:XMLDocument, source:Element, segments:Segment[]){
 const paragraph=source.cloneNode(true) as Element
 clearParagraph(paragraph)
 for(const segment of segments)paragraph.appendChild(cloneRun(xml,source,segment))
 return paragraph
}

function keepWithNext(xml:XMLDocument,paragraph:Element){
 let properties=[...paragraph.children].find(child=>child.localName==='pPr')
 if(!properties){properties=xml.createElementNS(WORD_NS,'w:pPr');paragraph.insertBefore(properties,paragraph.firstChild)}
 if(!properties.getElementsByTagNameNS(WORD_NS,'keepNext').length)properties.appendChild(xml.createElementNS(WORD_NS,'w:keepNext'))
 if(!properties.getElementsByTagNameNS(WORD_NS,'keepLines').length)properties.appendChild(xml.createElementNS(WORD_NS,'w:keepLines'))
 return paragraph
}

function appendField(xml:XMLDocument, body:Element, section:Element, fieldTemplate:Element, label:string, value:string){
 body.insertBefore(keepWithNext(xml,paragraphFrom(xml,fieldTemplate,[{text:`${label}:`,bold:true},{text:` ${value}`}])) ,section)
}

function timeOrder(value:string){
 const match=value.toLocaleLowerCase('es').match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)/)
 if(!match)return Number.MAX_SAFE_INTEGER
 let hour=Number(match[1]);const minute=Number(match[2]??0)
 if(match[3]?.startsWith('p')&&hour<12)hour+=12
 if(match[3]?.startsWith('a')&&hour===12)hour=0
 return hour*60+minute
}

function buildDocumentXml(source:string,items:Activity[],range:WeekRange){
 const xml=new DOMParser().parseFromString(source,'application/xml')
 if(xml.getElementsByTagName('parsererror').length)throw new Error('La plantilla Word no pudo interpretarse.')
 const body=xml.getElementsByTagNameNS(WORD_NS,'body')[0]
 if(!body)throw new Error('La plantilla Word no contiene el cuerpo del documento.')
 const paragraphs=[...body.children].filter(child=>child.localName==='p')
 const titleTemplate=paragraphs[0],periodTemplate=paragraphs[1],summaryTemplate=paragraphs[2],dayTemplate=paragraphs[6],activityTemplate=paragraphs[8],fieldTemplate=paragraphs[9]
 const blankTemplate=paragraphs[13]
 const section=[...body.children].find(child=>child.localName==='sectPr')
 if(!titleTemplate||!periodTemplate||!summaryTemplate||!dayTemplate||!activityTemplate||!fieldTemplate||!blankTemplate||!section)throw new Error('La plantilla Word no contiene la estructura esperada.')
 const observationTemplate=paragraphs[61]??fieldTemplate
 const pageMargins=section.getElementsByTagNameNS(WORD_NS,'pgMar')[0]
 if(pageMargins)pageMargins.setAttributeNS(WORD_NS,'w:bottom','2304')
 for(const child of [...body.children])if(child!==section)body.removeChild(child)

 body.insertBefore(paragraphFrom(xml,titleTemplate,[{text:'DIRECCIÓN DE DESARROLLO TURÍSTICO',bold:true},{text:'INFORME SEMANAL DE CAPACITACIÓN',bold:true,breakBefore:true}]),section)
 body.insertBefore(paragraphFrom(xml,periodTemplate,[{text:formatPeriod(range),bold:true}]),section)
 body.insertBefore(paragraphFrom(xml,summaryTemplate,[{text:buildSummary(items)}]),section)
 body.insertBefore(blankTemplate.cloneNode(true),section)
 const verified=items.filter(validAttendance)
 const totals=verified.reduce((sum,a)=>({men:sum.men+(a.men??0),women:sum.women+(a.women??0)}),{men:0,women:0})
 const totalText=verified.length
  ?`En total, se capacitó a ${totals.men+totals.women} protagonistas (${totals.men} hombres y ${totals.women} mujeres).`
  :'No se registran protagonistas con asistencia validada en el período seleccionado.'
 body.insertBefore(paragraphFrom(xml,summaryTemplate,[{text:totalText}]),section)
 body.insertBefore(blankTemplate.cloneNode(true),section)

 const ordered=[...items].sort((a,b)=>a.date.localeCompare(b.date)||timeOrder(a.time)-timeOrder(b.time)||a.topic.localeCompare(b.topic,'es'))
 const grouped=new Map<string,Activity[]>()
 for(const activity of ordered)grouped.set(activity.date,[...(grouped.get(activity.date)??[]),activity])
 let number=1
 for(const [date,activities] of grouped){
  body.insertBefore(keepWithNext(xml,paragraphFrom(xml,dayTemplate,[{text:formatDay(date),bold:true}])),section)
  body.insertBefore(keepWithNext(xml,blankTemplate.cloneNode(true) as Element),section)
  for(const activity of activities){
   body.insertBefore(keepWithNext(xml,paragraphFrom(xml,activityTemplate,[{text:`${number}. ${sentence(clean(activity.topic,'Actividad de capacitación'))}`}])),section)
   appendField(xml,body,section,fieldTemplate,'Hora',clean(activity.time))
   appendField(xml,body,section,fieldTemplate,'Lugar',clean(activity.location||activity.municipality))
   appendField(xml,body,section,fieldTemplate,'Participan',clean(activity.institution,`Delegación INTUR ${delegationName(activity.delegationId)}`))
   const participants=validAttendance(activity)
    ?`${activity.totalParticipants} Total (${activity.men} M ${activity.women} F)`
    :activity.status==='CANCELADA'?'No aplica':'Sin reporte recibido'
   appendField(xml,body,section,fieldTemplate,'Participantes',participants)
   const weeklyResponsible=activity.trainingProvider==='DDT (INTUR)'&&activity.ddtFacilitator.trim()
    ?activity.ddtFacilitator.trim()
    :activity.responsible.trim()
   if(weeklyResponsible)appendField(xml,body,section,fieldTemplate,'Responsable',weeklyResponsible)
   const observation=activityObservation(activity)
   if(observation)body.insertBefore(keepWithNext(xml,paragraphFrom(xml,observationTemplate,[{text:'Observación:',bold:true},{text:` ${observation}`}])) ,section)
   body.insertBefore(blankTemplate.cloneNode(true),section)
   number+=1
  }
 }
 return new XMLSerializer().serializeToString(xml)
}

export async function createWeeklyReportWord(items:Activity[],range:WeekRange){
 const normalizedRange=weekRange(range.start)
 const selected=items.filter(activity=>inWorkWeek(activity,normalizedRange.start))
 const response=await fetch(TEMPLATE_URL)
 if(!response.ok)throw new Error('No se pudo cargar la plantilla institucional del informe semanal.')
 const template=await response.arrayBuffer()
 const zip=new PizZip(template)
 const documentFile=zip.file('word/document.xml')
 if(!documentFile)throw new Error('La plantilla Word no contiene el documento principal.')
 zip.file('word/document.xml',buildDocumentXml(documentFile.asText(),selected,normalizedRange))
 return {blob:zip.generate({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',compression:'DEFLATE'}),name:fileName(normalizedRange)}
}

export async function exportWeeklyReportWord(items:Activity[],range:WeekRange){
 const {blob,name}=await createWeeklyReportWord(items,range)
 const url=URL.createObjectURL(blob),link=document.createElement('a')
 link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove()
 window.setTimeout(()=>URL.revokeObjectURL(url),1000)
}
