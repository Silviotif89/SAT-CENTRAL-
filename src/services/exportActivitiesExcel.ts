import {delegations,delegationName} from '../data/delegations'
import {ddtFacilitators,trainingProviders} from '../data/facilitators'
import {inDateRange,STATUS_LABEL,toInputDate,wasRescheduled,weekRange} from '../lib/activity'
import type {Activity} from '../types'

export type ExportPeriod='week'|'month'|'year'|'all'
export type ExportTemplate='weekly-plan'|'weekly-report'|'monthly-plan'|'department-summary'|'database'

const NAVY='1C2F78',CYAN='049CCC',PALE_BLUE='EAF8FD',PALE_YELLOW='FFF8CF',PALE_GREEN='E8F5ED',WHITE='FFFFFF',INK='17213F'
const MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const DAYS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
const INATEC_COUNTING_RULE='Los cursos de INATEC con varias fechas de realización se registran y contabilizan como una sola actividad.'
const monthRange=(reference:string)=>{const [year,month]=reference.split('-').map(Number);return {start:`${year}-${String(month).padStart(2,'0')}-01`,end:toInputDate(new Date(year!,month!,0))}}
const yearRange=(reference:string)=>{const year=reference.slice(0,4);return {start:`${year}-01-01`,end:`${year}-12-31`}}
const safe=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_|_$/g,'').toLowerCase()
const humanDate=(value:string)=>{const d=new Date(`${value}T12:00:00`);return `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`}
const periodText=(start:string,end:string)=>{const a=new Date(`${start}T12:00:00`),b=new Date(`${end}T12:00:00`);return a.getMonth()===b.getMonth()?`${a.getDate()} al ${b.getDate()} de ${MONTHS[b.getMonth()]} de ${b.getFullYear()}`:`${a.getDate()} de ${MONTHS[a.getMonth()]} al ${b.getDate()} de ${MONTHS[b.getMonth()]} de ${b.getFullYear()}`}
const facilitator=(a:Activity)=>a.trainingProvider==='DDT (INTUR)'?(a.ddtFacilitator||'Pendiente de definir'):(a.trainingProvider||'Pendiente de definir')
const attendanceIsComplete=(a:Activity)=>a.status==='DESARROLLADA'&&a.men!==null&&a.women!==null&&a.totalParticipants!==null&&a.men+a.women===a.totalParticipants
const discrepancy=(a:Activity)=>a.status==='DESARROLLADA'&&a.men!==null&&a.women!==null&&a.totalParticipants!==null&&a.men+a.women!==a.totalParticipants
const countingRule=(a:Activity)=>a.trainingProvider==='INATEC'?INATEC_COUNTING_RULE:''
const note=(a:Activity)=>[a.observations,countingRule(a),a.status!=='PROGRAMADA'?`Estado: ${STATUS_LABEL[a.status]}`:'',a.rescheduleReason?`Motivo de reprogramación: ${a.rescheduleReason}`:'',a.cancellationReason?`Motivo de cancelación: ${a.cancellationReason}`:''].filter(Boolean).join(' · ')

