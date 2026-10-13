import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { JSDOM } from 'jsdom'
import PizZip from 'pizzip'
import { septemberActivities } from '../src/data/septemberActivities'
import { octoberActivities } from '../src/data/octoberActivities'
import { buildMonthlyReportExcel, monthlyReportedActivities } from '../src/services/exportMonthlyReportExcel'
const dom = new JSDOM()
Object.assign(globalThis, { DOMParser: dom.window.DOMParser })
const all = [...septemberActivities, ...octoberActivities]
const valid = monthlyReportedActivities(all, '2026-09')
assert.ok(valid.length > 0)
const sample = valid[0]!
const excluded = [
  {...sample, status: 'PROGRAMADA'}, {...sample, status: 'CANCELADA'},
  {...sample, status: 'REPROGRAMADA'}, {...sample, men: null},
  {...sample, totalParticipants: sample.totalParticipants! + 1},
  {...sample, men: -1}, {...sample, men: NaN}, {...sample, date: '2026-10-01'},
] as typeof all
assert.equal(monthlyReportedActivities([...valid, ...excluded], '2026-09').length, valid.length)
const template = await readFile('public/templates/Informe_mensual_INTUR_base.xlsx')
const bytes = buildMonthlyReportExcel(template, all, '2026-09')
const zip = new PizZip(bytes)
const xml = zip.file('xl/worksheets/sheet1.xml')!.asText()
const parsed = new dom.window.DOMParser().parseFromString(xml, 'application/xml')
assert.equal(parsed.getElementsByTagName('parsererror').length, 0)
assert.equal(parsed.getElementsByTagName('row').length, valid.length + 4)
assert.equal(parsed.querySelectorAll('c[t="s"]').length, 0)
assert.equal(zip.file('xl/styles.xml')!.asText(), new PizZip(template).file('xl/styles.xml')!.asText())
assert.equal(zip.file('xl/sharedStrings.xml')!.asText().includes('JULIO'), false)
assert.equal(zip.file('xl/calcChain.xml'), null)
assert.throws(() => buildMonthlyReportExcel(template, all, '2026-13'))
assert.throws(() => buildMonthlyReportExcel(template, [], '2026-09'))
const singleton = buildMonthlyReportExcel(template, [sample], '2026-09')
assert.ok(new PizZip(singleton).file('xl/worksheets/sheet1.xml')!.asText().includes('SUM(I4:I4)'))
await writeFile('work/informe-mensual-validation.xlsx', bytes)
console.log(JSON.stringify({activities:valid.length,men:valid.reduce((s,a)=>s+a.men!,0),women:valid.reduce((s,a)=>s+a.women!,0),total:valid.reduce((s,a)=>s+a.totalParticipants!,0),checks:'passed'}))

// Verify the browser download adapter without changing stored activity data.
const { exportMonthlyReportExcel } = await import('../src/services/exportMonthlyReportExcel')
Object.assign(globalThis, { document: dom.window.document })
let downloadName = '', downloadBlob: Blob | undefined
Object.defineProperty(dom.window.HTMLAnchorElement.prototype, 'click', {value: function() { downloadName = this.download }})
globalThis.fetch = (async () => new Response(template)) as typeof fetch
URL.createObjectURL = (blob: Blob) => { downloadBlob = blob; return 'blob:monthly-report-test' }
URL.revokeObjectURL = () => {}
await exportMonthlyReportExcel(all, '2026-09')
assert.equal(downloadName, 'INTUR_Informe_mensual_2026-09.xlsx')
assert.ok(downloadBlob && downloadBlob.size > 0)
assert.equal(dom.window.document.querySelectorAll('a').length, 0)
console.log('Download filename, Excel Blob, and link cleanup: passed')
