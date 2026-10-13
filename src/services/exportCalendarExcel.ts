import type { Activity } from '../types'

const monthName=(monthKey:string)=>{
  const [year,month]=monthKey.split('-').map(Number)
  return new Intl.DateTimeFormat('es-NI',{month:'long',year:'numeric'}).format(new Date(year!,month!-1,1))
}

const calendarRow=(activity:Activity)=>{
  const isDdt=activity.trainingProvider==='DDT (INTUR)'
  const marker=isDdt?'🔴 DDT (INTUR)':'🟢 Otra institución'
  const color=isDdt?'Rojo':'Verde'
  const provider=activity.trainingProvider||'Pendiente de definir'
  const facilitator=isDdt?(activity.ddtFacilitator||activity.responsible||'Pendiente de definir'):(activity.responsible||'Pendiente de definir')
  const instruction=isDdt
    ?'Crear este evento con bolita roja: actividad impartida por DDT (INTUR).'
    :'Crear este evento con bolita verde: actividad impartida por otra institución.'
  return [
    activity.date,
    activity.time,
    activity.topic,
    provider,
    facilitator,
    activity.location,
    activity.municipality,
    activity.status,
    marker,
    color,
    instruction,
    `INTUR | ${activity.topic}. ${activity.date} ${activity.time}. Imparte: ${provider}. Lugar: ${activity.location}.`,
  ]
}

export async function exportCalendarActivitiesExcel(activities:Activity[],monthKey:string){
  const XLSX=await import('xlsx-js-style')
  const selected=activities
    .filter(activity=>activity.date.startsWith(monthKey)&&activity.status!=='CANCELADA')
    .sort((a,b)=>`${a.date} ${a.time} ${a.topic}`.localeCompare(`${b.date} ${b.time} ${b.topic}`,'es'))
  const headers=['Fecha','Hora','Actividad','Institución que imparte','Facilitador o responsable','Lugar','Municipio','Estado','Indicador para calendario','Color de bolita','Instrucción para ChatGPT','Descripción del evento']
  const rows=selected.map(calendarRow)
  const sheet=XLSX.utils.aoa_to_sheet([
    ['CALENDARIO DE ACTIVIDADES INTUR PARA IMPORTACIÓN ASISTIDA'],
    [`Mes exportado: ${monthName(monthKey)}`],
    ['Regla: 🔴 Rojo para actividades impartidas por DDT (INTUR). 🟢 Verde para las demás instituciones.'],
    headers,
    ...rows,
  ])
  sheet['!merges']=[{s:{r:0,c:0},e:{r:0,c:headers.length-1}},{s:{r:1,c:0},e:{r:1,c:headers.length-1}},{s:{r:2,c:0},e:{r:2,c:headers.length-1}}]
  sheet['!cols']=[{wch:14},{wch:13},{wch:42},{wch:25},{wch:28},{wch:34},{wch:20},{wch:16},{wch:24},{wch:16},{wch:58},{wch:72}]
  sheet['!rows']=[{hpt:26},{hpt:20},{hpt:28},{hpt:32},...rows.map(()=>({hpt:42}))]
  sheet['!autofilter']={ref:`A4:L${Math.max(4,rows.length+4)}`}
  sheet['!freeze']={xSplit:0,ySplit:4}
  const border={top:{style:'thin',color:{rgb:'B9C5C0'}},bottom:{style:'thin',color:{rgb:'B9C5C0'}},left:{style:'thin',color:{rgb:'B9C5C0'}},right:{style:'thin',color:{rgb:'B9C5C0'}}}
  const title={fill:{fgColor:{rgb:'FFFFFF'}},font:{name:'Cambria',bold:true,sz:13,color:{rgb:'1C2F78'}},alignment:{horizontal:'center',vertical:'center'}}
  const note={fill:{fgColor:{rgb:'FFFFFF'}},font:{name:'Cambria',italic:true,sz:10,color:{rgb:'17213F'}},alignment:{horizontal:'left',vertical:'center',wrapText:true}}
  const header={fill:{fgColor:{rgb:'049CCC'}},font:{name:'Cambria',bold:true,sz:10,color:{rgb:'FFFFFF'}},alignment:{horizontal:'center',vertical:'center',wrapText:true},border}
  const body={fill:{fgColor:{rgb:'FFFFFF'}},font:{name:'Cambria',sz:9,color:{rgb:'17213F'}},alignment:{horizontal:'left',vertical:'center',wrapText:true},border}
  const markerRed={...body,fill:{fgColor:{rgb:'FCE4D6'}},font:{name:'Cambria',bold:true,sz:9,color:{rgb:'9C0006'}},alignment:{horizontal:'center',vertical:'center',wrapText:true}}
  const markerGreen={...body,fill:{fgColor:{rgb:'E2F0D9'}},font:{name:'Cambria',bold:true,sz:9,color:{rgb:'375623'}},alignment:{horizontal:'center',vertical:'center',wrapText:true}}
  const setStyle=(address:string,style:object)=>{const cell=sheet[address]??(sheet[address]={t:'s',v:''});cell.s=style}
  for(let col=0;col<headers.length;col++)setStyle(`${String.fromCharCode(65+col)}1`,title)
  for(let row=2;row<=3;row++)for(let col=0;col<headers.length;col++)setStyle(`${String.fromCharCode(65+col)}${row}`,note)
  for(let col=0;col<headers.length;col++)setStyle(`${String.fromCharCode(65+col)}4`,header)
  rows.forEach((row,rowIndex)=>{
    const excelRow=rowIndex+5
    for(let col=0;col<headers.length;col++)setStyle(`${String.fromCharCode(65+col)}${excelRow}`,body)
    setStyle(`I${excelRow}`,row[9]==='Rojo'?markerRed:markerGreen)
    setStyle(`J${excelRow}`,row[9]==='Rojo'?markerRed:markerGreen)
  })
  const workbook=XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook,sheet,'Calendario para IA')
  const bytes=XLSX.write(workbook,{bookType:'xlsx',type:'array',cellStyles:true})
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}))
  const link=document.createElement('a')
  link.href=url
  link.download=`INTUR_calendario_para_IA_${monthKey}.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
}
