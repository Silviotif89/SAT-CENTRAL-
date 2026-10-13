import PizZip from 'pizzip'
import {weekRange,inDateRange} from '../lib/activity'
import type {Activity} from '../types'
const WORD_NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const XML_NS='http://www.w3.org/XML/1998/namespace'
const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
type Segment={text:string;bold?:boolean;breakBefore?:boolean}
type WeekRange={start:string;end:string}
const clean=(value:string)=>value.trim()||'Pendiente de confirmar'
const parseDate=(value:string)=>new Date(`${value}T12:00:00`)
const dayLabel=(value:string)=>{const d=parseDate(value);return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`}
function periodLabel(range:WeekRange){
 const a=parseDate(range.start),b=parseDate(range.end)
 return `${a.getDate()} DE ${months[a.getMonth()]}${a.getFullYear()!==b.getFullYear()?` DEL ${a.getFullYear()}`:''} AL ${b.getDate()} DE ${months[b.getMonth()]} DEL ${b.getFullYear()}`.toUpperCase()
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

// Export only explicit multi-day scheduling; source dates and rescheduling notes
// are not dates on which the activity takes place.
export function weeklyPlanDates(observations:string){
 const month='(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)'
 const day='(?:0?[1-9]|[12]\\d|3[01])'
 const date=`${day}(?: de ${month})?(?: de \\d{4})?`
 const dates=`(?:${date}(?:\\s*,\\s*${date})*(?:\\s*(?:y|al|a|–|-)\\s*${date})|${date}(?:\\s*,\\s*${date})+)`
 const pattern=new RegExp(`^(?:Actividad programada (?:para (?:el|los días)|del)|Curso (?:realizado (?:los días|del)|con encuentros los días)|(?:Fechas|Días)(?: de (?:la actividad|realización|encuentros))?:)\\s*(${dates})(?=[.;·\\n]|$)`,'i')
 return observations.split(/[;·\n]|\.\s+/).flatMap(part=>{
  const match=part.trim().match(pattern)
  return match?[`Fechas: ${match[1]}.`]:[]
 }).join(' ')
}


function buildDocumentXml(source:string,items:Activity[],range:WeekRange){
 const xml=new DOMParser().parseFromString(source,'application/xml')
 if(xml.getElementsByTagName('parsererror').length)throw new Error('No se pudo interpretar la plantilla del plan.')
 const body=xml.getElementsByTagNameNS(WORD_NS,'body')[0]
 if(!body)throw new Error('La plantilla no contiene un cuerpo de documento.')
 const p=[...body.children].filter(child=>child.localName==='p')
 const section=[...body.children].find(child=>child.localName==='sectPr')
 const [leading,title,period,day,topic,hour,place,participants,projection,responsible,blank]=p
 if(!section||!leading||!title||!period||!day||!topic||!hour||!place||!participants||!projection||!responsible||!blank)throw new Error('La estructura de la plantilla del plan es incompleta.')
 for(const child of [...body.children])if(child!==section)body.removeChild(child)
 const add=(paragraph:Element)=>body.insertBefore(paragraph,section)
 add(leading.cloneNode(true) as Element)
 add(paragraphFrom(xml,title,[{text:'DIRECCIÓN DE DESARROLLO TURÍSTICO',bold:true}]))
 add(paragraphFrom(xml,period,[{text:`PLAN DE CAPACITACIÓN DEL ${periodLabel(range)}`,bold:true}]))
 let previousDate=''
 for(const activity of [...items].sort((a,b)=>a.date.localeCompare(b.date)||timeOrder(a.time)-timeOrder(b.time)||a.topic.localeCompare(b.topic,'es'))){
  if(previousDate!==activity.date){add(keepWithNext(xml,paragraphFrom(xml,day,[{text:dayLabel(activity.date),bold:true}])));previousDate=activity.date}
  // Keep the template's native Word list; its single numId numbers the entire week.
  add(keepWithNext(xml,paragraphFrom(xml,topic,[{text:clean(activity.topic)}])))
  appendField(xml,body,section,hour,'Hora',clean(activity.time))
  appendField(xml,body,section,place,'Lugar',clean(activity.location||activity.municipality))
  appendField(xml,body,section,participants,'Participan',clean(activity.institution))
  appendField(xml,body,section,projection,'Proyección de Participantes',Number.isFinite(activity.projectedParticipants)&&activity.projectedParticipants>=0?`${activity.projectedParticipants} protagonistas.`:'Pendiente de confirmar')
  const person=activity.trainingProvider==='DDT (INTUR)'&&activity.ddtFacilitator.trim()?activity.ddtFacilitator:activity.responsible||activity.trainingProvider
  const last=paragraphFrom(xml,responsible,[{text:'Responsable: ',bold:true},{text:clean(person)}])
  for(const node of [...last.getElementsByTagNameNS(WORD_NS,'keepNext')])node.remove()
  const dates=weeklyPlanDates(activity.observations)
  if(dates){
   add(keepWithNext(xml,last))
   const note=paragraphFrom(xml,responsible,[{text:dates}])
   for(const node of [...note.getElementsByTagNameNS(WORD_NS,'keepNext')])node.remove()
   add(note)
  }else add(last)
  add(blank.cloneNode(true) as Element)
 }
 if(!items.length)add(paragraphFrom(xml,topic,[{text:'No hay capacitaciones registradas para el período y la delegación seleccionados.'}]))
 return new XMLSerializer().serializeToString(xml)
}
export async function createWeeklyPlanWord(items:Activity[],range:WeekRange){
 const expected=weekRange(range.start)
 if(!/^\d{4}-\d{2}-\d{2}$/.test(range.start)||!Number.isFinite(parseDate(range.start).getTime())||expected.start!==range.start||expected.end!==range.end)throw new Error('El plan semanal debe abarcar de lunes a viernes de la misma semana.')
 const selected=items.filter(a=>a.status!=='CANCELADA'&&inDateRange(a,range.start,range.end)&&parseDate(a.date).getDay()>=1&&parseDate(a.date).getDay()<=5)
 const response=await fetch(new URL('templates/Plan_semanal_INTUR_base.docx',document.baseURI).toString())
 if(!response.ok)throw new Error('No se pudo cargar la plantilla institucional del plan semanal.')
 const zip=new PizZip(await response.arrayBuffer()),doc=zip.file('word/document.xml')
 if(!doc)throw new Error('La plantilla no contiene el documento principal.')
 zip.file('word/document.xml',buildDocumentXml(doc.asText(),selected,range))
 return {blob:zip.generate({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',compression:'DEFLATE'}),name:`PLAN SEMANAL DEL ${periodLabel(range)}.docx`}
}
export async function exportWeeklyPlanWord(items:Activity[],range:WeekRange){
 const {blob,name}=await createWeeklyPlanWord(items,range)
 const url=URL.createObjectURL(blob),link=document.createElement('a')
 link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove()
 window.setTimeout(()=>URL.revokeObjectURL(url),1000)
}

