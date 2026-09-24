import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Activity,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  FileText,
  RefreshCw,
  ShieldCheck,
  Terminal,
  X,
} from 'lucide-react'

import { apiRequest } from '../services/api'

const EVENT_TYPES = [
  'ALL',
  'BUSINESS_EVENT',
  'HTTP_REQUEST',
]

const METHODS = [
  'ALL',
  'GET',
  'POST',
  'PATCH',
  'PUT',
  'DELETE',
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

function getActorName(log) {
  if (
    log.actorId &&
    typeof log.actorId ===
      'object'
  ) {
    return (
      log.actorId.name ||
      log.actorId.email ||
      'Unknown User'
    )
  }

  if (log.actorId) {
    return 'System User'
  }

  return 'System'
}

function eventTypeClasses(
  eventType,
) {
  if (
    eventType ===
    'BUSINESS_EVENT'
  ) {
    return 'bg-amber-50 text-amber-700'
  }

  return 'bg-blue-50 text-blue-700'
}

function statusClasses(
  success,
) {
  if (success === true) {
    return 'bg-emerald-50 text-emerald-700'
  }

  if (success === false) {
    return 'bg-red-50 text-red-700'
  }

  return 'bg-stone-100 text-stone-600'
}

function AuditLogsPage() {
  const [
    logs,
    setLogs,
  ] = useState([])

  const [
    pagination,
    setPagination,
  ] = useState({
    page: 1,
    limit: 25,
    total: 0,
    pages: 1,
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
    eventType,
    setEventType,
  ] = useState('ALL')

  const [
    method,
    setMethod,
  ] = useState('ALL')

  const [
    successFilter,
    setSuccessFilter,
  ] = useState('ALL')

  const [
    action,
    setAction,
  ] = useState('')

  const [
    selectedLog,
    setSelectedLog,
  ] = useState(null)

  const loadLogs =
    useCallback(
      async (
        page = 1,
      ) => {
        try {
          setLoading(true)
          setError('')

          const params =
            new URLSearchParams()

          params.set(
            'page',
            String(page),
          )

          params.set(
            'limit',
            '25',
          )

          if (
            eventType !==
            'ALL'
          ) {
            params.set(
              'eventType',
              eventType,
            )
          }

          if (
            method !==
            'ALL'
          ) {
            params.set(
              'method',
              method,
            )
          }

          if (
            successFilter ===
            'SUCCESS'
          ) {
            params.set(
              'success',
              'true',
            )
          }

          if (
            successFilter ===
            'FAILED'
          ) {
            params.set(
              'success',
              'false',
            )
          }

          if (
            action.trim()
          ) {
            params.set(
              'action',
              action
                .trim()
                .toUpperCase(),
            )
          }

          const response =
            await apiRequest(
              `/audit-logs?${params.toString()}`,
            )

          setLogs(
            Array.isArray(
              response?.data,
            )
              ? response.data
              : [],
          )

          setPagination({
            page:
              response
                ?.pagination
                ?.page || 1,

            limit:
              response
                ?.pagination
                ?.limit || 25,

            total:
              response
                ?.pagination
                ?.total || 0,

            pages:
              response
                ?.pagination
                ?.pages || 1,
          })
        } catch (err) {
          setError(
            err.message ||
              'Unable to load audit logs.',
          )
        } finally {
          setLoading(false)
        }
      },
      [
        eventType,
        method,
        successFilter,
        action,
      ],
    )

  useEffect(() => {
    loadLogs(1)
  }, [
    eventType,
    method,
    successFilter,
    loadLogs,
  ])

  const stats =
    useMemo(() => {
      const business =
        logs.filter(
          (log) =>
            log.eventType ===
            'BUSINESS_EVENT',
        ).length

      const http =
        logs.filter(
          (log) =>
            log.eventType ===
            'HTTP_REQUEST',
        ).length

      const successful =
        logs.filter(
          (log) =>
            log.success ===
            true,
        ).length

      const failed =
        logs.filter(
          (log) =>
            log.success ===
            false,
        ).length

      return {
        business,
        http,
        successful,
        failed,
      }
    }, [logs])

  const handleActionSearch =
    (event) => {
      event.preventDefault()

      loadLogs(1)
    }

  const clearFilters =
    () => {
      setEventType('ALL')
      setMethod('ALL')
      setSuccessFilter(
        'ALL',
      )
      setAction('')
    }

  return (
    <>
      <div className="p-5 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">

          {/* HEADER */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <ShieldCheck
                    size={22}
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-amber-600">
                    Administration
                  </p>

                  <h1 className="mt-1 text-2xl font-semibold text-stone-900">
                    Audit Logs
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    Review business
                    workflow events and
                    technical request
                    activity across
                    BankSync.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  loadLogs(
                    pagination.page,
                  )
                }
                disabled={loading}
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

          {/* STATS */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Business Events
              </p>

              <p className="mt-2 text-2xl font-semibold text-amber-700">
                {stats.business}
              </p>

              <p className="mt-1 text-xs text-stone-400">
                Current page
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                HTTP Requests
              </p>

              <p className="mt-2 text-2xl font-semibold text-blue-700">
                {stats.http}
              </p>

              <p className="mt-1 text-xs text-stone-400">
                Current page
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Successful
              </p>

              <p className="mt-2 text-2xl font-semibold text-emerald-700">
                {stats.successful}
              </p>

              <p className="mt-1 text-xs text-stone-400">
                Current page
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Failed
              </p>

              <p className="mt-2 text-2xl font-semibold text-red-700">
                {stats.failed}
              </p>

              <p className="mt-1 text-xs text-stone-400">
                Current page
              </p>
            </div>
          </div>

          {/* FILTERS */}
          <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <form
              onSubmit={
                handleActionSearch
              }
              className="grid gap-3 xl:grid-cols-[190px_150px_160px_1fr_auto_auto]"
            >
              <select
                value={eventType}
                onChange={(
                  event,
                ) =>
                  setEventType(
                    event.target
                      .value,
                  )
                }
                className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 outline-none focus:border-amber-300"
              >
                {EVENT_TYPES.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type ===
                      'ALL'
                        ? 'All event types'
                        : formatLabel(
                            type,
                          )}
                    </option>
                  ),
                )}
              </select>

              <select
                value={method}
                onChange={(
                  event,
                ) =>
                  setMethod(
                    event.target
                      .value,
                  )
                }
                className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 outline-none focus:border-amber-300"
              >
                {METHODS.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item ===
                      'ALL'
                        ? 'All methods'
                        : item}
                    </option>
                  ),
                )}
              </select>

              <select
                value={
                  successFilter
                }
                onChange={(
                  event,
                ) =>
                  setSuccessFilter(
                    event.target
                      .value,
                  )
                }
                className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 outline-none focus:border-amber-300"
              >
                <option value="ALL">
                  All results
                </option>

                <option value="SUCCESS">
                  Successful
                </option>

                <option value="FAILED">
                  Failed
                </option>
              </select>

              <input
                type="text"
                value={action}
                onChange={(
                  event,
                ) =>
                  setAction(
                    event.target
                      .value,
                  )
                }
                placeholder="Exact action, e.g. CASE_APPROVED"
                className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-amber-300"
              />

              <button
                type="submit"
                className="h-11 rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-stone-800"
              >
                Apply
              </button>

              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-600 hover:bg-stone-50"
              >
                Clear
              </button>
            </form>
          </section>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* TABLE */}
          <section className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="font-semibold text-stone-900">
                  Activity History
                </h2>

                <p className="mt-1 text-xs text-stone-500">
                  {
                    pagination.total
                  }{' '}
                  total audit records
                </p>
              </div>

              <Activity
                size={19}
                className="text-stone-400"
              />
            </div>

            {loading ? (
              <div className="px-6 py-12 text-center text-sm text-stone-500">
                Loading audit
                logs...
              </div>
            ) : logs.length ===
              0 ? (
              <div className="px-6 py-12 text-center">
                <FileText
                  size={28}
                  className="mx-auto text-stone-300"
                />

                <p className="mt-3 text-sm font-medium text-stone-700">
                  No audit records
                  found
                </p>

                <p className="mt-1 text-xs text-stone-400">
                  Try changing the
                  selected filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-stone-50">
                    <tr className="text-left text-xs font-medium uppercase tracking-wide text-stone-400">
                      <th className="px-5 py-3">
                        Time
                      </th>

                      <th className="px-5 py-3">
                        Actor
                      </th>

                      <th className="px-5 py-3">
                        Event
                      </th>

                      <th className="px-5 py-3">
                        Activity
                      </th>

                      <th className="px-5 py-3">
                        Result
                      </th>

                      <th className="px-5 py-3">
                        Details
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-stone-100">
                    {logs.map(
                      (log) => (
                        <tr
                          key={
                            log._id
                          }
                          className="text-sm"
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-xs text-stone-500">
                            {formatDate(
                              log.createdAt,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-medium text-stone-900">
                              {getActorName(
                                log,
                              )}
                            </p>

                            <p className="mt-1 text-xs text-stone-400">
                              {formatLabel(
                                log.actorRole,
                              )}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${eventTypeClasses(
                                log.eventType,
                              )}`}
                            >
                              {formatLabel(
                                log.eventType,
                              )}
                            </span>
                          </td>

                          <td className="min-w-[280px] px-5 py-4">
                            {log.eventType ===
                            'BUSINESS_EVENT' ? (
                              <>
                                <p className="font-medium text-stone-900">
                                  {formatLabel(
                                    log.action,
                                  )}
                                </p>

                                <p className="mt-1 text-xs leading-5 text-stone-500">
                                  {log.description ||
                                    'Business workflow event'}
                                </p>

                                {log.entityType && (
                                  <p className="mt-1 text-[11px] text-stone-400">
                                    {log.entityType}
                                    {log.entityId
                                      ? ` • ${log.entityId}`
                                      : ''}
                                  </p>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className="rounded-md bg-stone-100 px-2 py-1 font-mono text-[11px] font-semibold text-stone-700">
                                    {log.method ||
                                      '—'}
                                  </span>

                                  <span className="break-all font-mono text-xs text-stone-600">
                                    {log.path ||
                                      '—'}
                                  </span>
                                </div>

                                {log.statusCode && (
                                  <p className="mt-2 text-xs text-stone-400">
                                    HTTP{' '}
                                    {
                                      log.statusCode
                                    }
                                  </p>
                                )}
                              </>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(
                                log.success,
                              )}`}
                            >
                              {log.success ===
                              true ? (
                                <CircleCheck
                                  size={
                                    13
                                  }
                                />
                              ) : log.success ===
                                false ? (
                                <CircleX
                                  size={
                                    13
                                  }
                                />
                              ) : null}

                              {log.success ===
                              true
                                ? 'Success'
                                : log.success ===
                                    false
                                  ? 'Failed'
                                  : 'N/A'}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedLog(
                                  log,
                                )
                              }
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

            {/* PAGINATION */}
            <div className="flex flex-col gap-3 border-t border-stone-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-stone-500">
                Page{' '}
                {
                  pagination.page
                }{' '}
                of{' '}
                {Math.max(
                  pagination.pages,
                  1,
                )}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={
                    loading ||
                    pagination.page <=
                      1
                  }
                  onClick={() =>
                    loadLogs(
                      pagination.page -
                        1,
                    )
                  }
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft
                    size={15}
                  />

                  Previous
                </button>

                <button
                  type="button"
                  disabled={
                    loading ||
                    pagination.page >=
                      pagination.pages
                  }
                  onClick={() =>
                    loadLogs(
                      pagination.page +
                        1,
                    )
                  }
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next

                  <ChevronRight
                    size={15}
                  />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* DETAILS MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                  <Terminal
                    size={20}
                  />
                </div>

                <h2 className="mt-4 text-xl font-semibold text-stone-900">
                  Audit Record
                </h2>

                <p className="mt-1 text-sm text-stone-500">
                  Detailed recorded
                  activity for this
                  event.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedLog(
                    null,
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-stone-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Actor
                  </p>

                  <p className="mt-1 text-sm font-semibold text-stone-900">
                    {getActorName(
                      selectedLog,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-stone-500">
                    {formatLabel(
                      selectedLog.actorRole,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-stone-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Timestamp
                  </p>

                  <p className="mt-1 text-sm font-semibold text-stone-900">
                    {formatDate(
                      selectedLog.createdAt,
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-stone-200 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  Event
                </p>

                <p className="mt-2 text-sm font-semibold text-stone-900">
                  {formatLabel(
                    selectedLog.eventType,
                  )}
                </p>

                {selectedLog.action && (
                  <p className="mt-2 text-sm text-stone-700">
                    Action:{' '}
                    <strong>
                      {
                        selectedLog.action
                      }
                    </strong>
                  </p>
                )}

                {selectedLog.description && (
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    {
                      selectedLog.description
                    }
                  </p>
                )}
              </div>

              {(selectedLog.method ||
                selectedLog.path) && (
                <div className="rounded-xl border border-stone-200 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    HTTP Request
                  </p>

                  <p className="mt-2 font-mono text-sm text-stone-800">
                    {selectedLog.method ||
                      '—'}{' '}
                    {selectedLog.path ||
                      '—'}
                  </p>

                  <p className="mt-2 text-xs text-stone-500">
                    Status Code:{' '}
                    {selectedLog.statusCode ??
                      '—'}
                  </p>
                </div>
              )}

              {(selectedLog.entityType ||
                selectedLog.entityId) && (
                <div className="rounded-xl border border-stone-200 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Entity
                  </p>

                  <p className="mt-2 text-sm text-stone-700">
                    Type:{' '}
                    {selectedLog.entityType ||
                      '—'}
                  </p>

                  <p className="mt-1 break-all text-xs text-stone-500">
                    ID:{' '}
                    {selectedLog.entityId ||
                      '—'}
                  </p>
                </div>
              )}

              {selectedLog.metadata && (
                <div className="rounded-xl border border-stone-200 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Metadata
                  </p>

                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-stone-950 p-4 text-xs leading-6 text-stone-200">
                    {JSON.stringify(
                      selectedLog.metadata,
                      null,
                      2,
                    )}
                  </pre>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-stone-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    IP Address
                  </p>

                  <p className="mt-1 break-all text-sm text-stone-700">
                    {selectedLog.ip ||
                      '—'}
                  </p>
                </div>

                <div className="rounded-xl bg-stone-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Result
                  </p>

                  <p className="mt-1 text-sm font-semibold text-stone-700">
                    {selectedLog.success ===
                    true
                      ? 'Success'
                      : selectedLog.success ===
                          false
                        ? 'Failed'
                        : 'Not applicable'}
                  </p>
                </div>
              </div>

              {selectedLog.userAgent && (
                <div className="rounded-xl bg-stone-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    User Agent
                  </p>

                  <p className="mt-2 break-words text-xs leading-5 text-stone-600">
                    {
                      selectedLog.userAgent
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AuditLogsPage