type Sheet=ReturnType<(typeof import('xlsx-js-style'))['utils']['aoa_to_sheet']>
type Workbook=ReturnType<(typeof import('xlsx-js-style'))['utils']['book_new']>
const border={top:{style:'thin',color:{rgb:'9099AA'}},bottom:{style:'thin',color:{rgb:'9099AA'}},left:{style:'thin',color:{rgb:'9099AA'}},right:{style:'thin',color:{rgb:'9099AA'}}}
const alignCenter={horizontal:'center',vertical:'center',wrapText:true},alignLeft={horizontal:'left',vertical:'center',wrapText:true}
const titleStyle={fill:{fgColor:{rgb:WHITE}},font:{name:'Cambria',bold:true,sz:12,color:{rgb:NAVY}},alignment:alignCenter}
const subtitleStyle={fill:{fgColor:{rgb:WHITE}},font:{name:'Cambria',bold:true,sz:10,color:{rgb:INK}},alignment:alignCenter}
const headerStyle={fill:{fgColor:{rgb:CYAN}},font:{name:'Cambria',bold:true,sz:10,color:{rgb:WHITE}},alignment:alignCenter,border}
const bodyStyle={fill:{fgColor:{rgb:WHITE}},font:{name:'Cambria',sz:9,color:{rgb:INK}},alignment:alignLeft,border},bodyCenterStyle={...bodyStyle,alignment:alignCenter}
const setCellStyle=(sheet:Sheet,address:string,style:object)=>{const cell=sheet[address]??(sheet[address]={t:'s',v:''});cell.s=style}
const styleRange=(sheet:Sheet,startRow:number,endRow:number,startCol:number,endCol:number,style:object)=>{for(let r=startRow;r<=endRow;r++)for(let c=startCol;c<=endCol;c++)setCellStyle(sheet,`${String.fromCharCode(65+c)}${r}`,style)}
const setRowHeights=(sheet:Sheet,from:number,to:number,height=36)=>{sheet['!rows']??=[];for(let r=from;r<=to;r++)sheet['!rows'][r-1]={hpt:height}}
const mergeTitle=(sheet:Sheet,lastColumn:string)=>{sheet['!merges']=[{s:{r:0,c:0},e:{r:0,c:lastColumn.charCodeAt(0)-65}},{s:{r:1,c:0},e:{r:1,c:lastColumn.charCodeAt(0)-65}}]}

function detailRows(selected:Activity[]){return selected.map((a,index)=>({'N.º':index+1,'Delegación':`Delegación Departamental INTUR ${delegationName(a.delegationId)}`,'Fecha':a.date,'Hora':a.time,'Tema de capacitación':a.topic,'Tipo de actividad':a.activityType,'Estado':STATUS_LABEL[a.status],'Municipio':a.municipality,'Lugar / establecimiento':a.location,'Modalidad':a.modality,'Institución que imparte':a.trainingProvider||'Pendiente de definir','Persona facilitadora DDT':a.trainingProvider==='DDT (INTUR)'?(a.ddtFacilitator||'Pendiente de definir'):'No aplica','Responsable territorial':a.responsible,'Instituciones participantes':a.institution,'Proyección de participantes':a.projectedParticipants,'Hombres':a.men??'','Mujeres':a.women??'','Total asistencia':a.totalParticipants??'','Asistencia verificada':attendanceIsComplete(a)?'Sí':a.status==='DESARROLLADA'?'Pendiente / revisar':'No aplica','Resumen de resultados':a.summary||'','Observaciones':a.observations||'','Criterio de conteo':countingRule(a)||'Una actividad por registro','Motivo de reprogramación':a.rescheduleReason||'','Motivo de cancelación':a.cancellationReason||'','Fecha original':a.originalDate||''}))}

function appendDataSheets(XLSX:typeof import('xlsx-js-style'),workbook:Workbook,selected:Activity[]){
 const rows=detailRows(selected),data=XLSX.utils.json_to_sheet(rows),catalogs=XLSX.utils.aoa_to_sheet([['DELEGACIONES'],...delegations.map(d=>[d.id,`Delegación Departamental INTUR ${d.name}`]),[],['INSTITUCIONES QUE IMPARTEN'],...trainingProviders.map(x=>[x]),[],['FACILITADORES DDT (INTUR)'],...ddtFacilitators.map(x=>[x])])
 data['!cols']=[{wch:6},{wch:40},{wch:12},{wch:10},{wch:38},{wch:20},{wch:16},{wch:18},{wch:32},{wch:14},{wch:25},{wch:28},{wch:24},{wch:30},{wch:15},{wch:12},{wch:12},{wch:16},{wch:20},{wch:42},{wch:42},{wch:46},{wch:28},{wch:26},{wch:13}];catalogs['!cols']=[{wch:34},{wch:48}]
 if(rows.length)data['!autofilter']={ref:`A1:Y${rows.length+1}`};styleRange(data,1,1,0,24,headerStyle);setRowHeights(data,1,1,30);styleRange(data,2,rows.length+1,0,24,bodyStyle);styleRange(catalogs,1,1,0,1,headerStyle);styleRange(catalogs,2,36,0,1,bodyStyle)
 XLSX.utils.book_append_sheet(workbook,data,'Datos para IA');XLSX.utils.book_append_sheet(workbook,catalogs,'Catálogos')
}

