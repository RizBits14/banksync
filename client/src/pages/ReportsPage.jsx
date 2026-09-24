import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  CheckCircle2,
  ClipboardCheck,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Upload,
} from 'lucide-react'

import {
  apiDownload,
  apiRequest,
} from '../services/api'

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

function NumberCard({
  title,
  value,
  subtitle,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
            {title}
          </p>

          <p className="mt-2 text-2xl font-semibold text-stone-900">
            {value ?? 0}
          </p>

          {subtitle && (
            <p className="mt-1 text-xs leading-5 text-stone-500">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Icon size={19} />
        </div>
      </div>
    </div>
  )
}

function BreakdownList({
  title,
  data,
  emptyText = 'No data',
}) {
  const entries =
    Object.entries(
      data || {},
    )

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-stone-900">
        {title}
      </h3>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">
          {emptyText}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
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
    </div>
  )
}

function ExportButton({
  onClick,
  label,
  icon: Icon,
  disabled = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon size={16} />
      {label}
    </button>
  )
}

function ReportsPage() {
  const [summary, setSummary] =
    useState(null)

  const [
    reconciliations,
    setReconciliations,
  ] = useState([])

  const [
    selectedReconciliationId,
    setSelectedReconciliationId,
  ] = useState('')

  const [loading, setLoading] =
    useState(true)

  const [
    downloadingKey,
    setDownloadingKey,
  ] = useState('')

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const loadReports =
    useCallback(async () => {
      setLoading(true)
      setError('')

      try {
        const [
          summaryResponse,
          reconciliationsResponse,
        ] =
          await Promise.all([
            apiRequest(
              '/reports/summary',
            ),

            apiRequest(
              '/reconciliations',
            ),
          ])

        setSummary(
          summaryResponse.data ||
            null,
        )

        const runs =
          reconciliationsResponse.data ||
          []

        setReconciliations(runs)

        if (
          !selectedReconciliationId &&
          runs.length > 0
        ) {
          const latestCompleted =
            runs.find(
              (item) =>
                item.status ===
                'COMPLETED',
            )

          if (latestCompleted) {
            setSelectedReconciliationId(
              latestCompleted._id,
            )
          }
        }
      } catch (err) {
        setError(
          err.message ||
            'Unable to load reports.',
        )
      } finally {
        setLoading(false)
      }
    }, [
      selectedReconciliationId,
    ])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const completedReconciliations =
    useMemo(
      () =>
        reconciliations.filter(
          (item) =>
            item.status ===
            'COMPLETED',
        ),
      [reconciliations],
    )

  const runDownload =
    async (
      key,
      endpoint,
    ) => {
      setDownloadingKey(key)
      setError('')
      setSuccess('')

      try {
        await apiDownload(endpoint)

        setSuccess(
          'Report download started.',
        )
      } catch (err) {
        setError(
          err.message ||
            'Unable to download report.',
        )
      } finally {
        setDownloadingKey('')
      }
    }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2
            size={18}
            className="animate-spin"
          />

          Loading reports...
        </div>
      </div>
    )
  }

  const uploads =
    summary?.uploads || {}

  const reconciliationsSummary =
    summary?.reconciliations || {}

  const transactionOutcomes =
    reconciliationsSummary
      .transactionOutcomes || {}

  const exceptions =
    summary?.exceptions || {}

  const cases =
    summary?.cases || {}

  const dataQuality =
    summary?.dataQuality || {}

  const corrections =
    summary?.corrections || {}

  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <FileBarChart
                  size={22}
                />
              </div>

              <div>
                <p className="text-sm font-medium text-amber-600">
                  Operational Reporting
                </p>

                <h1 className="mt-1 text-2xl font-semibold text-stone-900">
                  Reports
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
                  Review the BankSync control lifecycle across uploads, reconciliation, exceptions, cases, Data Quality, corrections, verification, and closure.
                </p>

                <p className="mt-2 text-xs text-stone-400">
                  Generated{' '}
                  {formatDate(
                    summary?.generatedAt,
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadReports}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              <RefreshCw
                size={16}
              />

              Refresh
            </button>
          </div>
        </section>

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

        {/* TOP SUMMARY */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberCard
            title="Uploads"
            value={uploads.total || 0}
            subtitle={`${uploads.active || 0} active · ${uploads.archived || 0} archived`}
            icon={Upload}
          />

          <NumberCard
            title="Reconciliation Runs"
            value={
              reconciliationsSummary.total ||
              0
            }
            subtitle={`${reconciliationsSummary.byStatus?.COMPLETED || 0} completed`}
            icon={RefreshCw}
          />

          <NumberCard
            title="Exceptions"
            value={exceptions.total || 0}
            subtitle={`${exceptions.byStatus?.OPEN || 0} open`}
            icon={Activity}
          />

          <NumberCard
            title="Cases"
            value={cases.total || 0}
            subtitle={`${cases.active || 0} active · ${cases.closed || 0} closed`}
            icon={ClipboardCheck}
          />

          <NumberCard
            title="Data Quality Issues"
            value={dataQuality.total || 0}
            subtitle={`${dataQuality.unresolved || 0} unresolved · ${dataQuality.verifiedResolved || 0} verified resolved`}
            icon={ShieldAlert}
          />

          <NumberCard
            title="Correction Tasks"
            value={corrections.total || 0}
            subtitle={`${corrections.active || 0} active · ${corrections.verifiedResolved || 0} verified resolved`}
            icon={FileSpreadsheet}
          />
        </section>

        {/* RECON OUTCOMES */}
        <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-medium text-amber-600">
              Reconciliation Outcomes
            </p>

            <h2 className="mt-1 text-lg font-semibold text-stone-900">
              Transaction matching totals
            </h2>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              [
                'Total',
                transactionOutcomes.total ||
                  0,
              ],
              [
                'Matched',
                transactionOutcomes.matched ||
                  0,
              ],
              [
                'Probable',
                transactionOutcomes.probable ||
                  0,
              ],
              [
                'Unmatched',
                transactionOutcomes.unmatched ||
                  0,
              ],
              [
                'Mismatched',
                transactionOutcomes.mismatched ||
                  0,
              ],
            ].map(
              ([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl bg-stone-50 p-4"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    {label}
                  </p>

                  <p className="mt-2 text-xl font-semibold text-stone-900">
                    {value}
                  </p>
                </div>
              ),
            )}
          </div>
        </section>

        {/* BREAKDOWNS */}
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <BreakdownList
            title="Cases by Status"
            data={cases.byStatus}
          />

          <BreakdownList
            title="Cases by Origin"
            data={cases.byOrigin}
          />

          <BreakdownList
            title="Data Quality by Status"
            data={dataQuality.byStatus}
          />

          <BreakdownList
            title="Data Quality by Issue Type"
            data={dataQuality.byType}
          />

          <BreakdownList
            title="Correction Tasks by Status"
            data={corrections.byStatus}
          />

          <BreakdownList
            title="Uploads by Source System"
            data={uploads.bySourceSystem}
          />
        </section>

        {/* EXPORT CENTER */}
        <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <p className="text-sm font-medium text-amber-600">
              Export Center
            </p>

            <h2 className="mt-1 text-xl font-semibold text-stone-900">
              Download operational reports
            </h2>

            <p className="mt-2 text-sm text-stone-500">
              Export CSV for lightweight review or XLSX for spreadsheet analysis.
            </p>
          </div>

          <div className="mt-6 space-y-5">
            {/* CASES */}
            <div className="flex flex-col gap-4 rounded-xl border border-stone-200 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-semibold text-stone-900">
                  Cases
                </p>

                <p className="mt-1 text-xs text-stone-500">
                  Reconciliation and Data Quality cases, Maker/Checker findings, resolution execution, and closure evidence.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <ExportButton
                  label={
                    downloadingKey ===
                    'cases-csv'
                      ? 'Downloading...'
                      : 'CSV'
                  }
                  icon={FileText}
                  disabled={
                    Boolean(
                      downloadingKey,
                    )
                  }
                  onClick={() =>
                    runDownload(
                      'cases-csv',
                      '/reports/cases?format=csv',
                    )
                  }
                />

                <ExportButton
                  label={
                    downloadingKey ===
                    'cases-xlsx'
                      ? 'Downloading...'
                      : 'XLSX'
                  }
                  icon={FileSpreadsheet}
                  disabled={
                    Boolean(
                      downloadingKey,
                    )
                  }
                  onClick={() =>
                    runDownload(
                      'cases-xlsx',
                      '/reports/cases?format=xlsx',
                    )
                  }
                />
              </div>
            </div>

            {/* EXCEPTIONS */}
            <div className="flex flex-col gap-4 rounded-xl border border-stone-200 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-semibold text-stone-900">
                  Exceptions
                </p>

                <p className="mt-1 text-xs text-stone-500">
                  Reconciliation exceptions, scores, reasons, transaction context, and status.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <ExportButton
                  label={
                    downloadingKey ===
                    'exceptions-csv'
                      ? 'Downloading...'
                      : 'CSV'
                  }
                  icon={FileText}
                  disabled={
                    Boolean(
                      downloadingKey,
                    )
                  }
                  onClick={() =>
                    runDownload(
                      'exceptions-csv',
                      '/reports/exceptions?format=csv',
                    )
                  }
                />

                <ExportButton
                  label={
                    downloadingKey ===
                    'exceptions-xlsx'
                      ? 'Downloading...'
                      : 'XLSX'
                  }
                  icon={FileSpreadsheet}
                  disabled={
                    Boolean(
                      downloadingKey,
                    )
                  }
                  onClick={() =>
                    runDownload(
                      'exceptions-xlsx',
                      '/reports/exceptions?format=xlsx',
                    )
                  }
                />
              </div>
            </div>

            {/* DQ */}
            <div className="flex flex-col gap-4 rounded-xl border border-stone-200 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-semibold text-stone-900">
                  Data Quality
                </p>

                <p className="mt-1 text-xs text-stone-500">
                  Detected integrity issues, status, original upload, linked Case, and verification outcome.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <ExportButton
                  label={
                    downloadingKey ===
                    'dq-csv'
                      ? 'Downloading...'
                      : 'CSV'
                  }
                  icon={FileText}
                  disabled={
                    Boolean(
                      downloadingKey,
                    )
                  }
                  onClick={() =>
                    runDownload(
                      'dq-csv',
                      '/reports/data-quality?format=csv',
                    )
                  }
                />

                <ExportButton
                  label={
                    downloadingKey ===
                    'dq-xlsx'
                      ? 'Downloading...'
                      : 'XLSX'
                  }
                  icon={FileSpreadsheet}
                  disabled={
                    Boolean(
                      downloadingKey,
                    )
                  }
                  onClick={() =>
                    runDownload(
                      'dq-xlsx',
                      '/reports/data-quality?format=xlsx',
                    )
                  }
                />
              </div>
            </div>

            {/* CORRECTIONS */}
            <div className="flex flex-col gap-4 rounded-xl border border-stone-200 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-semibold text-stone-900">
                  Data Corrections
                </p>

                <p className="mt-1 text-xs text-stone-500">
                  Checker handoff, Import Officer assignment, correction uploads, verification failures, and verified resolution.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <ExportButton
                  label={
                    downloadingKey ===
                    'corrections-csv'
                      ? 'Downloading...'
                      : 'CSV'
                  }
                  icon={FileText}
                  disabled={
                    Boolean(
                      downloadingKey,
                    )
                  }
                  onClick={() =>
                    runDownload(
                      'corrections-csv',
                      '/reports/data-corrections?format=csv',
                    )
                  }
                />

                <ExportButton
                  label={
                    downloadingKey ===
                    'corrections-xlsx'
                      ? 'Downloading...'
                      : 'XLSX'
                  }
                  icon={FileSpreadsheet}
                  disabled={
                    Boolean(
                      downloadingKey,
                    )
                  }
                  onClick={() =>
                    runDownload(
                      'corrections-xlsx',
                      '/reports/data-corrections?format=xlsx',
                    )
                  }
                />
              </div>
            </div>

            {/* RECONCILIATION */}
            <div className="rounded-xl border border-stone-200 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-stone-900">
                    Reconciliation Results
                  </p>

                  <p className="mt-1 text-xs text-stone-500">
                    Select a completed run to export row-level reconciliation results.
                  </p>

                  <select
                    value={
                      selectedReconciliationId
                    }
                    onChange={(event) =>
                      setSelectedReconciliationId(
                        event.target.value,
                      )
                    }
                    className="mt-3 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none focus:border-amber-300 lg:max-w-2xl"
                  >
                    <option value="">
                      Select completed reconciliation
                    </option>

                    {completedReconciliations.map(
                      (run) => (
                        <option
                          key={run._id}
                          value={run._id}
                        >
                          {run.sourceUploadId
                            ?.originalName ||
                            'Source'}
                          {' → '}
                          {run.targetUploadId
                            ?.originalName ||
                            'Target'}
                          {' · '}
                          {formatDate(
                            run.createdAt,
                          )}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="flex flex-wrap gap-2">
                  <ExportButton
                    label={
                      downloadingKey ===
                      'recon-csv'
                        ? 'Downloading...'
                        : 'CSV'
                    }
                    icon={ArrowDownToLine}
                    disabled={
                      Boolean(
                        downloadingKey,
                      ) ||
                      !selectedReconciliationId
                    }
                    onClick={() =>
                      runDownload(
                        'recon-csv',
                        `/reports/reconciliations/${selectedReconciliationId}?format=csv`,
                      )
                    }
                  />

                  <ExportButton
                    label={
                      downloadingKey ===
                      'recon-xlsx'
                        ? 'Downloading...'
                        : 'XLSX'
                    }
                    icon={FileSpreadsheet}
                    disabled={
                      Boolean(
                        downloadingKey,
                      ) ||
                      !selectedReconciliationId
                    }
                    onClick={() =>
                      runDownload(
                        'recon-xlsx',
                        `/reports/reconciliations/${selectedReconciliationId}?format=xlsx`,
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ReportsPage
