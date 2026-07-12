// The event is in Florida, so timestamps are always shown in Eastern Time
// (with the correct EST/EDT offset for the date) no matter what timezone
// the admin's own browser happens to be in.
const EASTERN_TIME_ZONE = 'America/New_York'
const easternFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: EASTERN_TIME_ZONE,
  dateStyle: 'short',
  timeStyle: 'short',
})

function formatSignedUpAt(value) {
  if (!value) return ''
  return `${easternFormatter.format(new Date(value))} ET`
}

const easternDateParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: EASTERN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// en-CA formats as YYYY-MM-DD. Using the Eastern date (not the admin's
// browser-local date) keeps the exported filename correct even if a
// leader opens the roster while traveling in a different timezone.
export function todayEasternDateStamp() {
  return easternDateParts.format(new Date())
}

const COLUMNS = [
  ['created_at', 'Signed up (Eastern Time)', formatSignedUpAt],
  ['role', 'Role'],
  ['unit', 'Ward'],
  ['name', 'Name'],
  ['phone', 'Phone'],
  ['reservation_time', 'Temple reservation time'],
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
  const lines = rows.map((row) =>
    COLUMNS.map(([key, , formatter]) => escapeCell(formatter ? formatter(row[key]) : row[key])).join(',')
  )
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
