import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  FileWarning,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react'

import { apiRequest } from '../services/api'

function formatLabel(value) {
  if (!value) return '—'

  return String(value)
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    )
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return String(value)
  }

  return date.toLocaleString()
}

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

function collectAffectedTransactions(
  issue,
) {
  if (!issue) return []

  const all = []

  if (
    issue.primaryTransactionId
  ) {
    all.push(
      issue.primaryTransactionId,
    )
  }

  if (
    Array.isArray(
      issue.relatedTransactionIds,
    )
  ) {
    all.push(
      ...issue.relatedTransactionIds,
    )
  }

  const seen = new Set()

  return all.filter(
    (transaction) => {
      const id =
        transaction?._id
          ? String(
              transaction._id,
            )
          : ''

      if (!id || seen.has(id)) {
        return false
      }

      seen.add(id)
      return true
    },
  )
}

function StatusBadge({
  status,
}) {
  const styles = {
    ASSIGNED:
      'bg-amber-50 text-amber-700 border-amber-200',

    IN_PROGRESS:
      'bg-blue-50 text-blue-700 border-blue-200',

    CORRECTED_UPLOAD_SUBMITTED:
      'bg-violet-50 text-violet-700 border-violet-200',

    VERIFICATION_FAILED:
      'bg-red-50 text-red-700 border-red-200',

    VERIFIED_RESOLVED:
      'bg-emerald-50 text-emerald-700 border-emerald-200',

    CANCELLED:
      'bg-stone-100 text-stone-600 border-stone-200',
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
        styles[status] ||
        'bg-stone-50 text-stone-600 border-stone-200'
      }`}
    >
      {formatLabel(status)}
    </span>
  )
}

function ImportCorrectionTasksPage() {
  const [tasks, setTasks] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [
    processingTaskId,
    setProcessingTaskId,
  ] = useState(null)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const [
    uploadForms,
    setUploadForms,
  ] = useState({})

  const [
    uploadingTaskId,
    setUploadingTaskId,
  ] = useState(null)

  const fileInputRefs =
    useRef({})

  const loadTasks =
    async () => {
      setLoading(true)
      setError('')

      try {
        const response =
          await apiRequest(
            '/data-corrections/mine',
          )

        setTasks(
          response.data || [],
        )
      } catch (err) {
        setError(
          err.message ||
            'Unable to load correction tasks.',
        )
      } finally {
        setLoading(false)
      }
    }

  useEffect(() => {
    loadTasks()
  }, [])

  const activeTasks =
    useMemo(
      () =>
        tasks.filter(
          (task) =>
            task.status !==
              'VERIFIED_RESOLVED' &&
            task.status !==
              'CANCELLED',
        ),
      [tasks],
    )

  const completedTasks =
    useMemo(
      () =>
        tasks.filter(
          (task) =>
            task.status ===
              'VERIFIED_RESOLVED' ||
            task.status ===
              'CANCELLED',
        ),
      [tasks],
    )

  const handleStart =
    async (taskId) => {
      setError('')
      setSuccess('')
      setProcessingTaskId(
        taskId,
      )

      try {
        const response =
          await apiRequest(
            `/data-corrections/${taskId}/start`,
            {
              method: 'PATCH',
            },
          )

        setTasks(
          (current) =>
            current.map(
              (task) =>
                task._id ===
                taskId
                  ? response.data
                  : task,
            ),
        )

        setSuccess(
          response.message ||
            'Correction task started.',
        )
      } catch (err) {
        setError(
          err.message ||
            'Unable to start correction task.',
        )
      } finally {
        setProcessingTaskId(
          null,
        )
      }
    }

  const getUploadForm = (
    taskId,
  ) => {
    return (
      uploadForms[taskId] || {
        file: null,
        importOfficerNote: '',
        mapping: {
          transactionId:
            'transactionId',
          referenceNumber:
            'referenceNumber',
          accountNumber:
            'accountNumber',
          amount: 'amount',
          transactionDate:
            'transactionDate',
          status: 'status',
        },
      }
    )
  }

  const updateUploadForm = (
    taskId,
    updater,
  ) => {
    setUploadForms(
      (current) => {
        const existing =
          current[taskId] ||
          getUploadForm(taskId)

        const next =
          typeof updater ===
          'function'
            ? updater(existing)
            : {
                ...existing,
                ...updater,
              }

        return {
          ...current,
          [taskId]: next,
        }
      },
    )
  }

  const handleCorrectedUpload =
    async (
      task,
      event,
    ) => {
      event.preventDefault()

      const form =
        getUploadForm(
          task._id,
        )

      if (!form.file) {
        setError(
          'Choose the corrected CSV or XLSX file.',
        )
        return
      }

      if (
        form.importOfficerNote
          .trim()
          .length < 3
      ) {
        setError(
          'Briefly describe what you corrected in the source extract.',
        )
        return
      }

      const requiredMappingKeys = [
        'transactionId',
        'referenceNumber',
        'accountNumber',
        'amount',
        'transactionDate',
        'status',
      ]

      const mappingMissing =
        requiredMappingKeys.some(
          (key) =>
            !String(
              form.mapping[key] ||
                '',
            ).trim(),
        )

      if (mappingMissing) {
        setError(
          'Complete all six column-mapping fields.',
        )
        return
      }

      setUploadingTaskId(
        task._id,
      )
      setError('')
      setSuccess('')

      try {
        const payload =
          new FormData()

        payload.append(
          'file',
          form.file,
        )

        payload.append(
          'mapping',
          JSON.stringify(
            form.mapping,
          ),
        )

        payload.append(
          'importOfficerNote',
          form.importOfficerNote.trim(),
        )

        const response =
          await apiRequest(
            `/data-corrections/${task._id}/corrected-upload`,
            {
              method: 'POST',
              body: payload,
            },
          )

        setSuccess(
          response.message ||
            'Corrected upload submitted.',
        )

        setUploadForms(
          (current) => {
            const next = {
              ...current,
            }

            delete next[
              task._id
            ]

            return next
          },
        )

        await loadTasks()
      } catch (err) {
        setError(
          err.message ||
            'Unable to submit corrected upload.',
        )
      } finally {
        setUploadingTaskId(
          null,
        )
      }
    }

  const renderTask =
    (task) => {
      const issue =
        task.dataQualityIssueId

      const caseRecord =
        task.caseId

      const upload =
        task.originalUploadId

      const affectedTransactions =
        collectAffectedTransactions(
          issue,
        )

      const canStart =
        [
          'ASSIGNED',
          'VERIFICATION_FAILED',
        ].includes(
          task.status,
        )

      return (
        <article
          key={task._id}
          className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  status={task.status}
                />

                <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-600">
                  {formatLabel(
                    issue?.severity,
                  )}
                </span>
              </div>

              <h2 className="mt-3 text-lg font-semibold text-stone-900">
                Source Data Correction
              </h2>

              <p className="mt-1 text-sm text-stone-500">
                Assigned{' '}
                {formatDate(
                  task.assignedAt,
                )}
              </p>
            </div>

            {canStart && (
              <button
                type="button"
                onClick={() =>
                  handleStart(
                    task._id,
                  )
                }
                disabled={
                  processingTaskId ===
                  task._id
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processingTaskId ===
                task._id ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Play size={16} />
                )}

                {task.status ===
                'VERIFICATION_FAILED'
                  ? 'Restart Correction'
                  : 'Start Correction'}
              </button>
            )}
          </div>

          {/* WORKFLOW CONTEXT */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-stone-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Data Quality Issue
              </p>

              <p className="mt-2 text-sm font-semibold text-stone-900">
                {formatLabel(
                  issue?.issueType,
                )}
              </p>
            </div>

            <div className="rounded-xl bg-stone-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Detected Key
              </p>

              <p className="mt-2 font-mono text-sm font-semibold text-stone-900">
                {issue?.keyValue ||
                  '—'}
              </p>
            </div>

            <div className="rounded-xl bg-stone-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Original Source
              </p>

              <p className="mt-2 text-sm font-semibold text-stone-900">
                {upload
                  ?.sourceSystem ||
                  issue
                    ?.sourceSystem ||
                  '—'}
              </p>
            </div>

            <div className="rounded-xl bg-stone-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Case Status
              </p>

              <p className="mt-2 text-sm font-semibold text-stone-900">
                {formatLabel(
                  caseRecord?.status,
                )}
              </p>
            </div>
          </div>

          {/* ORIGINAL UPLOAD */}
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/40 p-5">
            <div className="flex items-start gap-3">
              <FileWarning
                size={18}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-900">
                  Original Banking Upload — Read Only
                </p>

                <p className="mt-2 break-all text-sm text-stone-700">
                  {upload
                    ?.originalName ||
                    upload
                      ?.fileName ||
                    '—'}
                </p>

                <p className="mt-1 text-xs text-stone-500">
                  {upload
                    ?.totalRows ??
                    '—'}{' '}
                  total ·{' '}
                  {upload
                    ?.validRows ??
                    '—'}{' '}
                  valid ·{' '}
                  {upload
                    ?.invalidRows ??
                    '—'}{' '}
                  rejected
                </p>

                <p className="mt-3 text-xs leading-5 text-amber-800">
                  Do not change this BankSync upload. Correct the authoritative source extract externally. A corrected version will be uploaded later as a new linked record.
                </p>
              </div>
            </div>
          </div>

          {/* CHECKER INSTRUCTION */}
          <div className="mt-5 rounded-xl border border-violet-200 bg-violet-50/30 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
              Checker Correction Instruction
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">
              {task.checkerInstruction ||
                '—'}
            </p>
          </div>

          {task.correctedUploadId && (
            <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-5">
              <div className="flex items-start gap-3">
                <FileCheck2
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                <div>
                  <p className="text-sm font-semibold text-stone-900">
                    Latest Corrected Upload
                  </p>

                  <p className="mt-1 text-sm text-stone-700">
                    {task.correctedUploadId
                      ?.originalName ||
                      task.correctedUploadId
                        ?.fileName ||
                      '—'}
                  </p>

                  <p className="mt-1 text-xs text-stone-500">
                    {formatLabel(
                      task.correctedUploadId
                        ?.status,
                    )}
                    {' · '}
                    {task.correctedUploadId
                      ?.validRows ??
                      '—'}{' '}
                    valid
                    {' · '}
                    {task.correctedUploadId
                      ?.invalidRows ??
                      '—'}{' '}
                    rejected
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* MAKER / CASE CONCLUSION */}
          <div className="mt-5 rounded-xl border border-stone-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Approved Investigation Context
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  Maker Root Cause
                </p>

                <p className="mt-1 text-sm font-semibold text-stone-900">
                  {formatLabel(
                    caseRecord
                      ?.rootCauseCategory,
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  Maker Proposed Action
                </p>

                <p className="mt-1 text-sm font-semibold text-stone-900">
                  {formatLabel(
                    caseRecord
                      ?.proposedAction,
                  )}
                </p>
              </div>
            </div>

            {caseRecord
              ?.proposedResolution && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  Maker Resolution Recommendation
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">
                  {
                    caseRecord
                      .proposedResolution
                  }
                </p>
              </div>
            )}

            {caseRecord
              ?.checkerComment && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  Checker Findings
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">
                  {
                    caseRecord
                      .checkerComment
                  }
                </p>
              </div>
            )}
          </div>

          {/* AFFECTED RECORDS */}
          <div className="mt-5">
            <div className="flex items-center gap-2">
              <ShieldCheck
                size={18}
                className="text-amber-600"
              />

              <h3 className="font-semibold text-stone-900">
                Affected Transaction Records
              </h3>
            </div>

            {affectedTransactions.length ===
            0 ? (
              <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-500">
                No affected transaction details were returned for this task.
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-xl border border-stone-200">
                <table className="min-w-[900px] w-full border-collapse text-left">
                  <thead className="bg-stone-50">
                    <tr className="border-b border-stone-200">
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                        Transaction ID
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                        Reference
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                        Account
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                        Amount
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                        Date
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {affectedTransactions.map(
                      (transaction) => (
                        <tr
                          key={
                            transaction._id
                          }
                          className="border-b border-stone-100 bg-amber-50/40 last:border-b-0"
                        >
                          <td className="px-4 py-3 text-sm font-semibold text-stone-900">
                            {
                              transaction.transactionId
                            }
                          </td>

                          <td className="px-4 py-3 text-sm text-stone-600">
                            {transaction.referenceNumber ||
                              '—'}
                          </td>

                          <td className="px-4 py-3 text-sm text-stone-600">
                            {transaction.accountNumber ||
                              '—'}
                          </td>

                          <td className="px-4 py-3 text-sm text-stone-700">
                            {formatAmount(
                              transaction.amount,
                            )}
                          </td>

                          <td className="px-4 py-3 text-sm text-stone-600">
                            {formatDate(
                              transaction.transactionDate,
                            )}
                          </td>

                          <td className="px-4 py-3 text-sm text-stone-700">
                            {transaction.status ||
                              '—'}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {[
            'VERIFICATION_FAILED',
            'IN_PROGRESS',
          ].includes(
            task.status,
          ) &&
            (
              task
                .latestVerificationFeedback
                ?.reason ||
              task
                .verificationFailureReason
            ) && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0 text-red-600"
                  />

                  <div>
                    <p className="text-sm font-semibold text-red-900">
                      Admin / Operations Correction Feedback
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-800">
                      {task
                        .latestVerificationFeedback
                        ?.reason ||
                        task
                          .verificationFailureReason}
                    </p>

                    {task
                      .latestVerificationFeedback
                      ?.rejectedBy && (
                      <p className="mt-3 text-xs text-red-600">
                        Returned by{' '}
                        <strong>
                          {task
                            .latestVerificationFeedback
                            .rejectedBy
                            .name ||
                            task
                              .latestVerificationFeedback
                              .rejectedBy
                              .email ||
                            'Admin / Operations'}
                        </strong>
                        {task
                          .latestVerificationFeedback
                          .rejectedAt
                          ? ` · ${formatDate(
                              task
                                .latestVerificationFeedback
                                .rejectedAt,
                            )}`
                          : ''}
                      </p>
                    )}

                    <p className="mt-2 text-xs leading-5 text-red-700">
                      Address this feedback in the next corrected source extract before resubmitting it for BankSync verification.
                    </p>
                  </div>
                </div>
              </div>
            )}

          {/* CORRECTED UPLOAD SUBMISSION */}
          {task.status ===
            'IN_PROGRESS' && (() => {
              const form =
                getUploadForm(
                  task._id,
                )

              return (
                <form
                  onSubmit={(event) =>
                    handleCorrectedUpload(
                      task,
                      event,
                    )
                  }
                  className="mt-5 rounded-xl border border-blue-200 bg-blue-50/40 p-5"
                >
                  <div className="flex items-start gap-3">
                    <UploadCloud
                      size={20}
                      className="mt-0.5 shrink-0 text-blue-600"
                    />

                    <div>
                      <p className="text-sm font-semibold text-blue-950">
                        Submit Corrected Source Extract
                      </p>

                      <p className="mt-1 text-xs leading-5 text-blue-800">
                        Correct the authoritative source extract outside BankSync, then submit it here as a new linked version. BankSync will validate the file and automatically re-check the original Data Quality defect.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <label className="mb-2 block text-sm font-medium text-stone-700">
                      Corrected CSV / XLSX
                    </label>

                    <input
                      ref={(element) => {
                        fileInputRefs.current[
                          task._id
                        ] = element
                      }}
                      type="file"
                      accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                      onChange={(event) => {
                        const selectedFile =
                          event.target
                            .files?.[0] ||
                          null

                        updateUploadForm(
                          task._id,
                          {
                            file:
                              selectedFile,
                          },
                        )

                        setError('')
                        setSuccess('')
                      }}
                      className="hidden"
                    />

                    {!form.file ? (
                      <button
                        type="button"
                        onClick={() =>
                          fileInputRefs
                            .current[
                              task._id
                            ]
                            ?.click()
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                      >
                        <UploadCloud
                          size={17}
                        />

                        Choose Corrected File
                      </button>
                    ) : (
                      <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-stone-800">
                            {
                              form.file.name
                            }
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            updateUploadForm(
                              task._id,
                              {
                                file:
                                  null,
                              },
                            )

                            const input =
                              fileInputRefs
                                .current[
                                  task._id
                                ]

                            if (input) {
                              input.value =
                                ''
                            }

                            setError('')
                            setSuccess('')
                          }}
                          aria-label="Remove selected file"
                          title="Remove selected file"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}

                    <p className="mt-2 text-xs text-stone-500">
                      Source system is locked to{' '}
                      <strong>
                        {upload
                          ?.sourceSystem ||
                          issue
                            ?.sourceSystem ||
                          'the original source'}
                      </strong>
                      . The original upload will not be changed.
                    </p>
                  </div>

                  <div className="mt-5">
                    <label className="mb-2 block text-sm font-medium text-stone-700">
                      What was corrected?
                    </label>

                    <textarea
                      rows={4}
                      maxLength={5000}
                      value={
                        form.importOfficerNote
                      }
                      onChange={(event) =>
                        updateUploadForm(
                          task._id,
                          {
                            importOfficerNote:
                              event.target
                                .value,
                          },
                        )
                      }
                      placeholder="Example: Corrected the second DQ2001 source record to its authoritative unique transaction ID. No other transaction values were changed."
                      className="w-full resize-y rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-800 outline-none focus:border-blue-300"
                    />
                  </div>

                  <div className="mt-5">
                    <p className="text-sm font-medium text-stone-700">
                      Column Mapping
                    </p>

                    <p className="mt-1 text-xs text-stone-500">
                      Defaults assume the standard BankSync column names. Change a value only if the corrected file uses a different header.
                    </p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        [
                          'transactionId',
                          'Transaction ID',
                        ],
                        [
                          'referenceNumber',
                          'Reference Number',
                        ],
                        [
                          'accountNumber',
                          'Account Number',
                        ],
                        [
                          'amount',
                          'Amount',
                        ],
                        [
                          'transactionDate',
                          'Transaction Date',
                        ],
                        [
                          'status',
                          'Status',
                        ],
                      ].map(
                        ([
                          key,
                          label,
                        ]) => (
                          <label
                            key={key}
                            className="block"
                          >
                            <span className="mb-1 block text-xs font-medium text-stone-500">
                              {label}
                            </span>

                            <input
                              type="text"
                              value={
                                form.mapping[
                                  key
                                ] ||
                                ''
                              }
                              onChange={(
                                event,
                              ) =>
                                updateUploadForm(
                                  task._id,
                                  (
                                    current,
                                  ) => ({
                                    ...current,
                                    mapping: {
                                      ...current.mapping,
                                      [key]:
                                        event
                                          .target
                                          .value,
                                    },
                                  }),
                                )
                              }
                              className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none focus:border-blue-300"
                            />
                          </label>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={
                        uploadingTaskId ===
                        task._id
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {uploadingTaskId ===
                      task._id ? (
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <UploadCloud
                          size={17}
                        />
                      )}

                      {uploadingTaskId ===
                      task._id
                        ? 'Uploading & Verifying...'
                        : 'Submit Corrected Upload'}
                    </button>

                    <p className="text-xs text-stone-500">
                      Submission triggers validation and automatic Data Quality verification.
                    </p>
                  </div>
                </form>
              )
            })()}

          {task.status ===
            'VERIFIED_RESOLVED' && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-sm font-semibold text-emerald-900">
                Correction verified resolved
              </p>

              <p className="mt-1 text-xs leading-5 text-emerald-800">
                BankSync re-scanned the corrected upload and confirmed that the original Data Quality defect is no longer present. The correction task is complete and can proceed to final Case resolution/closure by Operations or Admin.
              </p>
            </div>
          )}

        </article>
      )
    }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-amber-600">
            <ClipboardList
              size={20}
            />

            <p className="text-xs font-semibold uppercase tracking-wide">
              Import Officer
            </p>
          </div>

          <h1 className="mt-2 text-2xl font-semibold text-stone-900">
            Data Correction Tasks
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
            Review approved Data Quality investigations assigned to you, correct the authoritative source extract externally, and later submit a corrected version for BankSync verification.
          </p>
        </div>

        <button
          type="button"
          onClick={loadTasks}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={
              loading
                ? 'animate-spin'
                : ''
            }
          />

          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle
            size={17}
            className="mt-0.5 shrink-0 text-red-600"
          />

          <p className="text-sm text-red-700">
            {error}
          </p>
        </div>
      )}

      {success && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2
            size={17}
            className="mt-0.5 shrink-0 text-emerald-600"
          />

          <p className="text-sm text-emerald-700">
            {success}
          </p>
        </div>
      )}

      {loading ? (
        <div className="mt-8 flex min-h-64 items-center justify-center rounded-2xl border border-stone-200 bg-white">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <Loader2
              size={18}
              className="animate-spin"
            />

            Loading correction tasks...
          </div>
        </div>
      ) : (
        <>
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-stone-900">
                  Active Tasks
                </h2>

                <p className="mt-1 text-sm text-stone-500">
                  {activeTasks.length}{' '}
                  task
                  {activeTasks.length ===
                  1
                    ? ''
                    : 's'}{' '}
                  requiring attention.
                </p>
              </div>
            </div>

            {activeTasks.length ===
            0 ? (
              <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
                <CheckCircle2
                  size={28}
                  className="mx-auto text-emerald-500"
                />

                <p className="mt-3 font-semibold text-stone-900">
                  No active correction tasks
                </p>

                <p className="mt-1 text-sm text-stone-500">
                  New Checker-approved correction work will appear here.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-6">
                {activeTasks.map(
                  renderTask,
                )}
              </div>
            )}
          </section>

          {completedTasks.length >
            0 && (
            <section className="mt-10">
              <h2 className="font-semibold text-stone-900">
                Completed / Closed Tasks
              </h2>

              <div className="mt-4 space-y-6">
                {completedTasks.map(
                  renderTask,
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

export default ImportCorrectionTasksPage
