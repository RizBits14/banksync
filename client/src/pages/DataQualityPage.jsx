import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Database,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
  UserRound,
  X,
} from 'lucide-react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  apiRequest,
} from '../services/api'

const ISSUE_TYPES = [
  'ALL',
  'DUPLICATE_TRANSACTION_ID',
  'DUPLICATE_REFERENCE',
  'REVERSAL_WITHOUT_ORIGINAL',
  'REVERSAL_AMOUNT_MISMATCH',
]

const SEVERITIES = [
  'ALL',
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]

const STATUSES = [
  'ALL',
  'OPEN',
  'UNDER_REVIEW',
  'CORRECTION_REQUIRED',
  'PENDING_VERIFICATION',
  'VERIFICATION_FAILED',
  'VERIFIED_RESOLVED',

  /*
   * Old development records may still
   * contain this legacy state.
   */
  'RESOLVED',
]

const SCAN_ROLES = [
  'ADMIN',
  'IMPORT_OFFICER',
]

const SUMMARY_ROLES = [
  'ADMIN',
  'CHECKER',
  'AUDITOR',
  'OPERATIONS_MANAGER',
]

const INVESTIGATION_ROLES = [
  'ADMIN',
  'OPERATIONS_MANAGER',
]

const PRIORITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]

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
    return '—'
  }

  return date.toLocaleString()
}

function getUploadId(uploadValue) {
  if (!uploadValue) {
    return ''
  }

  if (
    typeof uploadValue ===
    'string'
  ) {
    return uploadValue
  }

  return (
    uploadValue._id ||
    uploadValue.id ||
    ''
  )
}

function getUploadName(uploadValue) {
  if (!uploadValue) {
    return 'Unknown upload'
  }

  if (
    typeof uploadValue ===
    'string'
  ) {
    return uploadValue
  }

  return (
    uploadValue.originalName ||
    uploadValue.fileName ||
    uploadValue._id ||
    'Unknown upload'
  )
}

function getTransactionId(
  transaction,
) {
  if (!transaction) {
    return ''
  }

  if (
    typeof transaction ===
    'string'
  ) {
    return transaction
  }

  return (
    transaction.transactionId ||
    transaction._id ||
    transaction.id ||
    ''
  )
}

function getCaseId(caseValue) {
  if (!caseValue) {
    return ''
  }

  if (
    typeof caseValue ===
    'string'
  ) {
    return caseValue
  }

  return (
    caseValue._id ||
    caseValue.id ||
    ''
  )
}

function severityClasses(
  severity,
) {
  switch (severity) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-800'

    case 'HIGH':
      return 'bg-orange-100 text-orange-800'

    case 'MEDIUM':
      return 'bg-amber-100 text-amber-800'

    case 'LOW':
      return 'bg-blue-100 text-blue-800'

    default:
      return 'bg-stone-100 text-stone-700'
  }
}

function statusClasses(status) {
  switch (status) {
    case 'OPEN':
      return 'bg-red-50 text-red-700'

    case 'UNDER_REVIEW':
      return 'bg-blue-50 text-blue-700'

    case 'CORRECTION_REQUIRED':
      return 'bg-amber-50 text-amber-800'

    case 'PENDING_VERIFICATION':
      return 'bg-violet-50 text-violet-700'

    case 'VERIFICATION_FAILED':
      return 'bg-red-100 text-red-800'

    case 'VERIFIED_RESOLVED':
      return 'bg-emerald-50 text-emerald-700'

    case 'RESOLVED':
      return 'bg-stone-100 text-stone-600'

    default:
      return 'bg-stone-100 text-stone-700'
  }
}

function priorityFromSeverity(
  severity,
) {
  if (
    PRIORITIES.includes(
      severity,
    )
  ) {
    return severity
  }

  return 'MEDIUM'
}

