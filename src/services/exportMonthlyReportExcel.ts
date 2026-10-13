import PizZip from 'pizzip'
import { delegationName } from '../data/delegations'
import type { Activity } from '../types'

const TEMPLATE_URL = new URL('templates/Informe_gestion_mensual_INTUR_base.xlsx',document.baseURI).toString()
const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const monthColumns = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']
const annualTarget = 13_550
const augustBaseline = 11_141
const territorialRows: Record<string, number> = {
  'del-01': 4, 'del-02': 5, 'del-03': 6, 'del-04': 7, 'del-05': 8, 'del-06': 9,
  'del-07': 10, 'del-08': 11, 'del-09': 12, 'del-10': 13, 'del-11': 14, 'del-12': 15,
  'del-13': 16, 'del-17': 17, 'del-16': 18, 'del-14': 19, 'del-15': 20,
}

// XML 1.0 forbids these control characters in user-entered text.
// eslint-disable-next-line no-control-regex
const escapeXml = (value: string) => value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

export function monthlyReportedActivities(activities: Activity[], month: string) {
  return activities.filter(a => a.date.startsWith(`${month}-`) && a.status === 'DESARROLLADA'
    && [a.men, a.women, a.totalParticipants].every(n => typeof n === 'number' && Number.isInteger(n) && n >= 0)
    && a.men! + a.women! === a.totalParticipants)
    .sort((a, b) => delegationName(a.delegationId).localeCompare(delegationName(b.delegationId), 'es') || a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
}

function replaceCell(xml: string, ref: string, content: string, type = '') {
  const cell = new RegExp(`<c\\b([^>]*\\br="${ref}"[^>]*)>[\\s\\S]*?</c>`)
  const emptyCell = new RegExp(`<c\\b([^>]*\\br="${ref}"[^>]*)/>`)
  const build = (attributes: string) => {
    const clean = attributes.replace(/\\s+t="[^"]*"/g, '')
    return `<c${clean}${type ? ` t="${type}"` : ''}>${content}</c>`
  }
  if (cell.test(xml)) return xml.replace(cell, (_, attributes: string) => build(attributes))
  if (emptyCell.test(xml)) return xml.replace(emptyCell, (_, attributes: string) => build(attributes))
  throw new Error(`No se encontró la celda ${ref} en la plantilla mensual`)
}

const setText = (xml: string, ref: string, value: string) => replaceCell(xml, ref, `<is><t xml:space="preserve">${escapeXml(value)}</t></is>`, 'inlineStr')
const setNumber = (xml: string, ref: string, value: number) => replaceCell(xml, ref, `<v>${value}</v>`)
const setFormula = (xml: string, ref: string, formula: string, cached: number) => replaceCell(xml, ref, `<f>${escapeXml(formula)}</f><v>${cached}</v>`)

function topicSummary(selected: Activity[]) {
  const topics = [...new Set(selected.map(a => a.topic.trim()).filter(Boolean))]
  const visible = topics.slice(0, 12)
  return `${visible.join(', ')}${topics.length > visible.length ? ', entre otros' : ''}`
}

export function buildMonthlyReportExcel(template: ArrayBuffer | Uint8Array, activities: Activity[], month: string) {
  if (!/^2026-(0[1-9]|1[0-2])$/.test(month)) throw new Error('El informe de gestión está configurado para 2026')
  const monthIndex = Number(month.slice(5)) - 1
  if (monthIndex < 8) throw new Error('El SAT conserva información consolidada para informes desde septiembre de 2026')
  const selected = monthlyReportedActivities(activities, month)
  if (!selected.length) throw new Error('No hay actividades reportadas con asistencia completa en este mes')

  const zip = new PizZip(template)
  let summary = zip.file('xl/worksheets/sheet1.xml')!.asText()
  let territorial = zip.file('xl/worksheets/sheet2.xml')!.asText()
  const monthColumn = monthColumns[monthIndex]!
  const men = selected.reduce((sum, activity) => sum + activity.men!, 0)
  const women = selected.reduce((sum, activity) => sum + activity.women!, 0)
  const total = men + women
  const earlierReported = activities.filter(activity => {
    const activityMonth = activity.date.slice(0, 7)
    return activityMonth >= '2026-09' && activityMonth < month && monthlyReportedActivities([activity], activityMonth).length === 1
  })
  const previous = augustBaseline + earlierReported.reduce((sum, activity) => sum + activity.totalParticipants!, 0)
  const cumulative = previous + total
  const topics = topicSummary(selected)
  const narrative = `Durante el mes de ${months[monthIndex]} se realizaron ${selected.length} capacitaciones, en las que se capacitó a ${total} protagonistas (${men} hombres y ${women} mujeres).${topics ? ` Se abordaron temas como: ${topics}.` : ''}`

  summary = setText(summary, 'A2', 'INFORME DE GESTIÓN MENSUAL')
  summary = setText(summary, 'A3', `Mes: ${months[monthIndex]!.toUpperCase()}-2026`)
  summary = setNumber(summary, 'C7', previous)
  summary = setFormula(summary, 'D7', `TERRITORIALIZACIÓN!${monthColumn}21`, total)
  summary = setFormula(summary, 'E7', 'C7+D7', cumulative)
  summary = setNumber(summary, 'F7', annualTarget)
  summary = setFormula(summary, 'G7', 'E7/F7', cumulative / annualTarget)
  summary = setText(summary, 'H7', narrative)
  summary = setText(summary, 'I7', 'Fortalecer las capacidades técnicas de protagonistas y prestadores de servicios turísticos para mejorar la calidad de la atención y de la oferta turística nacional.')

  const totalsByDelegation = new Map<string, number>()
  for (const activity of selected) totalsByDelegation.set(activity.delegationId, (totalsByDelegation.get(activity.delegationId) ?? 0) + activity.totalParticipants!)
  for (const [delegationId, row] of Object.entries(territorialRows)) territorial = setNumber(territorial, `${monthColumn}${row}`, totalsByDelegation.get(delegationId) ?? 0)
  territorial = setFormula(territorial, `${monthColumn}21`, `SUM(${monthColumn}4:${monthColumn}20)`, total)

  zip.file('xl/worksheets/sheet1.xml', summary)
  zip.file('xl/worksheets/sheet2.xml', territorial)
  zip.remove('xl/calcChain.xml')
  let workbook = zip.file('xl/workbook.xml')!.asText()
  workbook = workbook.replace(/<calcPr[^>]*\/>/, '<calcPr calcId="191029" fullCalcOnLoad="1" forceFullCalc="1"/>')
  zip.file('xl/workbook.xml', workbook)
  for (const path of ['xl/_rels/workbook.xml.rels', '[Content_Types].xml']) {
    zip.file(path, zip.file(path)!.asText().replace(/<(?:Relationship|Override)\b[^>]*calcChain[^>]*\/>/g, ''))
  }
  return zip.generate({ type: 'uint8array', compression: 'DEFLATE' })
}

export async function exportMonthlyReportExcel(activities: Activity[], month: string) {
  const response = await fetch(TEMPLATE_URL)
  if (!response.ok) throw new Error('No se encontró la plantilla del informe de gestión mensual')
  const bytes = buildMonthlyReportExcel(await response.arrayBuffer(), activities, month)
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `INTUR_Informe_de_gestion_${month}.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
