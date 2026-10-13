import PizZip from 'pizzip'

const WORD_NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const XML_NS='http://www.w3.org/XML/1998/namespace'
const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
export type WeekRange={start:string;end:string}

export interface TransportRequest {
 activityId:string
 included:boolean
 requestDate:string
 organizationalUnit:string
 vehicle:string
 driver:boolean
 fuel:boolean
 departureDate:string
 departureTime:string
 returnDate:string
 returnTime:string
 publicServant:string
 destination:string
 reason:string
 internalRoute:string
 requestedBy:string
 requesterUnit:string
}

const parseDate=(value:string)=>new Date(`${value}T12:00:00`)
const directChildren=(node:Element,name:string)=>[...node.children].filter(child=>child.localName===name)
const tablesIn=(nodes:Element[])=>nodes.flatMap(node=>node.localName==='tbl'?[node]:[...node.getElementsByTagNameNS(WORD_NS,'tbl')])
const rowsIn=(table:Element)=>directChildren(table,'tr')
const cellsIn=(row:Element)=>directChildren(row,'tc')

function periodLabel(range:WeekRange){
 const start=parseDate(range.start),end=parseDate(range.end)
 return `${start.getDate()} DE ${months[start.getMonth()]} AL ${end.getDate()} DE ${months[end.getMonth()]} DE ${end.getFullYear()}`.toUpperCase()
}

function formattedParts(value:string){
 const date=parseDate(value)
 if(!Number.isFinite(date.getTime()))return ['','','']
 return [`${date.getDate()}`.padStart(2,'0'),`${date.getMonth()+1}`.padStart(2,'0'),`${date.getFullYear()}`]
}

function contentRun(xml:XMLDocument,source:Element,value:string){
 const sourceRun=source.getElementsByTagNameNS(WORD_NS,'r')[0]
 const run=(sourceRun?.cloneNode(true)??xml.createElementNS(WORD_NS,'w:r')) as Element
 for(const child of [...run.children])if(child.localName!=='rPr')run.removeChild(child)
 value.split('\n').forEach((line,index)=>{
  if(index)run.appendChild(xml.createElementNS(WORD_NS,'w:br'))
  const text=xml.createElementNS(WORD_NS,'w:t')
  text.setAttributeNS(XML_NS,'xml:space','preserve')
  text.textContent=line
  run.appendChild(text)
 })
 return run
}

function setParagraphText(xml:XMLDocument,paragraph:Element,value:string){
 const run=contentRun(xml,paragraph,value)
 for(const child of [...paragraph.children])if(child.localName!=='pPr')paragraph.removeChild(child)
 paragraph.appendChild(run)
}

function setCellText(xml:XMLDocument,cell:Element,value:string){
 const paragraphs=directChildren(cell,'p'),sourceParagraph=paragraphs[0]
 if(!sourceParagraph)return
 const paragraph=sourceParagraph.cloneNode(true) as Element
 for(const child of [...paragraph.children])if(child.localName!=='pPr')paragraph.removeChild(child)
 paragraph.appendChild(contentRun(xml,sourceParagraph,value))
 for(const existing of paragraphs)cell.removeChild(existing)
 cell.appendChild(paragraph)
}

function fillRequest(xml:XMLDocument,nodes:Element[],request:TransportRequest){
 const tables=tablesIn(nodes)
 if(tables.length<6)throw new Error('La plantilla de transporte no contiene todas las tablas esperadas.')
 const organizationRow=rowsIn(tables[0]!)[1],requestRow=rowsIn(tables[0]!)[2],vehicleRow=rowsIn(tables[1]!)[0],departureRow=rowsIn(tables[2]!)[1],returnRow=rowsIn(tables[3]!)[1],detailRow=rowsIn(tables[4]!)[1],routeRow=rowsIn(tables[5]!)[0]
 if(!organizationRow||!requestRow||!vehicleRow||!departureRow||!returnRow||!detailRow||!routeRow)throw new Error('La estructura de la plantilla de transporte cambió.')
 const organizationCells=cellsIn(organizationRow),requestCells=cellsIn(requestRow),vehicleCells=cellsIn(vehicleRow),departureCells=cellsIn(departureRow),returnCells=cellsIn(returnRow),detailCells=cellsIn(detailRow),routeCells=cellsIn(routeRow)
 if(organizationCells.length<1||requestCells.length<4||vehicleCells.length<8||departureCells.length<5||returnCells.length<5||detailCells.length<4||routeCells.length<2)throw new Error('La estructura de la plantilla de transporte cambió.')
 setCellText(xml,organizationCells[0]!,request.organizationalUnit)
 formattedParts(request.requestDate).forEach((part,index)=>setCellText(xml,requestCells[index+1]!,part))
 setCellText(xml,vehicleCells[1]!,request.vehicle)
 setCellText(xml,vehicleCells[4]!,request.driver?'X':'')
 setCellText(xml,vehicleCells[7]!,request.fuel?'X':'')
 formattedParts(request.departureDate).forEach((part,index)=>setCellText(xml,departureCells[index+1]!,part))
 setCellText(xml,departureCells[4]!,request.departureTime)
 formattedParts(request.returnDate).forEach((part,index)=>setCellText(xml,returnCells[index+1]!,part))
 setCellText(xml,returnCells[4]!,request.returnTime)
 setCellText(xml,detailCells[0]!,'1')
 setCellText(xml,detailCells[1]!,request.publicServant)
 setCellText(xml,detailCells[2]!,request.destination)
 setCellText(xml,detailCells[3]!,request.reason)
 setCellText(xml,routeCells[1]!,request.internalRoute)
 const paragraphs=nodes.filter(node=>node.localName==='p')
 const responsible=paragraphs.find(paragraph=>paragraph.textContent?.trim().startsWith('Responsable '))
 const responsibleIndex=responsible?paragraphs.indexOf(responsible):-1
 if(responsible)setParagraphText(xml,responsible,`Responsable ${request.requestedBy}`)
 if(responsibleIndex>=0&&paragraphs[responsibleIndex+1])setParagraphText(xml,paragraphs[responsibleIndex+1]!,request.requesterUnit)
}