function weeklyPlanSheet(XLSX:typeof import('xlsx-js-style'),selected:Activity[],range:{start:string,end:string}){
 const rows=selected.map((a,i)=>[i+1,humanDate(a.date),a.time,delegationName(a.delegationId),a.municipality,a.topic,a.location,a.institution,a.projectedParticipants,facilitator(a),a.responsible,note(a)])
 const sheet=XLSX.utils.aoa_to_sheet([['DIRECCIÓN DE DESARROLLO TURÍSTICO'],[`PLAN SEMANAL DE CAPACITACIÓN DEL ${periodText(range.start,range.end).toUpperCase()}`],[],['No.','Fecha','Hora','Departamento','Municipio','Nombre de la capacitación','Lugar','Participan / grupo meta','Proyección','Imparte','Responsable','Observaciones'],...rows])
 mergeTitle(sheet,'L');styleRange(sheet,1,1,0,11,titleStyle);styleRange(sheet,2,2,0,11,subtitleStyle);styleRange(sheet,4,4,0,11,headerStyle);styleRange(sheet,5,rows.length+4,0,11,bodyStyle)
 for(let r=5;r<=rows.length+4;r++)for(const col of ['A','C','I'])setCellStyle(sheet,`${col}${r}`,bodyCenterStyle)
 sheet['!cols']=[{wch:6},{wch:24},{wch:12},{wch:18},{wch:18},{wch:38},{wch:30},{wch:34},{wch:12},{wch:24},{wch:24},{wch:36}];setRowHeights(sheet,4,4,34);setRowHeights(sheet,5,rows.length+4,42);sheet['!autofilter']={ref:`A4:L${Math.max(4,rows.length+4)}`};sheet['!freeze']={xSplit:0,ySplit:4};return sheet
}

function monthlyPlanSheet(XLSX:typeof import('xlsx-js-style'),selected:Activity[],range:{start:string,end:string}){
 const rows=selected.map((a,i)=>[i+1,delegationName(a.delegationId).toUpperCase(),a.municipality,a.topic,humanDate(a.date),a.time,a.institution,a.men??'',a.women??'',a.totalParticipants??a.projectedParticipants,a.status==='DESARROLLADA'&&attendanceIsComplete(a)?a.totalParticipants:'',a.projectedParticipants,facilitator(a),note(a)])
 const month=new Date(`${range.start}T12:00:00`),monthName=(MONTHS[month.getMonth()]??'').toUpperCase(),sheet=XLSX.utils.aoa_to_sheet([[`PLAN DE CAPACITACIÓN A IMPARTIRSE EN EL MES DE ${monthName} ${month.getFullYear()}`],['DEPARTAMENTO: ACOMPAÑAMIENTO TÉCNICO'],['No.','Departamento','Municipio','Nombre del curso','Fecha programada','Hora programada','Grupo meta','Hombres','Mujeres','Total','Protagonistas certificados','Meta a capacitar','Facilitador','Observaciones'],...rows])
 mergeTitle(sheet,'N');styleRange(sheet,1,1,0,13,titleStyle);styleRange(sheet,2,2,0,13,subtitleStyle);styleRange(sheet,3,3,0,13,headerStyle);styleRange(sheet,4,rows.length+3,0,13,bodyStyle)
 for(let r=4;r<=rows.length+3;r++)for(const col of ['A','E','F','H','I','J','K','L'])setCellStyle(sheet,`${col}${r}`,bodyCenterStyle)
 sheet['!cols']=[{wch:6},{wch:18},{wch:18},{wch:38},{wch:26},{wch:18},{wch:36},{wch:10},{wch:10},{wch:10},{wch:16},{wch:14},{wch:25},{wch:38}];setRowHeights(sheet,3,3,34);setRowHeights(sheet,4,rows.length+3,45);sheet['!autofilter']={ref:`A3:N${Math.max(3,rows.length+3)}`};sheet['!freeze']={xSplit:0,ySplit:3};return sheet
}

