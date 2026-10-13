import {inDateRange,weekRange} from '../lib/activity'
import type {Activity} from '../types'
import {weeklyPlanDates} from './exportWeeklyPlanWord'

type WeekRange={start:string;end:string}
type TextOptions={font:string;color:string;align?:CanvasTextAlign;lineHeight?:number}

const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const shortDays=['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB']
const accents=['#7a879b','#f5c400','#d5007f','#00a6df','#8554b8','#16a463','#7a879b']
const parseDate=(value:string)=>new Date(`${value}T12:00:00`)
const clean=(value:string)=>value.trim()||'Pendiente de confirmar'

function timeOrder(value:string){
 const match=value.toLocaleLowerCase('es').match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)/)
 if(!match)return Number.MAX_SAFE_INTEGER
 let hour=Number(match[1]);const minute=Number(match[2]??0)
 if(match[3]?.startsWith('p')&&hour<12)hour+=12
 if(match[3]?.startsWith('a')&&hour===12)hour=0
 return hour*60+minute
}

function periodTitle(range:WeekRange){
 const start=parseDate(range.start),end=parseDate(range.end)
 if(start.getMonth()===end.getMonth())return `Del ${start.getDate()} al ${end.getDate()} de ${months[end.getMonth()]} de ${end.getFullYear()}`
 return `Del ${start.getDate()} de ${months[start.getMonth()]} al ${end.getDate()} de ${months[end.getMonth()]} de ${end.getFullYear()}`
}

function filePeriod(range:WeekRange){
 const start=parseDate(range.start),end=parseDate(range.end)
 return `${start.getDate()} DE ${months[start.getMonth()]} AL ${end.getDate()} DE ${months[end.getMonth()]} DEL ${end.getFullYear()}`.toUpperCase()
}

function responsible(activity:Activity){
 return activity.trainingProvider==='DDT (INTUR)'&&activity.ddtFacilitator.trim()?activity.ddtFacilitator:activity.responsible||activity.trainingProvider
}

function dateLines(activity:Activity){
 const explicit=weeklyPlanDates(activity.observations).replace(/^Fechas:\s*/i,'').replace(/\.$/,'')
 if(explicit){
  const match=explicit.match(/^(.+?)\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+de\s+\d{4})?$/i)
  if(match)return [match[1]!.toUpperCase(),match[2]!.toUpperCase()]
  return [explicit.toUpperCase()]
 }
 const date=parseDate(activity.date)
 return [`${shortDays[date.getDay()]} ${date.getDate()}`,months[date.getMonth()]!.toUpperCase()]
}

function roundRect(context:CanvasRenderingContext2D,x:number,y:number,width:number,height:number,radius:number){
 const r=Math.min(radius,width/2,height/2)
 context.beginPath();context.moveTo(x+r,y);context.arcTo(x+width,y,x+width,y+height,r);context.arcTo(x+width,y+height,x,y+height,r);context.arcTo(x,y+height,x,y,r);context.arcTo(x,y,x+width,y,r);context.closePath()
}

function wrapText(context:CanvasRenderingContext2D,text:string,maxWidth:number,maxLines=3,font='600 20px Arial'){
 const previousFont=context.font
 context.font=font
 const words=clean(text).split(/\s+/),lines:string[]=[]
 let current=''
 for(const word of words){
  const next=current?`${current} ${word}`:word
  if(context.measureText(next).width<=maxWidth||!current)current=next
  else{lines.push(current);current=word}
 }
 if(current)lines.push(current)
 if(lines.length<=maxLines){context.font=previousFont;return lines}
 const kept=lines.slice(0,maxLines)
 let last=kept[maxLines-1]!
 while(last.length&&context.measureText(`${last}…`).width>maxWidth)last=last.slice(0,-1)
 kept[maxLines-1]=`${last.trim()}…`
 context.font=previousFont
 return kept
}

function drawLines(context:CanvasRenderingContext2D,lines:string[],x:number,centerY:number,options:TextOptions){
 const lineHeight=options.lineHeight??28
 context.font=options.font;context.fillStyle=options.color;context.textAlign=options.align??'left';context.textBaseline='middle'
 const top=centerY-(lines.length-1)*lineHeight/2
 lines.forEach((line,index)=>context.fillText(line,x,top+index*lineHeight))
}

