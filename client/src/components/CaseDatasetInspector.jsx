import {
  useMemo,
  useState,
} from 'react'

import {
  AlertTriangle,
  Database,
  FileSearch,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react'

import { apiRequest } from '../services/api'

function formatAmount(amount) {
  if (
    amount === null ||
    amount === undefined
  ) {
    return '—'
  }

  if (
    typeof amount === 'object' &&
    amount.$numberDecimal
  ) {
    return amount.$numberDecimal
  }

  return String(amount)
}

function formatDate(value) {
  if (!value) {
    return '—'
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return String(value)
  }

  return date.toLocaleString()
}

function formatRawValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '—'
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

function formatLabel(value) {
  if (!value) {
    return '—'
  }

  return String(value)
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    )
}

function getUploadName(upload) {
  return (
    upload?.originalName ||
    upload?.fileName ||
    'File unavailable'
  )
}

function CaseDatasetInspector({
  caseRecord,
}) {
  const [open, setOpen] =
    useState(false)

  const [side, setSide] =
    useState(null)

  const [dataset, setDataset] =
    useState(null)

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  const [searchTerm, setSearchTerm] =
    useState('')

  const [activeTab, setActiveTab] =
    useState('valid')

  /*
   * ----------------------------------------
   * CASE ORIGIN
   * ----------------------------------------
   */
  const isDataQualityCase =
    caseRecord?.originType ===
      'DATA_QUALITY_ISSUE' ||
    Boolean(
      caseRecord?.dataQualityIssueId &&
        !caseRecord?.exceptionId,
    )

  /*
   * ----------------------------------------
   * RECONCILIATION CONTEXT
   * ----------------------------------------
   */
  const exception =
    caseRecord?.exceptionId

  const reconciliation =
    exception?.reconciliationId

  const sourceUpload =
    reconciliation?.sourceUploadId

  const targetUpload =
    reconciliation?.targetUploadId

  /*
   * ----------------------------------------
   * DATA QUALITY CONTEXT
   * ----------------------------------------
   */
  const dataQualityIssue =
    caseRecord?.dataQualityIssueId

  const originalUpload =
    caseRecord?.originalUploadId ||
    dataQualityIssue?.uploadId

  /*
   * ----------------------------------------
   * OPEN DATASET
   * ----------------------------------------
   */
  const openDataset = async (
    selectedSide,
  ) => {
    setSide(selectedSide)
    setOpen(true)
    setLoading(true)
    setError('')
    setDataset(null)
    setSearchTerm('')
    setActiveTab('valid')

    try {
      const response =
        await apiRequest(
          `/cases/${caseRecord._id}/dataset/${selectedSide}`,
        )

      setDataset(response.data)
    } catch (err) {
      setError(
        err.message ||
          'Unable to load dataset.',
      )
    } finally {
      setLoading(false)
    }
  }

  /*
   * ----------------------------------------
   * AFFECTED ROW LOOKUP
   * ----------------------------------------
   *
   * The backend gives us:
   *
   * - exact affected Mongo transaction IDs
   * - detected key(s), such as DQ2001
   *
   * This lets BankSync visually distinguish
   * the records the Data Quality scanner
   * identified while still showing the full
   * original banking dataset.
   */
  const affectedIdSet =
    useMemo(
      () =>
        new Set(
          (
            dataset
              ?.affectedTransactionIds ||
            []
          ).map(String),
        ),
      [dataset],
    )

  const affectedKeySet =
    useMemo(
      () =>
        new Set(
          (
            dataset
              ?.affectedTransactionKeys ||
            []
          ).map((value) =>
            String(value)
              .trim()
              .toLowerCase(),
          ),
        ),
      [dataset],
    )

  const isAffectedTransaction = (
    transaction,
  ) => {
    if (!isDataQualityCase) {
      return false
    }

    const transactionObjectId =
      transaction?._id
        ? String(transaction._id)
        : ''

    if (
      transactionObjectId &&
      affectedIdSet.has(
        transactionObjectId,
      )
    ) {
      return true
    }

    const possibleKeys = [
      transaction?.transactionId,
      transaction?.referenceNumber,
    ]
      .filter(Boolean)
      .map((value) =>
        String(value)
          .trim()
          .toLowerCase(),
      )

    return possibleKeys.some(
      (value) =>
        affectedKeySet.has(value),
    )
  }

  /*
   * ----------------------------------------
   * SEARCH VALID TRANSACTIONS
   * ----------------------------------------
   */
  const filteredTransactions =
    useMemo(() => {
      const transactions =
        dataset?.transactions || []

      const query =
        searchTerm
          .trim()
          .toLowerCase()

      if (!query) {
        return transactions
      }

      return transactions.filter(
        (transaction) => {
          const searchableValues = [
            transaction.transactionId,
            transaction.referenceNumber,
            transaction.accountNumber,
            transaction.sourceSystem,
            transaction.status,
            formatAmount(
              transaction.amount,
            ),
            transaction.transactionDate,
          ]

          return searchableValues.some(
            (value) =>
              String(value || '')
                .toLowerCase()
                .includes(query),
          )
        },
      )
    }, [
      dataset,
      searchTerm,
    ])

  /*
   * ----------------------------------------
   * SEARCH REJECTED ROWS
   * ----------------------------------------
   */
  const filteredRejectedRows =
    useMemo(() => {
      const rejectedRows =
        dataset?.rejectedRows || []

      const query =
        searchTerm
          .trim()
          .toLowerCase()

      if (!query) {
        return rejectedRows
      }

      return rejectedRows.filter(
        (row) => {
          const rawRecord =
            JSON.stringify(
              row.rawRecord || {},
            ).toLowerCase()

          const issues =
            JSON.stringify(
              row.validationIssues || [],
            ).toLowerCase()

          return (
            rawRecord.includes(query) ||
            issues.includes(query) ||
            String(
              row.recordNumber || '',
            ).includes(query)
          )
        },
      )
    }, [
      dataset,
      searchTerm,
    ])

  const closeModal = () => {
    setOpen(false)
    setSide(null)
    setDataset(null)
    setError('')
    setSearchTerm('')
    setActiveTab('valid')
  }

  /*
   * ----------------------------------------
   * NOTHING TO INSPECT
   * ----------------------------------------
   */
  if (!caseRecord) {
    return null
  }

  if (
    !isDataQualityCase &&
    !reconciliation
  ) {
    return null
  }

  if (
    isDataQualityCase &&
    !originalUpload
  ) {
    return null
  }

  return (
    <>
      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Database size={20} />
          </div>

          <div>
            <h2 className="font-semibold text-stone-900">
              Dataset Investigation
            </h2>

            <p className="mt-1 text-sm leading-6 text-stone-500">
              {isDataQualityCase
                ? 'Inspect the complete original uploaded banking dataset in read-only mode. BankSync highlights the records connected to the detected Data Quality issue so the Maker can investigate the evidence before recommending remediation.'
                : 'Inspect valid transactions and rejected rows from both sides of the reconciliation.'}
            </p>
          </div>
        </div>

        {isDataQualityCase ? (
          <div className="mt-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                    Original Uploaded Banking Dataset
                  </p>

                  <p className="mt-2 break-all text-sm font-semibold text-stone-900">
                    {getUploadName(
                      originalUpload,
                    )}
                  </p>

                  <p className="mt-1 text-sm text-stone-500">
                    {originalUpload
                      ?.sourceSystem ||
                      dataQualityIssue
                        ?.sourceSystem ||
                      '—'}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-stone-600">
                      {originalUpload
                        ?.totalRows ??
                        '—'}{' '}
                      total
                    </span>

                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {originalUpload
                        ?.validRows ??
                        '—'}{' '}
                      valid
                    </span>

                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                      {originalUpload
                        ?.invalidRows ??
                        '—'}{' '}
                      rejected
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    openDataset(
                      'original',
                    )
                  }
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white transition hover:bg-stone-800"
                >
                  <FileSearch
                    size={16}
                  />

                  Inspect Original
                  Dataset
                </button>
              </div>

              <div className="mt-5 rounded-xl border border-amber-200 bg-white/70 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert
                    size={18}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />

                  <div>
                    <p className="text-sm font-semibold text-stone-900">
                      Read-only investigation
                      evidence
                    </p>

                    <p className="mt-1 text-xs leading-5 text-stone-600">
                      The Maker can inspect
                      the original data but
                      cannot edit it here.
                      Any approved source
                      correction will later
                      be performed through
                      the Import Officer
                      correction workflow,
                      followed by BankSync
                      re-scan and
                      verification before
                      reconciliation use.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Source Dataset
              </p>

              <p className="mt-2 break-all text-sm font-semibold text-stone-900">
                {sourceUpload
                  ?.originalName ||
                  sourceUpload?.fileName ||
                  'Source file unavailable'}
              </p>

              <p className="mt-1 text-sm text-stone-500">
                {sourceUpload
                  ?.sourceSystem ||
                  '—'}
              </p>

              <button
                type="button"
                onClick={() =>
                  openDataset(
                    'source',
                  )
                }
                disabled={
                  !sourceUpload
                }
                className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileSearch
                  size={16}
                />

                Inspect Source
                Dataset
              </button>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Target Dataset
              </p>

              <p className="mt-2 break-all text-sm font-semibold text-stone-900">
                {targetUpload
                  ?.originalName ||
                  targetUpload?.fileName ||
                  'Target file unavailable'}
              </p>

              <p className="mt-1 text-sm text-stone-500">
                {targetUpload
                  ?.sourceSystem ||
                  '—'}
              </p>

              <button
                type="button"
                onClick={() =>
                  openDataset(
                    'target',
                  )
                }
                disabled={
                  !targetUpload
                }
                className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileSearch
                  size={16}
                />

                Inspect Target
                Dataset
              </button>
            </div>
          </div>
        )}
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

            {/* HEADER */}
            <div className="flex items-start justify-between border-b border-stone-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                  {side ===
                  'source'
                    ? 'Source Dataset'
                    : side ===
                        'target'
                      ? 'Target Dataset'
                      : 'Original Uploaded Dataset'}
                </p>

                <h2 className="mt-1 text-xl font-semibold text-stone-900">
                  {dataset?.upload
                    ?.originalName ||
                    dataset?.upload
                      ?.fileName ||
                    'Dataset Inspector'}
                </h2>

                {dataset?.upload && (
                  <p className="mt-2 text-sm text-stone-500">
                    {
                      dataset.upload
                        .sourceSystem
                    }
                    {' · '}
                    {
                      dataset.transactionCount
                    }{' '}
                    valid
                    {' · '}
                    {
                      dataset.rejectedRowCount ||
                      0
                    }{' '}
                    rejected
                    {dataset?.readOnly
                      ? ' · Read only'
                      : ''}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
              >
                <X size={20} />
              </button>
            </div>

            {/* DATA QUALITY ISSUE CONTEXT */}
            {isDataQualityCase &&
              dataset?.issueContext && (
                <div className="border-b border-amber-200 bg-amber-50/50 px-6 py-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-stone-400">
                        Detected Issue
                      </p>

                      <p className="mt-1 text-sm font-semibold text-stone-900">
                        {formatLabel(
                          dataset
                            .issueContext
                            .issueType,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-stone-400">
                        Detected Key
                      </p>

                      <p className="mt-1 font-mono text-sm font-semibold text-stone-900">
                        {dataset
                          .issueContext
                          .keyValue ||
                          '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-stone-400">
                        Severity
                      </p>

                      <p className="mt-1 text-sm font-semibold text-stone-900">
                        {formatLabel(
                          dataset
                            .issueContext
                            .severity,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-stone-400">
                        Affected Records
                      </p>

                      <p className="mt-1 text-sm font-semibold text-stone-900">
                        {
                          dataset
                            ?.affectedTransactionIds
                            ?.length
                        }
                      </p>
                    </div>
                  </div>

                  {dataset
                    .issueContext
                    .description && (
                    <p className="mt-3 text-xs leading-5 text-stone-600">
                      {
                        dataset
                          .issueContext
                          .description
                      }
                    </p>
                  )}
                </div>
              )}

            {/* DATASET COUNTS */}
            <div className="grid gap-3 border-b border-stone-200 bg-stone-50 px-6 py-4 sm:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-400">
                  Total Rows
                </p>

                <p className="mt-1 text-sm font-semibold text-stone-900">
                  {dataset?.upload
                    ?.totalRows ?? '—'}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-stone-400">
                  Valid Rows
                </p>

                <p className="mt-1 text-sm font-semibold text-emerald-700">
                  {dataset?.upload
                    ?.validRows ?? '—'}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-stone-400">
                  Invalid Rows
                </p>

                <p className="mt-1 text-sm font-semibold text-red-700">
                  {dataset?.upload
                    ?.invalidRows ?? '—'}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-stone-400">
                  Stored Transactions
                </p>

                <p className="mt-1 text-sm font-semibold text-stone-900">
                  {dataset
                    ?.transactionCount ?? '—'}
                </p>
              </div>
            </div>

            {/* TABS */}
            <div className="border-b border-stone-200 px-6 pt-4">
              <div className="flex gap-6">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(
                      'valid',
                    )

                    setSearchTerm('')
                  }}
                  className={`border-b-2 pb-3 text-sm font-semibold transition ${
                    activeTab ===
                    'valid'
                      ? 'border-amber-500 text-stone-900'
                      : 'border-transparent text-stone-400'
                  }`}
                >
                  Valid Transactions (
                  {dataset
                    ?.transactionCount ||
                    0}
                  )
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(
                      'rejected',
                    )

                    setSearchTerm('')
                  }}
                  className={`border-b-2 pb-3 text-sm font-semibold transition ${
                    activeTab ===
                    'rejected'
                      ? 'border-red-500 text-red-700'
                      : 'border-transparent text-stone-400'
                  }`}
                >
                  Rejected Rows (
                  {dataset
                    ?.rejectedRowCount ||
                    0}
                  )
                </button>
              </div>
            </div>

            {/* SEARCH */}
            <div className="border-b border-stone-200 px-6 py-4">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                />

                <input
                  type="text"
                  value={
                    searchTerm
                  }
                  onChange={(
                    event,
                  ) =>
                    setSearchTerm(
                      event.target
                        .value,
                    )
                  }
                  placeholder={
                    activeTab ===
                    'valid'
                      ? 'Search transaction ID, reference, account, amount, status...'
                      : 'Search rejected row data or validation error...'
                  }
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-4 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-auto">
              {loading && (
                <div className="flex min-h-64 items-center justify-center">
                  <p className="text-sm font-medium text-stone-500">
                    Loading
                    dataset...
                  </p>
                </div>
              )}

              {!loading &&
                error && (
                  <div className="m-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

              {/* VALID TRANSACTIONS */}
              {!loading &&
                !error &&
                dataset &&
                activeTab ===
                  'valid' && (
                  <>
                    {filteredTransactions.length ===
                    0 ? (
                      <div className="flex min-h-64 items-center justify-center px-6">
                        <p className="text-sm text-stone-500">
                          No valid
                          transactions
                          match your
                          search.
                        </p>
                      </div>
                    ) : (
                      <div className="min-w-[1100px]">
                        <table className="w-full border-collapse text-left">
                          <thead className="sticky top-0 z-10 bg-white">
                            <tr className="border-b border-stone-200">
                              {isDataQualityCase && (
                                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                                  Evidence
                                </th>
                              )}

                              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                                Transaction ID
                              </th>

                              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                                Reference
                              </th>

                              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                                Account
                              </th>

                              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                                Amount
                              </th>

                              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                                Date
                              </th>

                              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                                Status
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {filteredTransactions.map(
                              (
                                transaction,
                              ) => {
                                const affected =
                                  isAffectedTransaction(
                                    transaction,
                                  )

                                return (
                                  <tr
                                    key={
                                      transaction._id
                                    }
                                    className={`border-b border-stone-100 transition ${
                                      affected
                                        ? 'bg-amber-50 hover:bg-amber-100/70'
                                        : 'hover:bg-stone-50'
                                    }`}
                                  >
                                    {isDataQualityCase && (
                                      <td className="px-5 py-4">
                                        {affected ? (
                                          <span className="inline-flex whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                                            Affected
                                            Record
                                          </span>
                                        ) : (
                                          <span className="text-xs text-stone-300">
                                            —
                                          </span>
                                        )}
                                      </td>
                                    )}

                                    <td
                                      className={`px-5 py-4 text-sm font-semibold ${
                                        affected
                                          ? 'text-amber-900'
                                          : 'text-stone-900'
                                      }`}
                                    >
                                      {
                                        transaction.transactionId
                                      }
                                    </td>

                                    <td className="px-5 py-4 text-sm text-stone-600">
                                      {transaction.referenceNumber ||
                                        '—'}
                                    </td>

                                    <td className="px-5 py-4 text-sm text-stone-600">
                                      {transaction.accountNumber ||
                                        '—'}
                                    </td>

                                    <td className="px-5 py-4 text-sm text-stone-700">
                                      {formatAmount(
                                        transaction.amount,
                                      )}
                                    </td>

                                    <td className="px-5 py-4 text-sm text-stone-600">
                                      {formatDate(
                                        transaction.transactionDate,
                                      )}
                                    </td>

                                    <td className="px-5 py-4 text-sm text-stone-700">
                                      {transaction.status ||
                                        '—'}
                                    </td>
                                  </tr>
                                )
                              },
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}

              {/* REJECTED ROWS */}
              {!loading &&
                !error &&
                dataset &&
                activeTab ===
                  'rejected' && (
                  <div className="space-y-4 p-6">
                    {filteredRejectedRows.length ===
                    0 ? (
                      <div className="flex min-h-48 items-center justify-center">
                        <p className="text-sm text-stone-500">
                          No rejected
                          rows match
                          your search.
                        </p>
                      </div>
                    ) : (
                      filteredRejectedRows.map(
                        (row) => (
                          <div
                            key={
                              row._id
                            }
                            className="rounded-xl border border-red-200 bg-red-50/40 p-5"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <AlertTriangle
                                  size={18}
                                  className="text-red-600"
                                />

                                <h3 className="font-semibold text-stone-900">
                                  Rejected
                                  Row #
                                  {
                                    row.recordNumber
                                  }
                                </h3>
                              </div>
                            </div>

                            <div className="mt-5">
                              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                                Original
                                Row Data
                              </p>

                              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {Object.entries(
                                  row.rawRecord ||
                                    {},
                                ).map(
                                  ([
                                    key,
                                    value,
                                  ]) => (
                                    <div
                                      key={
                                        key
                                      }
                                      className="rounded-lg border border-stone-200 bg-white px-3 py-3"
                                    >
                                      <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                                        {
                                          key
                                        }
                                      </p>

                                      <p className="mt-1 break-all text-sm font-medium text-stone-800">
                                        {formatRawValue(
                                          value,
                                        )}
                                      </p>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>

                            <div className="mt-5">
                              <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                                Why This
                                Row Was
                                Rejected
                              </p>

                              {row
                                .validationIssues
                                ?.length >
                              0 ? (
                                <div className="mt-2 space-y-2">
                                  {row.validationIssues.map(
                                    (
                                      issue,
                                      index,
                                    ) => (
                                      <div
                                        key={
                                          index
                                        }
                                        className="rounded-lg border border-red-200 bg-white px-3 py-3"
                                      >
                                        <p className="text-sm font-semibold text-red-700">
                                          {
                                            issue.field
                                          }
                                        </p>

                                        <p className="mt-1 text-sm text-stone-600">
                                          {
                                            issue.message
                                          }
                                        </p>
                                      </div>
                                    ),
                                  )}
                                </div>
                              ) : (
                                <p className="mt-2 text-sm text-stone-500">
                                  No
                                  validation
                                  issue
                                  details
                                  were
                                  recorded.
                                </p>
                              )}
                            </div>
                          </div>
                        ),
                      )
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default CaseDatasetInspector
