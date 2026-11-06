import assert from 'node:assert/strict'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {JSDOM} from 'jsdom'
import PizZip from 'pizzip'
import {septemberActivities} from '../src/data/septemberActivities'

const dom=new JSDOM('',{url:'http://localhost/'})
Object.assign(globalThis,{DOMParser:dom.window.DOMParser,XMLSerializer:dom.window.XMLSerializer,document:dom.window.document})
globalThis.fetch=(async()=>new Response(await readFile(resolve('public/templates/Informe_semanal_INTUR_base.docx')))) as typeof fetch

const {createWeeklyReportWord}=await import('../src/services/exportWeeklyReportWord')
const sample=septemberActivities[0]
assert.ok(sample,'Se necesita una actividad de ejemplo.')
const activities=[
 {...sample,id:'time-24-afternoon',date:'2026-09-28',topic:'Prueba horario de tarde',time:'14:00 - 17:30'},
 {...sample,id:'time-24-morning',date:'2026-09-28',topic:'Prueba horario de mañana',time:'08:00 – 12:00'},
 {...sample,id:'time-already-am-pm',date:'2026-09-28',topic:'Prueba horario existente',time:'9:00 a.m. - 11:30 a.m.'},
]
const {blob}=await createWeeklyReportWord(activities,{start:'2026-09-28',end:'2026-10-02'})
await mkdir(resolve('work/weekly-word-template/generated'),{recursive:true})
await writeFile(resolve('work/weekly-word-template/generated/Informe_semanal_prueba_hora.docx'),Buffer.from(await blob.arrayBuffer()))
const zip=new PizZip(await blob.arrayBuffer())
const xml=zip.file('word/document.xml')?.asText()
assert.ok(xml,'El informe generado debe contener el documento Word.')
const parsed=new dom.window.DOMParser().parseFromString(xml,'application/xml')
const paragraphs=[...parsed.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','p')]
 .map(paragraph=>paragraph.textContent??'')
assert.ok(paragraphs.includes('Hora: 2:00 p. m. - 5:30 p. m.'))
assert.ok(paragraphs.includes('Hora: 8:00 a. m. – 12:00 p. m.'))
assert.ok(paragraphs.includes('Hora: 9:00 a.m. - 11:30 a.m.'))
assert.equal(paragraphs.some(paragraph=>paragraph.includes('Hora: 14:00')||paragraph.includes('Hora: 17:30')),false)
console.log('Horarios del informe Word: conversión 24 h y conservación de horas am/pm, correctas.')