function drawCellLines(context:CanvasRenderingContext2D,lines:string[],x:number,centerY:number,cell:{left:number;top:number;width:number;height:number},options:TextOptions){
 context.save();context.beginPath();context.rect(cell.left,cell.top,cell.width,cell.height);context.clip();drawLines(context,lines,x,centerY,options);context.restore()
}

async function loadLogo(){
 return new Promise<HTMLImageElement>((resolve,reject)=>{
  const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('No se pudo cargar el logotipo institucional.'));image.src='/logo-intur-nicaragua.png'
 })
}

function download(blob:Blob,name:string){
 const url=URL.createObjectURL(blob),link=document.createElement('a')
 link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000)
}

export async function createWeeklyPlanImage(items:Activity[],range:WeekRange){
 const expected=weekRange(range.start)
 if(!/^\d{4}-\d{2}-\d{2}$/.test(range.start)||expected.start!==range.start||expected.end!==range.end)throw new Error('El plan semanal debe abarcar de lunes a viernes de la misma semana.')
 const selected=items.filter(activity=>activity.status!=='CANCELADA'&&inDateRange(activity,range.start,range.end)&&parseDate(activity.date).getDay()>=1&&parseDate(activity.date).getDay()<=5).sort((a,b)=>a.date.localeCompare(b.date)||timeOrder(a.time)-timeOrder(b.time)||a.topic.localeCompare(b.topic,'es'))
 if(!selected.length)throw new Error('No hay actividades para incluir en la imagen del plan semanal.')

 const canvas=document.createElement('canvas'),measure=canvas.getContext('2d')
 if(!measure)throw new Error('El navegador no pudo preparar la imagen.')
 const rows=selected.map(activity=>{
  const content={
   activity:wrapText(measure,activity.topic,320,3,'750 22px Arial'),
   time:wrapText(measure,activity.time,145,3,'650 21px Arial'),
   place:wrapText(measure,activity.location||activity.municipality,275,3,'600 20px Arial'),
   participants:wrapText(measure,activity.institution,345,3,'600 20px Arial'),
   responsible:wrapText(measure,responsible(activity),190,3,'700 21px Arial'),
   date:dateLines(activity),
  }
  const lineCount=Math.max(...Object.values(content).map(lines=>lines.length))
  return {activity,content,height:Math.max(108,lineCount*28+38)}
 })
 const width=1920,tableTop=270,tableHeaderHeight=86,footerHeight=74
 const height=Math.max(1080,tableTop+tableHeaderHeight+rows.reduce((sum,row)=>sum+row.height,0)+footerHeight)
 canvas.width=width;canvas.height=height
 const context=canvas.getContext('2d')
 if(!context)throw new Error('El navegador no pudo generar la imagen.')

 context.fillStyle='#eef3f8';context.fillRect(0,0,width,height)
 ;[['#d5007f',0],['#00a6df',480],['#16a463',960],['#f5c400',1440]].forEach(([color,x])=>{context.fillStyle=String(color);context.fillRect(Number(x),0,480,10)})
 context.fillStyle='#fff';context.fillRect(0,10,width,224)
 const logo=await loadLogo();context.drawImage(logo,68,45,315,91)
 drawLines(context,['PLAN SEMANAL DE CAPACITACIÓN'],430,76,{font:'800 44px Arial',color:'#142b5e'})
 drawLines(context,[periodTitle(range)],430,122,{font:'600 27px Arial',color:'#5c6980'})
 drawLines(context,['Dirección de Desarrollo Turístico'],430,166,{font:'750 20px Arial',color:'#d5007f'})

 roundRect(context,1340,62,210,70,18);context.fillStyle='#eaf7ef';context.fill();context.strokeStyle='#b8dfc7';context.lineWidth=2;context.stroke()
 drawLines(context,['ACTIVIDADES'],1365,86,{font:'800 15px Arial',color:'#26724b'})
 drawLines(context,[`${selected.length} programadas`],1365,113,{font:'800 23px Arial',color:'#142b5e'})
 const totalProjection=selected.reduce((sum,activity)=>sum+activity.projectedParticipants,0)
 roundRect(context,1570,62,280,70,18);context.fillStyle='#eaf8fd';context.fill();context.strokeStyle='#b8dfec';context.stroke()
 drawLines(context,['PROYECCIÓN TOTAL'],1595,86,{font:'800 15px Arial',color:'#08749c'})
 drawLines(context,[`${totalProjection} protagonistas`],1595,113,{font:'800 23px Arial',color:'#142b5e'})
 drawLines(context,['GENERADO DESDE SAT'],1754,170,{font:'750 14px Arial',color:'#7a879b',align:'right'})

 const tableHeight=tableHeaderHeight+rows.reduce((sum,row)=>sum+row.height,0)
 roundRect(context,55,tableTop,1795,tableHeight,20);context.fillStyle='#fff';context.fill();context.strokeStyle='#d5dfea';context.lineWidth=2;context.stroke()
 context.save();roundRect(context,55,tableTop,1795,tableHeight,20);context.clip();context.fillStyle='#173a75';context.fillRect(55,tableTop,1795,tableHeaderHeight)
 const headers=[['FECHA',70],['ACTIVIDAD',240],['HORA',605],['LUGAR',785],['PARTICIPAN',1085],['PROYECCIÓN',1530],['RESPONSABLE',1638]] as const
 headers.forEach(([label,x])=>drawLines(context,[label],x,tableTop+tableHeaderHeight/2,{font:'800 17px Arial',color:'#fff',align:label==='PROYECCIÓN'?'center':'left'}))
 let y=tableTop+tableHeaderHeight
 rows.forEach(({activity,content,height:rowHeight},index)=>{
  const day=parseDate(activity.date).getDay(),accent=accents[day]??'#7a879b',center=y+rowHeight/2
  context.fillStyle=index%2===0?'#fff':'#f9fbfd';context.fillRect(55,y,1795,rowHeight)
  context.globalAlpha=.055;context.fillStyle=accent;context.fillRect(55,y,1795,rowHeight);context.globalAlpha=1
  context.fillStyle=accent;context.fillRect(55,y,8,rowHeight)
  context.strokeStyle='#dce4ee';context.lineWidth=1;context.beginPath();context.moveTo(55,y+rowHeight);context.lineTo(1850,y+rowHeight);context.stroke()
  drawCellLines(context,content.date,82,center,{left:70,top:y,width:150,height:rowHeight},{font:'800 21px Arial',color:accent,lineHeight:28})
  drawCellLines(context,content.activity,240,center,{left:230,top:y,width:355,height:rowHeight},{font:'750 22px Arial',color:'#142b5e',lineHeight:28})
  drawCellLines(context,content.time,605,center,{left:595,top:y,width:175,height:rowHeight},{font:'650 21px Arial',color:'#43536f',lineHeight:28})
  drawCellLines(context,content.place,785,center,{left:775,top:y,width:295,height:rowHeight},{font:'600 20px Arial',color:'#43536f',lineHeight:27})
  drawCellLines(context,content.participants,1085,center,{left:1075,top:y,width:365,height:rowHeight},{font:'600 20px Arial',color:'#43536f',lineHeight:27})
  drawCellLines(context,[String(activity.projectedParticipants)],1530,center,{left:1445,top:y,width:170,height:rowHeight},{font:'800 28px Arial',color:'#142b5e',align:'center'})
  drawCellLines(context,content.responsible,1638,center,{left:1625,top:y,width:220,height:rowHeight},{font:'700 21px Arial',color:'#142b5e',lineHeight:28})
  y+=rowHeight
 })
 context.restore()

 const footerY=height-36
 ;['#d5007f','#00a6df','#16a463','#f5c400'].forEach((color,index)=>{context.beginPath();context.arc(74+index*22,footerY-1,7,0,Math.PI*2);context.fillStyle=color;context.fill()})
 drawLines(context,['Acompañamiento Técnico | INTUR Nicaragua'],160,footerY,{font:'650 17px Arial',color:'#607087'})
 drawLines(context,['Planificación territorial'],1850,footerY,{font:'650 17px Arial',color:'#607087',align:'right'})

 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('No se pudo convertir el plan a PNG.')),'image/png'))
 return {blob,name:`PLAN SEMANAL DEL ${filePeriod(range)}.png`}
}

export async function exportWeeklyPlanImage(items:Activity[],range:WeekRange){
 const result=await createWeeklyPlanImage(items,range);download(result.blob,result.name)
}
