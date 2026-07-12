const COLUMNS = [
  ['created_at', 'Signed up'],
  ['role', 'Role'],
  ['unit', 'Ward'],
  ['name', 'Name'],
  ['phone', 'Phone'],
  ['seats', 'Seats offered'],
  ['depart_time', 'Leaving at'],
  ['depart_place', 'Leaving from'],
  ['party', 'People in group'],
  ['needs', 'Notes'],
]

function escapeCell(value) {
  const str = value === null || value === undefined ? '' : String(value)
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

export function rowsToCsv(rows) {
  const header = COLUMNS.map(([, label]) => escapeCell(label)).join(',')
  const lines = rows.map((row) => COLUMNS.map(([key]) => escapeCell(row[key])).join(','))
  return [header, ...lines].join('\r\n')
}

export function downloadCsv(filename, rows) {
  const csv = rowsToCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
