import { readSheet } from 'read-excel-file/browser'

function cleanHeaders(headers) {
  return headers
    .map((header) => String(header ?? '').trim())
    .filter(Boolean)
}

async function readCsvHeaders(file) {
  const text = await file.text()

  const firstLine = text
    .split(/\r?\n/)
    .find((line) => line.trim())

  if (!firstLine) {
    throw new Error('The CSV file is empty.')
  }

  const headers = firstLine.split(',')

  return cleanHeaders(headers)
}

async function readExcelHeaders(file) {
  const rows = await readSheet(file)

  if (!rows.length) {
    throw new Error('The Excel file is empty.')
  }

  return cleanHeaders(rows[0])
}

export async function readFileHeaders(file) {
  if (!file) {
    throw new Error('No file selected.')
  }

  const fileName = file.name.toLowerCase()

  if (fileName.endsWith('.csv')) {
    return readCsvHeaders(file)
  }

  if (fileName.endsWith('.xlsx')) {
    return readExcelHeaders(file)
  }

  throw new Error(
    'Unsupported file type. Please select a CSV or XLSX file.',
  )
}