function weeklyReportSheet(XLSX:typeof import('xlsx-js-style'),selected:Activity[],range:{start:string,end:string}){
 const valid=selected.filter(attendanceIsComplete),men=valid.reduce((s,a)=>s+(a.men??0),0),women=valid.reduce((s,a)=>s+(a.women??0),0),executed=valid.length,pending=selected.filter(a=>a.status==='PROGRAMADA'||(a.status==='DESARROLLADA'&&!attendanceIsComplete(a))).length,cancelled=selected.filter(a=>a.status==='CANCELADA').length
 const rows=selected.map((a,i)=>[i+1,humanDate(a.date),a.topic,a.time,a.location,a.institution,facilitator(a),a.responsible,STATUS_LABEL[a.status],a.men??'',a.women??'',a.totalParticipants??'',discrepancy(a)?`DISCREPANCIA: hombres + mujeres no coincide con el total. ${note(a)}`:(a.status==='DESARROLLADA'&&!attendanceIsComplete(a)?`Sin reporte completo recibido. ${note(a)}`:([a.summary,note(a)].filter(Boolean).join(' · ')))])
 const summary=`Se listan ${selected.length} actividades; ${executed} cuentan con ejecución y asistencia completa, ${pending} permanecen programadas o pendientes de reporte y ${cancelled} no fueron ejecutadas.`,totals=`Total de protagonistas capacitados con asistencia verificada: ${men+women} (${men} hombres y ${women} mujeres).`
 const sheet=XLSX.utils.aoa_to_sheet([['DIRECCIÓN DE DESARROLLO TURÍSTICO'],[`INFORME SEMANAL DEL ${periodText(range.start,range.end).toUpperCase()}`],[],[summary],[totals],[],['No.','Fecha','Actividad','Hora','Lugar','Instituciones participantes','Imparte','Responsable','Estado','Hombres','Mujeres','Total','Resultados / observaciones'],...rows])
 sheet['!merges']=[{s:{r:0,c:0},e:{r:0,c:12}},{s:{r:1,c:0},e:{r:1,c:12}},{s:{r:3,c:0},e:{r:3,c:12}},{s:{r:4,c:0},e:{r:4,c:12}}]
 styleRange(sheet,1,1,0,12,titleStyle);styleRange(sheet,2,2,0,12,subtitleStyle);styleRange(sheet,4,4,0,12,{font:{name:'Courier New',sz:9,color:{rgb:INK}},alignment:alignLeft,fill:{fgColor:{rgb:PALE_BLUE}}});styleRange(sheet,5,5,0,12,{font:{name:'Courier New',bold:true,sz:9,color:{rgb:NAVY}},alignment:alignLeft,fill:{fgColor:{rgb:PALE_GREEN}}});styleRange(sheet,7,7,0,12,headerStyle);styleRange(sheet,8,rows.length+7,0,12,bodyStyle)
 for(let r=8;r<=rows.length+7;r++)for(const col of ['A','D','I','J','K','L'])setCellStyle(sheet,`${col}${r}`,bodyCenterStyle)
 sheet['!cols']=[{wch:6},{wch:24},{wch:36},{wch:11},{wch:30},{wch:34},{wch:24},{wch:24},{wch:16},{wch:10},{wch:10},{wch:10},{wch:45}];setRowHeights(sheet,4,5,30);setRowHeights(sheet,7,7,34);setRowHeights(sheet,8,rows.length+7,46);sheet['!autofilter']={ref:`A7:M${Math.max(7,rows.length+7)}`};sheet['!freeze']={xSplit:0,ySplit:7};return sheet
}

