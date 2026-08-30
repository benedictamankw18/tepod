export function csvLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
}

export function splitCsv(line) {
  return line.split(',').map((c) => c.trim())
}