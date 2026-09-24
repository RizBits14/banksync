import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileSearch,
  LogOut,
  RefreshCw,
  ShieldAlert,
  Upload,
  Wrench,
} from 'lucide-react'

import {
  Link,
  useNavigate,
} from 'react-router-dom'

import {
  apiRequest,
} from '../services/api'

import Sidebar from '../components/Sidebar.jsx'

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

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  link,
}) {
  const content = (
    <div className="h-full rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-stone-300">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
            {title}
          </p>

          <p className="mt-2 text-2xl font-semibold text-stone-900">
            {value}
          </p>

          <p className="mt-1 text-xs leading-5 text-stone-500">
            {description}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Icon size={19} />
        </div>
      </div>
    </div>
  )

  if (!link) {
    return content
  }

  return (
    <Link
      to={link}
      className="block"
    >
      {content}
    </Link>
  )
}

function BreakdownList({
  title,
  data,
}) {
  const entries =
    Object.entries(
      data || {},
    )

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-stone-900">
        {title}
      </h3>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">
          No data available.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {entries.map(
            ([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-4 py-3"
              >
                <span className="text-sm text-stone-700">
                  {formatLabel(key)}
                </span>

                <span className="text-sm font-semibold text-stone-900">
                  {value}
                </span>
              </div>
            ),
          )}
        </div>
      )}
    </section>
  )
}