function summarySheet(XLSX:typeof import('xlsx-js-style'),selected:Activity[],periodLabel:string,delegationId:string){
 const summaryRows=delegations.filter(d=>!delegationId||d.id===delegationId).map(d=>{const rows=selected.filter(a=>a.delegationId===d.id),valid=rows.filter(attendanceIsComplete);const men=valid.reduce((sum,a)=>sum+(a.men??0),0),women=valid.reduce((sum,a)=>sum+(a.women??0),0);return [`Delegación Departamental INTUR ${d.name}`,rows.length,rows.filter(a=>a.status==='PROGRAMADA').length,valid.length,rows.filter(a=>a.status==='DESARROLLADA'&&!attendanceIsComplete(a)).length,rows.filter(wasRescheduled).length,rows.filter(a=>a.status==='CANCELADA').length,men,women,men+women]})
 const sheet=XLSX.utils.aoa_to_sheet([['INSTITUTO NICARAGÜENSE DE TURISMO'],['RESUMEN DE CAPACITACIONES POR DELEGACIÓN'],[],['Período',periodLabel],[],['Delegación','Actividades listadas','Programadas','Ejecutadas con reporte','Pendientes de reporte','Reprogramadas','Canceladas','Hombres','Mujeres','Total protagonistas'],...summaryRows])
 sheet['!merges']=[{s:{r:0,c:0},e:{r:0,c:9}},{s:{r:1,c:0},e:{r:1,c:9}}];styleRange(sheet,1,1,0,9,titleStyle);styleRange(sheet,2,2,0,9,subtitleStyle);styleRange(sheet,4,4,0,1,{font:{bold:true,color:{rgb:NAVY}},fill:{fgColor:{rgb:PALE_YELLOW}},alignment:alignLeft});styleRange(sheet,6,6,0,9,headerStyle);styleRange(sheet,7,summaryRows.length+6,0,9,bodyStyle)
 for(let r=7;r<=summaryRows.length+6;r++)for(let c=1;c<=9;c++)setCellStyle(sheet,`${String.fromCharCode(65+c)}${r}`,bodyCenterStyle)
 sheet['!cols']=[{wch:42},{wch:17},{wch:14},{wch:20},{wch:20},{wch:16},{wch:14},{wch:12},{wch:12},{wch:20}];setRowHeights(sheet,6,6,34);sheet['!autofilter']={ref:`A6:J${Math.max(6,summaryRows.length+6)}`};sheet['!freeze']={xSplit:0,ySplit:6};return sheet
}

export async function exportActivitiesExcel(activities:Activity[],period:ExportPeriod,reference=toInputDate(new Date()),delegationId='',template:ExportTemplate=period==='week'?'weekly-report':period==='month'?'monthly-plan':period==='all'?'database':'department-summary'){
 const XLSX=await import('xlsx-js-style'),range=period==='week'?weekRange(reference):period==='month'?monthRange(reference):period==='year'?yearRange(reference):null
 // Preserve the historical monthly plan after activities are reported.
 // `date` is always the effective date after a rescheduling, and only
 // cancelled activities are removed from the plan.
 const isMonthlyPlanActivity=(a:Activity)=>a.status!=='CANCELADA'
 const selected=activities.filter(a=>(!range||inDateRange(a,range.start,range.end))&&(!delegationId||a.delegationId===delegationId)&&(template!=='monthly-plan'||isMonthlyPlanActivity(a))).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)||delegationName(a.delegationId).localeCompare(delegationName(b.delegationId)))
 const periodLabel=range?periodText(range.start,range.end):'Todos los registros',workbook=XLSX.utils.book_new();let main:Sheet,name='Resumen',stem='base_actividades'
 if(template==='weekly-plan'&&range){main=weeklyPlanSheet(XLSX,selected,range);name='Plan semanal';stem='plan_semanal'}else if(template==='weekly-report'&&range){main=weeklyReportSheet(XLSX,selected,range);name='Informe semanal';stem='informe_semanal'}else if(template==='monthly-plan'&&range){main=monthlyPlanSheet(XLSX,selected,range);name='Plan mensual';stem='plan_capacitacion_mensual'}else{main=summarySheet(XLSX,selected,periodLabel,delegationId);name='Resumen';stem=template==='department-summary'?'resumen_departamental':'base_actividades'}
 XLSX.utils.book_append_sheet(workbook,main,name);appendDataSheets(XLSX,workbook,selected)
 const scope=delegationId?`_${safe(delegationName(delegationId))}`:'',filename=`INTUR_${stem}${scope}_${range?range.start:reference}.xlsx`,bytes=XLSX.write(workbook,{bookType:'xlsx',type:'array',cellStyles:true})
 const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})),link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