function startOnNewPage(xml:XMLDocument,node:Element){
 if(node.localName!=='p')throw new Error('La plantilla de transporte no inicia con un párrafo.')
 let properties=directChildren(node,'pPr')[0]
 if(!properties){properties=xml.createElementNS(WORD_NS,'w:pPr');node.insertBefore(properties,node.firstChild)}
 properties.appendChild(xml.createElementNS(WORD_NS,'w:pageBreakBefore'))
}

function buildDocumentXml(source:string,requests:TransportRequest[]){
 const xml=new DOMParser().parseFromString(source,'application/xml')
 if(xml.getElementsByTagName('parsererror').length)throw new Error('No se pudo interpretar la plantilla de transporte.')
 const body=xml.getElementsByTagNameNS(WORD_NS,'body')[0]
 if(!body)throw new Error('La plantilla de transporte no contiene el documento principal.')
 const section=directChildren(body,'sectPr')[0]
 if(!section)throw new Error('La plantilla de transporte no contiene la configuración de página.')
 const template=[...body.children].filter(child=>child!==section).map(child=>child.cloneNode(true) as Element)
 while(template.at(-1)?.localName==='p'&&!template.at(-1)?.textContent?.trim()&&!template.at(-1)?.getElementsByTagNameNS(WORD_NS,'drawing').length)template.pop()
 for(const child of [...body.children])if(child!==section)body.removeChild(child)
 requests.forEach((request,index)=>{
  const block=template.map(node=>node.cloneNode(true) as Element)
  if(index)startOnNewPage(xml,block[0]!)
  fillRequest(xml,block,request)
  for(const node of block)body.insertBefore(node,section)
 })
 return new XMLSerializer().serializeToString(xml)
}

export const transportRequestComplete=(request:TransportRequest)=>Boolean(request.requestDate&&request.organizationalUnit.trim()&&request.vehicle.trim()&&request.departureDate&&request.departureTime.trim()&&request.returnDate&&request.returnTime.trim()&&request.publicServant.trim()&&request.destination.trim()&&request.reason.trim()&&request.internalRoute.trim()&&request.requestedBy.trim()&&request.requesterUnit.trim())

export async function createTransportRequestsWord(requests:TransportRequest[],range:WeekRange){
 const selected=requests.filter(request=>request.included)
 if(!selected.length)throw new Error('Seleccioná al menos una solicitud para incluir en el Word.')
 if(selected.some(request=>!transportRequestComplete(request)))throw new Error('Completá todos los campos obligatorios de las solicitudes seleccionadas.')
 if(selected.some(request=>request.departureDate<range.start||request.departureDate>range.end||request.returnDate<range.start||request.returnDate>range.end))throw new Error('Las fechas de salida y regreso deben estar entre el lunes y el viernes de la semana seleccionada.')
 const response=await fetch(new URL('templates/Solicitud_transporte_DDT_base.docx',globalThis.document.baseURI).toString())
 if(!response.ok)throw new Error('No se pudo cargar la plantilla institucional de solicitudes de transporte.')
 const zip=new PizZip(await response.arrayBuffer()),document=zip.file('word/document.xml')
 if(!document)throw new Error('La plantilla de transporte no contiene el documento principal.')
 zip.file('word/document.xml',buildDocumentXml(document.asText(),selected))
 return {blob:zip.generate({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',compression:'DEFLATE'}),name:`SOLICITUDES DE TRANSPORTE DEL ${periodLabel(range)}.docx`,count:selected.length}
}

export async function exportTransportRequestsWord(requests:TransportRequest[],range:WeekRange){
 const {blob,name}=await createTransportRequestsWord(requests,range)
 const url=URL.createObjectURL(blob),link=document.createElement('a')
 link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove()
 window.setTimeout(()=>URL.revokeObjectURL(url),1000)
}
