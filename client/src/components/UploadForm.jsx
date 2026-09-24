import { useState } from 'react'
import {
  CheckCircle2,
  FileSpreadsheet,
  UploadCloud,
  X,
} from 'lucide-react'

import { readFileHeaders } from '../services/fileParser'
import { apiRequest } from '../services/api'
import ColumnMapping from './ColumnMapping.jsx'
import UploadValidationErrors from './UploadValidationErrors.jsx'

const sourceSystems = [
  {
    value: 'CBS',
    label: 'Core Banking System (CBS)',
  },
  {
    value: 'ATM',
    label: 'ATM',
  },
  {
    value: 'INTERNET_BANKING',
    label: 'Internet Banking',
  },
  {
    value: 'MOBILE_BANKING',
    label: 'Mobile Banking',
  },
  {
    value: 'PAYMENT_GATEWAY',
    label: 'Payment Gateway',
  },
  {
    value: 'GENERAL_LEDGER',
    label: 'General Ledger',
  },
  {
    value: 'REMITTANCE',
    label: 'Remittance',
  },
]

const emptyMapping = {
  transactionId: '',
  referenceNumber: '',
  accountNumber: '',
  amount: '',
  transactionDate: '',
  status: '',
}

function UploadForm({ onUploadSuccess }) {
  const [sourceSystem, setSourceSystem] = useState('')
  const [file, setFile] = useState(null)
  const [headers, setHeaders] = useState([])
  const [readingFile, setReadingFile] = useState(false)
  const [showMapping, setShowMapping] = useState(false)

  const [mapping, setMapping] = useState(emptyMapping)

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [validationErrors, setValidationErrors] = useState([])
  const [
    validationErrorsTruncated,
    setValidationErrorsTruncated,
  ] = useState(false)

  const clearValidationErrors = () => {
    setValidationErrors([])
    setValidationErrorsTruncated(false)
  }

  const autoMapColumns = (detectedHeaders) => {
    const normalized = {}

    detectedHeaders.forEach((header) => {
      const key = header
        .toLowerCase()
        .replace(/[\s_-]/g, '')

      normalized[key] = header
    })

    setMapping({
      transactionId:
        normalized.transactionid || '',
      referenceNumber:
        normalized.referencenumber || '',
      accountNumber:
        normalized.accountnumber || '',
      amount:
        normalized.amount || '',
      transactionDate:
        normalized.transactiondate || '',
      status:
        normalized.status || '',
    })
  }

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) {
      return
    }

    setError('')
    setSuccess('')
    clearValidationErrors()
    setHeaders([])
    setShowMapping(false)
    setReadingFile(true)

    try {
      const detectedHeaders =
        await readFileHeaders(selectedFile)

      if (detectedHeaders.length === 0) {
        throw new Error(
          'No column headers were found in this file.',
        )
      }

      setFile(selectedFile)
      setHeaders(detectedHeaders)

      autoMapColumns(detectedHeaders)
    } catch (err) {
      setFile(null)
      setHeaders([])
      setError(err.message)
    } finally {
      setReadingFile(false)
    }
  }

  const removeFile = () => {
    setFile(null)
    setHeaders([])
    setShowMapping(false)
    setError('')
    setSuccess('')
    clearValidationErrors()
    setMapping(emptyMapping)
  }

  const handleContinue = () => {
    setError('')
    setSuccess('')
    clearValidationErrors()
    setShowMapping(true)
  }

  const requiredMappingComplete =
    mapping.transactionId &&
    mapping.amount &&
    mapping.transactionDate &&
    mapping.status

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a transaction file.')
      return
    }

    if (!sourceSystem) {
      setError('Please select a source system.')
      return
    }

    if (!requiredMappingComplete) {
      setError(
        'Please complete all required column mappings.',
      )
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')
    clearValidationErrors()

    try {
      const formData = new FormData()

      formData.append('file', file)
      formData.append('sourceSystem', sourceSystem)
      formData.append(
        'mapping',
        JSON.stringify(mapping),
      )

      const response = await apiRequest('/uploads', {
        method: 'POST',
        body: formData,
      })

      setSuccess(
        response.message ||
          'Transaction file uploaded successfully.',
      )

      const backendValidationErrors =
        response.data?.validationErrors || []

      setValidationErrors(
        backendValidationErrors,
      )

      setValidationErrorsTruncated(
        Boolean(
          response.data
            ?.validationErrorsTruncated,
        ),
      )

      if (onUploadSuccess) {
        onUploadSuccess()
      }

      setSourceSystem('')
      setFile(null)
      setHeaders([])
      setShowMapping(false)
      setMapping(emptyMapping)
    } catch (err) {
      setError(err.message)

      const backendValidationErrors =
        err.data?.data?.validationErrors || []

      setValidationErrors(
        backendValidationErrors,
      )

      setValidationErrorsTruncated(
        Boolean(
          err.data?.data
            ?.validationErrorsTruncated,
        ),
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-medium text-amber-600">
          New Upload
        </p>

        <h2 className="mt-1 text-xl font-semibold text-stone-900">
          Import transaction file
        </h2>

        <p className="mt-2 text-sm leading-6 text-stone-500">
          Select the banking system and choose a CSV or Excel file.
        </p>
      </div>

      <div className="mt-6 space-y-6">

        {/* Source system */}
        <div>
          <label
            htmlFor="sourceSystem"
            className="mb-2 block text-sm font-medium text-stone-700"
          >
            Source system
          </label>

          <select
            id="sourceSystem"
            value={sourceSystem}
            onChange={(event) =>
              setSourceSystem(event.target.value)
            }
            disabled={uploading}
            className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">
              Select a banking system
            </option>

            {sourceSystems.map((system) => (
              <option
                key={system.value}
                value={system.value}
              >
                {system.label}
              </option>
            ))}
          </select>
        </div>

        {/* File selection */}
        <div>
          <p className="mb-2 text-sm font-medium text-stone-700">
            Transaction file
          </p>

          {!file ? (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 px-6 py-10 text-center transition hover:border-amber-400 hover:bg-amber-50/40">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
                <UploadCloud size={22} />
              </div>

              <p className="mt-4 text-sm font-semibold text-stone-800">
                {readingFile
                  ? 'Reading file...'
                  : 'Choose a transaction file'}
              </p>

              <p className="mt-1 text-xs text-stone-500">
                CSV or XLSX files only
              </p>

              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileChange}
                disabled={readingFile || uploading}
                className="hidden"
              />
            </label>
          ) : (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <FileSpreadsheet size={20} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-800">
                    {file.name}
                  </p>

                  <p className="mt-1 text-xs text-stone-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={removeFile}
                disabled={uploading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-200 hover:text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Remove selected file"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Main error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Detailed row validation */}
        <UploadValidationErrors
          validationErrors={validationErrors}
          truncated={validationErrorsTruncated}
        />

        {/* Success */}
        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        {/* Detected headers */}
        {headers.length > 0 && (
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-stone-700">
                Detected columns
              </p>

              <span className="text-xs text-stone-400">
                {headers.length} columns
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {headers.map((header) => (
                <span
                  key={header}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600"
                >
                  {header}
                </span>
              ))}
            </div>
          </div>
        )}

        {!showMapping && (
          <button
            type="button"
            onClick={handleContinue}
            disabled={
              !sourceSystem ||
              !file ||
              headers.length === 0 ||
              readingFile
            }
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            <UploadCloud size={18} />
            Continue
          </button>
        )}

        {showMapping && (
          <>
            <ColumnMapping
              headers={headers}
              mapping={mapping}
              setMapping={setMapping}
            />

            <button
              type="button"
              onClick={handleUpload}
              disabled={
                uploading ||
                !requiredMappingComplete
              }
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              <UploadCloud size={18} />

              {uploading
                ? 'Uploading...'
                : 'Upload transactions'}
            </button>
          </>
        )}
      </div>
    </section>
  )
}

export default UploadForm