function DashboardPage() {
  const navigate =
    useNavigate()

  const [
    dashboardData,
    setDashboardData,
  ] = useState(null)

  const [
    loadingDashboard,
    setLoadingDashboard,
  ] = useState(true)

  const [
    refreshing,
    setRefreshing,
  ] = useState(false)

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const loadDashboard =
    useCallback(
      async (
        isRefresh = false,
      ) => {
        if (isRefresh) {
          setRefreshing(true)
        } else {
          setLoadingDashboard(true)
        }

        setError('')

        try {
          const response =
            await apiRequest(
              '/dashboard/summary',
            )

          setDashboardData(
            response.data,
          )
        } catch (err) {
          setError(
            err.message ||
              'Unable to load dashboard.',
          )
        } finally {
          setLoadingDashboard(false)
          setRefreshing(false)
        }
      },
      [],
    )

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const handleLogout =
    async () => {
      setLoggingOut(true)
      setError('')

      try {
        await apiRequest(
          '/auth/logout',
          {
            method:
              'POST',
          },
        )

        navigate(
          '/',
          {
            replace:
              true,
          },
        )
      } catch (err) {
        setError(
          err.message,
        )
      } finally {
        setLoggingOut(false)
      }
    }

  const overview =
    dashboardData?.overview ||
    {}

  const reconciliation =
    dashboardData
      ?.reconciliation ||
    {}

  const cases =
    dashboardData?.cases ||
    {}

  const dataQuality =
    dashboardData
      ?.dataQuality ||
    {}

  const corrections =
    dashboardData
      ?.corrections ||
    {}

  const attention =
    dashboardData
      ?.attention ||
    {}

  const recentReconciliations =
    dashboardData
      ?.recentReconciliations ||
    []

  const recentCases =
    cases.recent ||
    []

  const recentDataQuality =
    dataQuality.recent ||
    []

  if (loadingDashboard) {
    return (
      <div className="min-h-screen bg-stone-100 lg:flex">
        <Sidebar />

        <main className="flex min-h-screen min-w-0 flex-1 items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <RefreshCw
              size={18}
              className="animate-spin"
            />

            Loading operational dashboard...
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-100 lg:flex">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <header className="border-b border-stone-200 bg-white">
          <div className="flex min-h-20 items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-600">
                BankSync Operations
              </p>

              <h1 className="mt-1 text-xl font-semibold text-stone-900">
                Dashboard
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  loadDashboard(
                    true,
                  )
                }
                disabled={refreshing}
                className="flex h-10 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={
                    refreshing
                      ? 'animate-spin'
                      : ''
                  }
                />

                <span className="hidden sm:inline">
                  Refresh
                </span>
              </button>

              <button
                type="button"
                onClick={
                  handleLogout
                }
                disabled={
                  loggingOut
                }
                className="flex h-10 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut
                  size={17}
                />

                <span className="hidden sm:inline">
                  {loggingOut
                    ? 'Signing out...'
                    : 'Sign out'}
                </span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-5 sm:p-6 lg:p-8">
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">
                  Operational Control Center
                </p>

                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
                  Reconciliation workload and control status
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
                  Monitor the BankSync lifecycle from uploaded banking data through Data Quality control, reconciliation, exceptions, investigation, correction, verification, and closure.
                </p>

                <p className="mt-3 text-xs text-stone-400">
                  Updated{' '}
                  {formatDate(
                    dashboardData
                      ?.generatedAt,
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Attention Queue
                </p>

                <p className="mt-1 text-2xl font-semibold text-stone-900">
                  {attention.total ||
                    0}
                </p>

                <p className="mt-1 text-xs text-stone-600">
                  Operational items currently requiring follow-up
                </p>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Uploads"
              value={
                overview.totalUploads ||
                0
              }
              description={`${overview.activeUploads || 0} active · ${overview.archivedUploads || 0} archived`}
              icon={Upload}
            />

            <MetricCard
              title="Transactions"
              value={
                overview.totalTransactions ||
                0
              }
              description="Transaction records currently stored"
              icon={Database}
            />

            <MetricCard
              title="Reconciliations"
              value={
                overview.totalReconciliations ||
                0
              }
              description={`${overview.completedReconciliations || 0} completed · ${overview.failedReconciliations || 0} failed`}
              icon={FileSearch}
              link="/reconciliation"
            />

            <MetricCard
              title="Open Exceptions"
              value={
                overview.openExceptions ||
                0
              }
              description={`${overview.totalExceptions || 0} total exceptions`}
              icon={Activity}
              link="/exceptions"
            />

            <MetricCard
              title="Active Cases"
              value={
                overview.activeCases ||
                0
              }
              description={`${overview.totalCases || 0} total · ${overview.closedCases || 0} closed`}
              icon={ClipboardCheck}
              link="/cases"
            />

            <MetricCard
              title="Data Quality"
              value={
                overview.unresolvedDataQuality ||
                0
              }
              description={`${overview.totalDataQualityIssues || 0} total · ${overview.verifiedResolvedDataQuality || 0} verified resolved`}
              icon={ShieldAlert}
              link="/data-quality"
            />

            <MetricCard
              title="Corrections"
              value={
                overview.activeCorrections ||
                0
              }
              description={`${overview.verifiedCorrections || 0} verified · ${overview.verificationFailedCorrections || 0} failed verification`}
              icon={Wrench}
            />

            <MetricCard
              title="Exact Match Rate"
              value={`${overview.exactMatchRate || 0}%`}
              description="Exact matches across processed reconciliation results"
              icon={CheckCircle2}
            />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <ArrowRightLeft
                  size={20}
                  className="text-amber-600"
                />

                <div>
                  <p className="text-sm font-medium text-amber-600">
                    Reconciliation Outcomes
                  </p>

                  <h3 className="mt-1 font-semibold text-stone-900">
                    Transaction matching totals
                  </h3>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  [
                    'Processed',
                    reconciliation.totalProcessed ||
                      0,
                  ],
                  [
                    'Matched',
                    reconciliation.matched ||
                      0,
                  ],
                  [
                    'Probable',
                    reconciliation.probable ||
                      0,
                  ],
                  [
                    'Unmatched',
                    reconciliation.unmatched ||
                      0,
                  ],
                  [
                    'Mismatched',
                    reconciliation.mismatches ||
                      0,
                  ],
                ].map(
                  ([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl bg-stone-50 p-4"
                    >
                      <p className="text-xs uppercase tracking-wide text-stone-400">
                        {label}
                      </p>

                      <p className="mt-2 text-xl font-semibold text-stone-900">
                        {value}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <AlertTriangle
                  size={20}
                  className="text-amber-600"
                />

                <div>
                  <p className="text-sm font-medium text-amber-600">
                    Work Requiring Attention
                  </p>

                  <h3 className="mt-1 font-semibold text-stone-900">
                    Current operational queue
                  </h3>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {[
                  [
                    'Open exceptions',
                    attention.openExceptions ||
                      0,
                  ],
                  [
                    'Pending Checker approval',
                    attention.pendingCheckerApproval ||
                      0,
                  ],
                  [
                    'Returned to Maker',
                    attention.returnedToMaker ||
                      0,
                  ],
                  [
                    'Approved awaiting resolution',
                    attention.approvedAwaitingResolution ||
                      0,
                  ],
                  [
                    'Unresolved Data Quality',
                    attention.unresolvedDataQuality ||
                      0,
                  ],
                  [
                    'Active corrections',
                    attention.activeCorrections ||
                      0,
                  ],
                  [
                    'Correction verification failed',
                    attention.verificationFailedCorrections ||
                      0,
                  ],
                ].map(
                  ([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3"
                    >
                      <span className="text-sm text-stone-700">
                        {label}
                      </span>

                      <span className="text-sm font-semibold text-stone-900">
                        {value}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <BreakdownList
              title="Cases by Status"
              data={
                cases.byStatus
              }
            />

            <BreakdownList
              title="Cases by Origin"
              data={
                cases.byOrigin
              }
            />

            <BreakdownList
              title="Data Quality by Status"
              data={
                dataQuality.byStatus
              }
            />

            <BreakdownList
              title="Correction Tasks by Status"
              data={
                corrections.byStatus
              }
            />
          </section>

          <section className="mt-6 rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-6 py-5">
              <p className="text-sm font-medium text-amber-600">
                Recent Reconciliations
              </p>

              <h3 className="mt-1 text-lg font-semibold text-stone-900">
                Latest reconciliation runs
              </h3>
            </div>

            {recentReconciliations.length ===
            0 ? (
              <div className="px-6 py-10 text-center text-sm text-stone-500">
                No reconciliation runs found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Target
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Started By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Created
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-stone-100">
                    {recentReconciliations.map(
                      (run) => (
                        <tr
                          key={run._id}
                        >
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-stone-800">
                              {run.sourceUploadId
                                ?.originalName ||
                                '—'}
                            </p>

                            <p className="mt-1 text-xs text-stone-400">
                              {run.sourceUploadId
                                ?.sourceSystem ||
                                ''}
                            </p>
                          </td>

                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-stone-800">
                              {run.targetUploadId
                                ?.originalName ||
                                '—'}
                            </p>

                            <p className="mt-1 text-xs text-stone-400">
                              {run.targetUploadId
                                ?.sourceSystem ||
                                ''}
                            </p>
                          </td>

                          <td className="px-6 py-4 text-sm text-stone-700">
                            {formatLabel(
                              run.status,
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <p className="text-sm text-stone-700">
                              {run.startedBy
                                ?.name ||
                                '—'}
                            </p>

                            <p className="mt-1 text-xs text-stone-400">
                              {formatLabel(
                                run.startedBy
                                  ?.role,
                              )}
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-500">
                            {formatDate(
                              run.createdAt,
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="border-b border-stone-100 px-6 py-5">
                <p className="text-sm font-medium text-amber-600">
                  Recent Cases
                </p>

                <h3 className="mt-1 font-semibold text-stone-900">
                  Latest investigation cases
                </h3>
              </div>

              {recentCases.length ===
              0 ? (
                <div className="px-6 py-8 text-sm text-stone-500">
                  No cases found.
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {recentCases.map(
                    (caseRecord) => (
                      <Link
                        key={
                          caseRecord._id
                        }
                        to={`/cases/${caseRecord._id}`}
                        className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-stone-50"
                      >
                        <div>
                          <p className="text-sm font-medium text-stone-800">
                            {formatLabel(
                              caseRecord.originType ||
                                'RECONCILIATION_EXCEPTION',
                            )}
                          </p>

                          <p className="mt-1 text-xs text-stone-400">
                            {formatLabel(
                              caseRecord.priority,
                            )}
                            {' · '}
                            {caseRecord
                              .assignedTo
                              ?.name ||
                              'Unassigned'}
                          </p>
                        </div>

                        <span className="text-xs font-medium text-stone-600">
                          {formatLabel(
                            caseRecord.status,
                          )}
                        </span>
                      </Link>
                    ),
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="border-b border-stone-100 px-6 py-5">
                <p className="text-sm font-medium text-amber-600">
                  Recent Data Quality
                </p>

                <h3 className="mt-1 font-semibold text-stone-900">
                  Latest integrity findings
                </h3>
              </div>

              {recentDataQuality.length ===
              0 ? (
                <div className="px-6 py-8 text-sm text-stone-500">
                  No Data Quality findings found.
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {recentDataQuality.map(
                    (issue) => (
                      <div
                        key={
                          issue._id
                        }
                        className="flex items-center justify-between gap-4 px-6 py-4"
                      >
                        <div>
                          <p className="text-sm font-medium text-stone-800">
                            {formatLabel(
                              issue.issueType,
                            )}
                          </p>

                          <p className="mt-1 text-xs text-stone-400">
                            {issue.uploadId
                              ?.originalName ||
                              issue.sourceSystem ||
                              '—'}
                            {issue.keyValue
                              ? ` · ${issue.keyValue}`
                              : ''}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs font-medium text-stone-600">
                            {formatLabel(
                              issue.status,
                            )}
                          </p>

                          <p className="mt-1 text-xs text-stone-400">
                            {formatLabel(
                              issue.severity,
                            )}
                          </p>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default DashboardPage
