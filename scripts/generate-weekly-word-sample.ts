import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {JSDOM} from 'jsdom'
import {septemberActivities} from '../src/data/septemberActivities'
import {octoberActivities} from '../src/data/octoberActivities'

const dom=new JSDOM()
Object.assign(globalThis,{DOMParser:dom.window.DOMParser,XMLSerializer:dom.window.XMLSerializer})
const template=resolve('public/templates/Informe_semanal_INTUR_base.docx')
globalThis.fetch=(async()=>new Response(await readFile(template))) as typeof fetch

const {createWeeklyReportWord}=await import('../src/services/exportWeeklyReportWord')
const range={start:process.env.WEEK_START??'2026-09-28',end:process.env.WEEK_END??'2026-10-02'}
const items=[...septemberActivities,...octoberActivities].filter(activity=>activity.date>=range.start&&activity.date<=range.end)
const {blob,name}=await createWeeklyReportWord(items,range)
const outputDir=resolve('work/weekly-word-template/generated')
await mkdir(outputDir,{recursive:true})
const output=resolve(outputDir,name)
await writeFile(output,Buffer.from(await blob.arrayBuffer()))
console.log(output)
