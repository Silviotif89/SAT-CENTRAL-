import {readFile,writeFile,mkdir} from 'node:fs/promises'
import assert from 'node:assert/strict'
import {JSDOM} from 'jsdom'
import PizZip from 'pizzip'
import {septemberActivities} from '../src/data/septemberActivities'
import {octoberActivities} from '../src/data/octoberActivities'
import {createWeeklyPlanWord,weeklyPlanDates} from '../src/services/exportWeeklyPlanWord'
const dom=new JSDOM()
Object.assign(globalThis,{DOMParser:dom.window.DOMParser,XMLSerializer:dom.window.XMLSerializer})
const template=await readFile('public/templates/Plan_semanal_INTUR_base.docx')
globalThis.fetch=(async()=>new Response(template)) as typeof fetch
const all=[...septemberActivities,...octoberActivities]
assert.equal(weeklyPlanDates('Actividad programada para el 13, 14 y 15 de octubre de 2026. · Lugar: Centro · Fuente: Plan mensual.'),'Fechas: 13, 14 y 15 de octubre de 2026.')
assert.equal(weeklyPlanDates('Actividad programada del 27 de octubre al 03 de noviembre de 2026. Curso con INATEC'),'Fechas: 27 de octubre al 03 de noviembre de 2026.')
assert.equal(weeklyPlanDates('Curso con encuentros los días 1, 2, 8 y 9 de septiembre; se contabiliza como una sola actividad.'),'Fechas: 1, 2, 8 y 9 de septiembre.')
for(const note of ['', 'Fuente: Plan semanal 31 de agosto al 4 de septiembre', 'Actividad adelantada del 30 al 24 de septiembre de 2026', 'Actividad programada para el 13 de octubre de 2026.', 'La delegación asume el transporte'])assert.equal(weeklyPlanDates(note),'')
const range={start:'2026-09-28',end:'2026-10-02'}
const fixture={...all[0]!,date:'2026-10-03',topic:'EXCLUDED_WEEKEND'}
const result=await createWeeklyPlanWord([...all,fixture],range)
const bytes=Buffer.from(await result.blob.arrayBuffer()),zip=new PizZip(bytes),original=new PizZip(template)
for(const [name,file] of Object.entries(original.files))if(!file.dir&&name!=='word/document.xml')assert.deepEqual(zip.file(name)!.asUint8Array(),file.asUint8Array(),name)
const xml=zip.file('word/document.xml')!.asText()
assert(!xml.includes('EXCLUDED_WEEKEND'))
const doc=new dom.window.DOMParser().parseFromString(xml,'application/xml')
assert.equal(doc.getElementsByTagName('parsererror').length,0)
const text=doc.documentElement.textContent!
assert(!text.includes('Observación:'))
assert(!text.includes('Fuente:'))
assert(!text.includes('La delegación asume el transporte'))
assert(text.includes('Fechas: 28 al 30 de septiembre de 2026.'))
assert(text.includes('28 DE SEPTIEMBRE AL 2 DE OCTUBRE DEL 2026'))
const selected=all.filter(a=>a.date>=range.start&&a.date<=range.end)
assert.equal((text.match(/Proyección de Participantes:/g)||[]).length,selected.length)
for(const a of selected)assert(text.includes(a.topic))
await assert.rejects(()=>createWeeklyPlanWord(all,{...range,end:'2026-10-04'}))
const crossing=await createWeeklyPlanWord([],{start:'2026-12-28',end:'2027-01-01'})
assert(crossing.name.includes('2026 AL 1 DE ENERO DEL 2027'))
await mkdir('work/weekly-plan-check',{recursive:true})
await writeFile('work/weekly-plan-check/sample.docx',bytes)
console.log(`PASS: ${selected.length} activities, weekdays, year boundary, all template parts preserved byte-for-byte.`)