function DataQualityPage() {
  const navigate =
    useNavigate()

  const [
    currentUser,
    setCurrentUser,
  ] = useState(null)

  const [
    issues,
    setIssues,
  ] = useState([])

  const [
    uploads,
    setUploads,
  ] = useState([])

  const [
    makers,
    setMakers,
  ] = useState([])

  const [
    summary,
    setSummary,
  ] = useState({
    totalIssues: 0,
    openIssues: 0,
    byType: [],
    bySeverity: [],
  })

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const [
    issueType,
    setIssueType,
  ] = useState('ALL')

  const [
    severity,
    setSeverity,
  ] = useState('ALL')

  const [
    status,
    setStatus,
  ] = useState('ALL')

  const [
    uploadFilter,
    setUploadFilter,
  ] = useState('ALL')

  /*
   * ----------------------------------------
   * SCAN
   * ----------------------------------------
   */
  const [
    selectedUploadId,
    setSelectedUploadId,
  ] = useState('')

  const [
    scanning,
    setScanning,
  ] = useState(false)

  const [
    scanResult,
    setScanResult,
  ] = useState(null)

  const [
    scanMessage,
    setScanMessage,
  ] = useState('')

  const [
    scanError,
    setScanError,
  ] = useState('')

  /*
   * ----------------------------------------
   * ISSUE DETAILS
   * ----------------------------------------
   */
  const [
    selectedIssue,
    setSelectedIssue,
  ] = useState(null)

  /*
   * ----------------------------------------
   * CREATE INVESTIGATION
   * ----------------------------------------
   */
  const [
    investigationIssue,
    setInvestigationIssue,
  ] = useState(null)

  const [
    selectedMakerId,
    setSelectedMakerId,
  ] = useState('')

  const [
    selectedPriority,
    setSelectedPriority,
  ] = useState('HIGH')

  const [
    creatingInvestigation,
    setCreatingInvestigation,
  ] = useState(false)

  const [
    investigationError,
    setInvestigationError,
  ] = useState('')

  const [
    investigationMessage,
    setInvestigationMessage,
  ] = useState('')

  const canScan =
    SCAN_ROLES.includes(
      currentUser?.role,
    )

  const canViewSummary =
    SUMMARY_ROLES.includes(
      currentUser?.role,
    )

  const canCreateInvestigation =
    INVESTIGATION_ROLES.includes(
      currentUser?.role,
    )

  /*
   * ----------------------------------------
   * CURRENT USER
   * ----------------------------------------
   */
  const loadCurrentUser =
    useCallback(
      async () => {
        const response =
          await apiRequest(
            '/auth/me',
          )

        setCurrentUser(
          response.data,
        )

        return response.data
      },
      [],
    )

  /*
   * ----------------------------------------
   * ISSUES
   * ----------------------------------------
   */
  const loadIssues =
    useCallback(
      async () => {
        const params =
          new URLSearchParams()

        if (
          issueType !==
          'ALL'
        ) {
          params.set(
            'issueType',
            issueType,
          )
        }

        if (
          severity !==
          'ALL'
        ) {
          params.set(
            'severity',
            severity,
          )
        }

        if (
          status !==
          'ALL'
        ) {
          params.set(
            'status',
            status,
          )
        }

        if (
          uploadFilter !==
          'ALL'
        ) {
          params.set(
            'uploadId',
            uploadFilter,
          )
        }

        const query =
          params.toString()

        const response =
          await apiRequest(
            query
              ? `/data-quality/issues?${query}`
              : '/data-quality/issues',
          )

        const data =
          Array.isArray(
            response?.data,
          )
            ? response.data
            : []

        setIssues(data)

        return data
      },
      [
        issueType,
        severity,
        status,
        uploadFilter,
      ],
    )

  /*
   * ----------------------------------------
   * SUMMARY
   * ----------------------------------------
   */
  const loadSummary =
    useCallback(
      async () => {
        const response =
          await apiRequest(
            '/data-quality/summary',
          )

        setSummary({
          totalIssues:
            response?.data
              ?.totalIssues ||
            0,

          openIssues:
            response?.data
              ?.openIssues ||
            0,

          byType:
            Array.isArray(
              response?.data
                ?.byType,
            )
              ? response.data
                  .byType
              : [],

          bySeverity:
            Array.isArray(
              response?.data
                ?.bySeverity,
            )
              ? response.data
                  .bySeverity
              : [],
        })
      },
      [],
    )

  /*
   * ----------------------------------------
   * UPLOADS
   * ----------------------------------------
   */
  const loadUploads =
    useCallback(
      async () => {
        const response =
          await apiRequest(
            '/uploads',
          )

        setUploads(
          Array.isArray(
            response?.data,
          )
            ? response.data
            : [],
        )
      },
      [],
    )

  /*
   * ----------------------------------------
   * ACTIVE MAKERS
   * ----------------------------------------
   */
  const loadMakers =
    useCallback(
      async () => {
        const response =
          await apiRequest(
            '/users/makers',
          )

        setMakers(
          Array.isArray(
            response?.data,
          )
            ? response.data
            : [],
        )
      },
      [],
    )

  /*
   * ----------------------------------------
   * PAGE LOAD
   * ----------------------------------------
   */
  const loadPage =
    useCallback(
      async () => {
        try {
          setLoading(true)
          setError('')

          const user =
            await loadCurrentUser()

          const requests = [
            loadIssues(),
          ]

          if (
            SUMMARY_ROLES.includes(
              user?.role,
            )
          ) {
            requests.push(
              loadSummary(),
            )
          }

          if (
            SCAN_ROLES.includes(
              user?.role,
            )
          ) {
            requests.push(
              loadUploads(),
            )
          }

          if (
            INVESTIGATION_ROLES.includes(
              user?.role,
            )
          ) {
            requests.push(
              loadMakers(),
            )
          }

          await Promise.all(
            requests,
          )
        } catch (err) {
          setError(
            err.message ||
              'Unable to load data quality information.',
          )
        } finally {
          setLoading(false)
        }
      },
      [
        loadCurrentUser,
        loadIssues,
        loadSummary,
        loadUploads,
        loadMakers,
      ],
    )

  useEffect(() => {
    loadPage()
  }, [loadPage])

  /*
   * ----------------------------------------
   * ELIGIBLE UPLOADS
   * ----------------------------------------
   */
  const eligibleUploads =
    useMemo(
      () =>
        uploads.filter(
          (upload) =>
            upload.status ===
              'VALIDATED' ||
            upload.status ===
              'COMPLETED',
        ),
      [uploads],
    )

  /*
   * ----------------------------------------
   * SUMMARY CALCULATION
   * ----------------------------------------
   */
  const highCriticalSummary =
    useMemo(
      () =>
        summary.bySeverity
          .filter(
            (item) =>
              item._id ===
                'HIGH' ||
              item._id ===
                'CRITICAL',
          )
          .reduce(
            (
              total,
              item,
            ) =>
              total +
              Number(
                item.count ||
                  0,
              ),
            0,
          ),
      [summary.bySeverity],
    )

  /*
   * ----------------------------------------
   * IMPORT OFFICER LOCAL STATS
   * ----------------------------------------
   */
  const visibleStats =
    useMemo(() => {
      const unresolved =
        issues.filter(
          (issue) =>
            ![
              'VERIFIED_RESOLVED',
              'RESOLVED',
            ].includes(
              issue.status,
            ),
        ).length

      const highOrCritical =
        issues.filter(
          (issue) =>
            issue.severity ===
              'HIGH' ||
            issue.severity ===
              'CRITICAL',
        ).length

      const verified =
        issues.filter(
          (issue) =>
            issue.status ===
            'VERIFIED_RESOLVED',
        ).length

      return {
        visible:
          issues.length,

        unresolved,

        highOrCritical,

        verified,
      }
    }, [issues])

  /*
   * ----------------------------------------
   * RUN SCAN
   * ----------------------------------------
   */
  const handleScan =
    async () => {
      if (
        !selectedUploadId
      ) {
        setScanError(
          'Select an upload before running the scan.',
        )

        return
      }

      try {
        setScanning(true)

        setScanError('')
        setScanMessage('')
        setScanResult(null)

        const response =
          await apiRequest(
            `/data-quality/scan/${selectedUploadId}`,
            {
              method:
                'POST',
            },
          )

        setScanResult(
          response.data,
        )

        setScanMessage(
          response.message ||
            'Data quality scan completed successfully.',
        )

        await loadIssues()

        if (
          canViewSummary
        ) {
          await loadSummary()
        }
      } catch (err) {
        setScanError(
          err.message ||
            'Unable to run data quality scan.',
        )
      } finally {
        setScanning(false)
      }
    }

  /*
   * ----------------------------------------
   * OPEN INVESTIGATION FORM
   * ----------------------------------------
   */
  const openInvestigationModal =
    (issue) => {
      setInvestigationError('')
      setInvestigationMessage('')

      setSelectedMakerId('')

      setSelectedPriority(
        priorityFromSeverity(
          issue.severity,
        ),
      )

      setInvestigationIssue(
        issue,
      )
    }

  /*
   * ----------------------------------------
   * CREATE INVESTIGATION
   * ----------------------------------------
   */
  const handleCreateInvestigation =
    async () => {
      if (
        !investigationIssue?._id
      ) {
        return
      }

      if (
        !selectedMakerId
      ) {
        setInvestigationError(
          'Select a Maker for this investigation.',
        )

        return
      }

      try {
        setCreatingInvestigation(
          true,
        )

        setInvestigationError('')
        setInvestigationMessage('')

        const response =
          await apiRequest(
            `/data-quality/issues/${investigationIssue._id}/investigation`,
            {
              method:
                'POST',

              body:
                JSON.stringify({
                  makerId:
                    selectedMakerId,

                  priority:
                    selectedPriority,
                }),
            },
          )

        const createdCase =
          response.data

        setInvestigationMessage(
          response.message ||
            'Investigation created and assigned successfully.',
        )

        const refreshedIssues =
          await loadIssues()

        if (
          canViewSummary
        ) {
          await loadSummary()
        }

        const refreshedIssue =
          refreshedIssues.find(
            (issue) =>
              issue._id ===
              investigationIssue._id,
          )

        if (
          refreshedIssue
        ) {
          setSelectedIssue(
            refreshedIssue,
          )
        }

        setInvestigationIssue(
          null,
        )

        if (
          createdCase?._id
        ) {
          setInvestigationMessage(
            'Investigation created and assigned to the Maker successfully.',
          )
        }
      } catch (err) {
        setInvestigationError(
          err.message ||
            'Unable to create investigation.',
        )
      } finally {
        setCreatingInvestigation(
          false,
        )
      }
    }

  /*
   * ----------------------------------------
   * CLEAR FILTERS
   * ----------------------------------------
   */
  const clearFilters =
    () => {
      setIssueType('ALL')
      setSeverity('ALL')
      setStatus('ALL')
      setUploadFilter(
        'ALL',
      )
    }

  return (
    <>
      <div className="p-5 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">

          {/* HEADER */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <ShieldAlert
                    size={22}
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-amber-600">
                    Data Control
                  </p>

                  <h1 className="mt-1 text-2xl font-semibold text-stone-900">
                    Data Quality
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
                    Detect data
                    defects, investigate
                    their root causes,
                    coordinate source
                    correction, and
                    verify remediation.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  loadPage
                }
                disabled={
                  loading
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
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
          </section>

          {/* SUMMARY */}
          {canViewSummary && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  Total Issues
                </p>

                <p className="mt-2 text-2xl font-semibold text-stone-900">
                  {
                    summary.totalIssues
                  }
                </p>

                <p className="mt-1 text-xs text-stone-400">
                  Historical records
                  preserved
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  Unresolved
                </p>

                <p className="mt-2 text-2xl font-semibold text-red-700">
                  {
                    summary.openIssues
                  }
                </p>

                <p className="mt-1 text-xs text-stone-400">
                  Not yet verified
                  resolved
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  High / Critical
                </p>

                <p className="mt-2 text-2xl font-semibold text-orange-700">
                  {
                    highCriticalSummary
                  }
                </p>

                <p className="mt-1 text-xs text-stone-400">
                  Highest risk
                  issues
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  Issue Types
                </p>

                <p className="mt-2 text-2xl font-semibold text-blue-700">
                  {
                    summary.byType
                      .length
                  }
                </p>

                <p className="mt-1 text-xs text-stone-400">
                  Detected
                  categories
                </p>
              </div>
            </div>
          )}

          {/* IMPORT OFFICER STATS */}
          {!canViewSummary &&
            currentUser && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Visible Issues
                  </p>

                  <p className="mt-2 text-2xl font-semibold text-stone-900">
                    {
                      visibleStats.visible
                    }
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Unresolved
                  </p>

                  <p className="mt-2 text-2xl font-semibold text-red-700">
                    {
                      visibleStats.unresolved
                    }
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    High / Critical
                  </p>

                  <p className="mt-2 text-2xl font-semibold text-orange-700">
                    {
                      visibleStats.highOrCritical
                    }
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Verified
                  </p>

                  <p className="mt-2 text-2xl font-semibold text-emerald-700">
                    {
                      visibleStats.verified
                    }
                  </p>
                </div>
              </div>
            )}

          {/* SCAN PANEL */}
          {canScan && (
            <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                  <ScanSearch
                    size={19}
                  />
                </div>

                <div>
                  <h2 className="font-semibold text-stone-900">
                    Run Data Quality
                    Scan
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-stone-500">
                    Scan a validated
                    upload for duplicate
                    identifiers,
                    duplicate
                    references, and
                    reversal problems.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">

                <div className="relative">
                  <select
                    value={
                      selectedUploadId
                    }
                    onChange={(
                      event,
                    ) => {
                      setSelectedUploadId(
                        event.target
                          .value,
                      )

                      setScanError('')
                      setScanMessage('')
                      setScanResult(null)
                    }}
                    className="h-12 w-full appearance-none rounded-xl border border-stone-200 bg-white px-4 pr-10 text-sm text-stone-700 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10"
                  >
                    <option value="">
                      Select validated
                      upload
                    </option>

                    {eligibleUploads.map(
                      (upload) => (
                        <option
                          key={
                            upload._id
                          }
                          value={
                            upload._id
                          }
                        >
                          {
                            upload.originalName
                          }{' '}
                          —{' '}
                          {
                            upload.sourceSystem
                          }{' '}
                          —{' '}
                          {
                            upload.status
                          }
                        </option>
                      ),
                    )}
                  </select>

                  <ChevronDown
                    size={17}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={
                    handleScan
                  }
                  disabled={
                    scanning ||
                    !selectedUploadId
                  }
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-stone-900 px-6 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ScanSearch
                    size={17}
                  />

                  {scanning
                    ? 'Scanning...'
                    : 'Run Scan'}
                </button>
              </div>

              {scanError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {scanError}
                </div>
              )}

              {scanMessage && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {
                    scanMessage
                  }
                </div>
              )}

              {scanResult && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">

                  <div className="rounded-xl bg-stone-50 p-4">
                    <p className="text-xs text-stone-400">
                      Transactions
                      Scanned
                    </p>

                    <p className="mt-1 text-xl font-semibold text-stone-900">
                      {
                        scanResult.scannedTransactions
                      }
                    </p>
                  </div>

                  <div className="rounded-xl bg-stone-50 p-4">
                    <p className="text-xs text-stone-400">
                      Issues Detected
                    </p>

                    <p className="mt-1 text-xl font-semibold text-red-700">
                      {
                        scanResult.detectedIssues
                      }
                    </p>
                  </div>

                  <div className="rounded-xl bg-stone-50 p-4">
                    <p className="text-xs text-stone-400">
                      Duplicate IDs
                    </p>

                    <p className="mt-1 text-xl font-semibold text-stone-900">
                      {
                        scanResult.duplicateTransactionIds
                      }
                    </p>
                  </div>

                  <div className="rounded-xl bg-stone-50 p-4">
                    <p className="text-xs text-stone-400">
                      Duplicate
                      References
                    </p>

                    <p className="mt-1 text-xl font-semibold text-stone-900">
                      {
                        scanResult.duplicateReferences
                      }
                    </p>
                  </div>

                  <div className="rounded-xl bg-stone-50 p-4">
                    <p className="text-xs text-stone-400">
                      Reversal Problems
                    </p>

                    <p className="mt-1 text-xl font-semibold text-stone-900">
                      {(scanResult
                        .reversalWithoutOriginal ||
                        0) +
                        (scanResult
                          .reversalAmountMismatch ||
                          0)}
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* WORKFLOW SUCCESS */}
          {investigationMessage && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0"
              />

              <span>
                {
                  investigationMessage
                }
              </span>
            </div>
          )}

          {/* FILTERS */}
          <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div
              className={`grid gap-3 md:grid-cols-2 ${
                canScan
                  ? 'xl:grid-cols-[1fr_190px_210px_1fr_auto]'
                  : 'xl:grid-cols-[1fr_190px_210px_auto]'
              }`}
            >
              <select
                value={
                  issueType
                }
                onChange={(
                  event,
                ) =>
                  setIssueType(
                    event.target
                      .value,
                  )
                }
                className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 outline-none focus:border-amber-300"
              >
                {ISSUE_TYPES.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item ===
                      'ALL'
                        ? 'All issue types'
                        : formatLabel(
                            item,
                          )}
                    </option>
                  ),
                )}
              </select>

              <select
                value={
                  severity
                }
                onChange={(
                  event,
                ) =>
                  setSeverity(
                    event.target
                      .value,
                  )
                }
                className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 outline-none focus:border-amber-300"
              >
                {SEVERITIES.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item ===
                      'ALL'
                        ? 'All severities'
                        : formatLabel(
                            item,
                          )}
                    </option>
                  ),
                )}
              </select>

              <select
                value={status}
                onChange={(
                  event,
                ) =>
                  setStatus(
                    event.target
                      .value,
                  )
                }
                className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 outline-none focus:border-amber-300"
              >
                {STATUSES.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item ===
                      'ALL'
                        ? 'All workflow statuses'
                        : item ===
                            'RESOLVED'
                          ? 'Resolved (Legacy)'
                          : formatLabel(
                              item,
                            )}
                    </option>
                  ),
                )}
              </select>

              {canScan && (
                <select
                  value={
                    uploadFilter
                  }
                  onChange={(
                    event,
                  ) =>
                    setUploadFilter(
                      event.target
                        .value,
                    )
                  }
                  className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 outline-none focus:border-amber-300"
                >
                  <option value="ALL">
                    All uploads
                  </option>

                  {uploads.map(
                    (upload) => (
                      <option
                        key={
                          upload._id
                        }
                        value={
                          upload._id
                        }
                      >
                        {
                          upload.originalName
                        }
                      </option>
                    ),
                  )}
                </select>
              )}

              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="h-11 rounded-xl border border-stone-200 bg-white px-5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
              >
                Clear
              </button>
            </div>
          </section>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ISSUE LIST */}
          <section className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="font-semibold text-stone-900">
                  Detected Issues
                </h2>

                <p className="mt-1 text-xs text-stone-500">
                  {
                    issues.length
                  }{' '}
                  issue
                  {issues.length ===
                  1
                    ? ''
                    : 's'}{' '}
                  shown
                </p>
              </div>

              <Database
                size={19}
                className="text-stone-400"
              />
            </div>

            {loading ? (
              <div className="px-6 py-12 text-center text-sm text-stone-500">
                Loading data quality
                issues...
              </div>
            ) : issues.length ===
              0 ? (
              <div className="px-6 py-14 text-center">
                <CheckCircle2
                  size={32}
                  className="mx-auto text-emerald-500"
                />

                <p className="mt-3 text-sm font-semibold text-stone-800">
                  No data quality
                  issues found
                </p>

                <p className="mt-1 text-xs text-stone-400">
                  No stored issues
                  match the current
                  filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-stone-50">
                    <tr className="text-left text-xs font-medium uppercase tracking-wide text-stone-400">

                      <th className="px-5 py-3">
                        Issue
                      </th>

                      <th className="px-5 py-3">
                        Upload
                      </th>

                      <th className="px-5 py-3">
                        Source
                      </th>

                      <th className="px-5 py-3">
                        Severity
                      </th>

                      <th className="px-5 py-3">
                        Workflow
                      </th>

                      <th className="px-5 py-3">
                        Case
                      </th>

                      <th className="px-5 py-3">
                        Details
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-stone-100">
                    {issues.map(
                      (issue) => (
                        <tr
                          key={
                            issue._id
                          }
                          className="text-sm"
                        >
                          <td className="min-w-[250px] px-5 py-4">
                            <p className="font-medium text-stone-900">
                              {formatLabel(
                                issue.issueType,
                              )}
                            </p>

                            <p className="mt-1 max-w-sm text-xs leading-5 text-stone-500">
                              {
                                issue.description
                              }
                            </p>

                            {issue.keyValue && (
                              <p className="mt-1 font-mono text-[11px] text-stone-400">
                                Key:{' '}
                                {
                                  issue.keyValue
                                }
                              </p>
                            )}
                          </td>

                          <td className="min-w-[180px] px-5 py-4">
                            <p className="font-medium text-stone-800">
                              {getUploadName(
                                issue.uploadId,
                              )}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-stone-600">
                            {issue.sourceSystem ||
                              '—'}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${severityClasses(
                                issue.severity,
                              )}`}
                            >
                              {formatLabel(
                                issue.severity,
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(
                                issue.status,
                              )}`}
                            >
                              {issue.status ===
                              'RESOLVED'
                                ? 'Resolved (Legacy)'
                                : formatLabel(
                                    issue.status,
                                  )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            {getCaseId(
                              issue.caseId,
                            ) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/cases/${getCaseId(
                                      issue.caseId,
                                    )}`,
                                  )
                                }
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
                              >
                                <ClipboardCheck
                                  size={14}
                                />

                                Open Case
                              </button>
                            ) : (
                              <span className="text-xs text-stone-400">
                                Not created
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedIssue(
                                  issue,
                                )

                                setInvestigationMessage(
                                  '',
                                )
                              }}
                              className="h-9 rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ISSUE DETAILS */}
      {selectedIssue && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-2xl">

            <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <AlertTriangle
                    size={20}
                  />
                </div>

                <h2 className="mt-4 text-xl font-semibold text-stone-900">
                  Data Quality Issue
                </h2>

                <p className="mt-1 text-sm text-stone-500">
                  Review the detected
                  defect and its
                  investigation
                  workflow.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedIssue(
                    null,
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
              >
                <X
                  size={18}
                />
              </button>
            </div>

            <div className="space-y-5 p-6">

              <div className="grid gap-4 sm:grid-cols-2">

                <div className="rounded-xl bg-stone-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Issue Type
                  </p>

                  <p className="mt-2 text-sm font-semibold text-stone-900">
                    {formatLabel(
                      selectedIssue.issueType,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-stone-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Source
                  </p>

                  <p className="mt-2 text-sm font-semibold text-stone-900">
                    {selectedIssue.sourceSystem ||
                      '—'}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                <div className="rounded-xl border border-stone-200 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Severity
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${severityClasses(
                      selectedIssue.severity,
                    )}`}
                  >
                    {formatLabel(
                      selectedIssue.severity,
                    )}
                  </span>
                </div>

                <div className="rounded-xl border border-stone-200 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Workflow Status
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(
                      selectedIssue.status,
                    )}`}
                  >
                    {selectedIssue.status ===
                    'RESOLVED'
                      ? 'Resolved (Legacy)'
                      : formatLabel(
                          selectedIssue.status,
                        )}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-stone-200 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  Description
                </p>

                <p className="mt-2 text-sm leading-6 text-stone-700">
                  {
                    selectedIssue.description
                  }
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  Original Upload
                </p>

                <p className="mt-2 text-sm font-semibold text-stone-900">
                  {getUploadName(
                    selectedIssue.uploadId,
                  )}
                </p>

                <p className="mt-1 break-all text-xs text-stone-400">
                  ID:{' '}
                  {getUploadId(
                    selectedIssue.uploadId,
                  ) ||
                    '—'}
                </p>
              </div>

              {selectedIssue.keyValue && (
                <div className="rounded-xl border border-stone-200 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Detected Key
                  </p>

                  <p className="mt-2 break-all font-mono text-sm text-stone-800">
                    {
                      selectedIssue.keyValue
                    }
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-stone-200 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  Related
                  Transactions
                </p>

                <p className="mt-3 text-xs font-medium text-stone-500">
                  Primary
                </p>

                <p className="mt-1 break-all font-mono text-xs text-stone-700">
                  {getTransactionId(
                    selectedIssue.primaryTransactionId,
                  ) ||
                    'Not recorded'}
                </p>

                <p className="mt-4 text-xs font-medium text-stone-500">
                  Related
                </p>

                {Array.isArray(
                  selectedIssue.relatedTransactionIds,
                ) &&
                selectedIssue
                  .relatedTransactionIds
                  .length >
                  0 ? (
                  <div className="mt-2 space-y-1">
                    {selectedIssue.relatedTransactionIds.map(
                      (
                        transaction,
                        index,
                      ) => (
                        <p
                          key={
                            getTransactionId(
                              transaction,
                            ) ||
                            index
                          }
                          className="break-all font-mono text-xs text-stone-700"
                        >
                          {getTransactionId(
                            transaction,
                          ) ||
                            'Unknown transaction'}
                        </p>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-stone-500">
                    No related
                    transactions
                    recorded.
                  </p>
                )}
              </div>

              {/* OPEN ISSUE */}
              {selectedIssue.status ===
                'OPEN' &&
                !getCaseId(
                  selectedIssue.caseId,
                ) &&
                canCreateInvestigation && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900">
                      Investigation
                      required
                    </p>

                    <p className="mt-1 text-xs leading-5 text-amber-800">
                      Assign this issue
                      to a Maker for
                      root-cause
                      investigation.
                      Creating the
                      investigation will
                      move the issue to
                      Under Review.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        openInvestigationModal(
                          selectedIssue,
                        )
                      }
                      className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white transition hover:bg-stone-800"
                    >
                      <ClipboardCheck
                        size={16}
                      />

                      Create
                      Investigation
                    </button>
                  </div>
                )}

              {/* LINKED CASE */}
              {getCaseId(
                selectedIssue.caseId,
              ) && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-900">
                    Investigation Case
                    connected
                  </p>

                  <p className="mt-1 text-xs leading-5 text-blue-700">
                    This Data Quality
                    issue is now being
                    handled through the
                    Maker / Checker Case
                    workflow.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/cases/${getCaseId(
                          selectedIssue.caseId,
                        )}`,
                      )
                    }
                    className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white transition hover:bg-stone-800"
                  >
                    Open Investigation
                    Case

                    <ArrowRight
                      size={15}
                    />
                  </button>
                </div>
              )}

              {/* LEGACY */}
              {selectedIssue.status ===
                'RESOLVED' && (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-sm font-semibold text-stone-700">
                    Legacy resolution
                    record
                  </p>

                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    This record was
                    resolved under the
                    earlier development
                    workflow. New Data
                    Quality issues use
                    investigation and
                    automated
                    verification
                    instead.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE INVESTIGATION MODAL */}
      {investigationIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white shadow-2xl">

            <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">

              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <ClipboardCheck
                    size={20}
                  />
                </div>

                <h2 className="mt-4 text-xl font-semibold text-stone-900">
                  Create
                  Investigation
                </h2>

                <p className="mt-2 text-sm leading-6 text-stone-500">
                  Assign this Data
                  Quality issue to a
                  Maker for independent
                  investigation.
                </p>
              </div>

              <button
                type="button"
                disabled={
                  creatingInvestigation
                }
                onClick={() => {
                  setInvestigationIssue(
                    null,
                  )

                  setInvestigationError(
                    '',
                  )
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50"
              >
                <X
                  size={18}
                />
              </button>
            </div>

            <div className="p-6">

              {/* ISSUE SUMMARY */}
              <div className="rounded-xl bg-stone-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  Issue
                </p>

                <p className="mt-2 text-sm font-semibold text-stone-900">
                  {formatLabel(
                    investigationIssue.issueType,
                  )}
                </p>

                <p className="mt-1 text-xs leading-5 text-stone-500">
                  {
                    investigationIssue.description
                  }
                </p>
              </div>

              {/* MAKER */}
              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  Assign Maker
                </label>

                <div className="relative">
                  <UserRound
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                  />

                  <select
                    value={
                      selectedMakerId
                    }
                    disabled={
                      creatingInvestigation
                    }
                    onChange={(
                      event,
                    ) => {
                      setSelectedMakerId(
                        event.target
                          .value,
                      )

                      setInvestigationError(
                        '',
                      )
                    }}
                    className="h-12 w-full appearance-none rounded-xl border border-stone-200 bg-white pl-11 pr-10 text-sm text-stone-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10"
                  >
                    <option value="">
                      Select active
                      Maker
                    </option>

                    {makers.map(
                      (maker) => (
                        <option
                          key={
                            maker._id
                          }
                          value={
                            maker._id
                          }
                        >
                          {
                            maker.name
                          }{' '}
                          —{' '}
                          {
                            maker.email
                          }
                        </option>
                      ),
                    )}
                  </select>

                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                </div>
              </div>

              {/* PRIORITY */}
              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  Case Priority
                </label>

                <select
                  value={
                    selectedPriority
                  }
                  disabled={
                    creatingInvestigation
                  }
                  onChange={(
                    event,
                  ) =>
                    setSelectedPriority(
                      event.target
                        .value,
                    )
                  }
                  className="h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10"
                >
                  {PRIORITIES.map(
                    (priority) => (
                      <option
                        key={
                          priority
                        }
                        value={
                          priority
                        }
                      >
                        {formatLabel(
                          priority,
                        )}
                      </option>
                    ),
                  )}
                </select>

                <p className="mt-2 text-xs leading-5 text-stone-400">
                  The default follows
                  the detected issue
                  severity, but
                  Operations may adjust
                  it during triage.
                </p>
              </div>

              {investigationError && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {
                    investigationError
                  }
                </div>
              )}

              <div className="mt-6 flex gap-3 border-t border-stone-100 pt-5">

                <button
                  type="button"
                  disabled={
                    creatingInvestigation
                  }
                  onClick={() => {
                    setInvestigationIssue(
                      null,
                    )

                    setInvestigationError(
                      '',
                    )
                  }}
                  className="h-11 flex-1 rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    creatingInvestigation ||
                    !selectedMakerId
                  }
                  onClick={
                    handleCreateInvestigation
                  }
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ClipboardCheck
                    size={16}
                  />

                  {creatingInvestigation
                    ? 'Creating...'
                    : 'Create & Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default DataQualityPage