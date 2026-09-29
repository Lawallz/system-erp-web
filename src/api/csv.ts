export function csvCell(value: unknown) {
  const text = String(value ?? '')
  // Protect spreadsheet applications even when a formula has leading whitespace.
  const safe =
    /^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text) ? "'" + text : text
  return `"${safe.replaceAll('"', '""')}"`
}
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: unknown[][],
) {
  const csv = [headers, ...rows]
    .map((row) => row.map(csvCell).join(';'))
    .join('\r\n')
  const url = URL.createObjectURL(
    new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }),
  )
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
