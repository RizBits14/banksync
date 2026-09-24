import {
  Archive,
  CheckCircle2,
  Clock3,
  History,
  RotateCcw,
  Send,
  UserCheck,
  Wrench,
} from 'lucide-react'

import {
  useEffect,
  useState,
} from 'react'

import { apiRequest } from '../services/api'

const EVENT_CONFIG = {
  CASE_ASSIGNED: {
    label: 'Case Assigned',
    icon: UserCheck,
  },

  INVESTIGATION_STARTED: {
    label: 'Investigation Started',
    icon: Wrench,
  },

  INVESTIGATION_REOPENED: {
    label: 'Investigation Reopened',
    icon: RotateCcw,
  },

  INVESTIGATION_UPDATED: {
    label: 'Investigation Updated',
    icon: Wrench,
  },

  CASE_SUBMITTED: {
    label: 'Submitted to Checker',
    icon: Send,
  },

  CASE_RESUBMITTED: {
    label: 'Resubmitted to Checker',
    icon: Send,
  },

  CASE_RETURNED: {
    label: 'Returned to Maker',
    icon: RotateCcw,
  },

  CASE_APPROVED: {
    label: 'Case Approved',
    icon: CheckCircle2,
  },

  DATA_CORRECTION_REQUESTED: {
    label: 'Correction Assigned to Import Officer',
    icon: Send,
  },

  DATA_CORRECTION_STARTED: {
    label: 'Source-Data Correction Started',
    icon: Wrench,
  },

  DATA_CORRECTION_VERIFICATION_REJECTED: {
    label: 'Correction Verification Rejected',
    icon: RotateCcw,
  },

  CASE_RESOLVED: {
    label: 'Case Resolved',
    icon: CheckCircle2,
  },

  CASE_CLOSED: {
    label: 'Case Closed',
    icon: Archive,
  },
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString()
}

function formatRole(value) {
  if (!value) return ''

  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    )
}

function formatStatus(value) {
  if (!value) return ''

  return String(value)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    )
}

function CaseHistoryTimeline({
  caseId,
}) {
  const [history, setHistory] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    let active = true

    const loadHistory = async () => {
      if (!caseId) {
        setHistory([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')

        const response =
          await apiRequest(
            `/audit-logs/case/${caseId}`,
          )

        if (!active) return

        setHistory(
          Array.isArray(response?.data)
            ? response.data
            : [],
        )
      } catch (err) {
        if (!active) return

        setError(
          err.message ||
            'Unable to load case history.',
        )
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadHistory()

    return () => {
      active = false
    }
  }, [caseId])

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <History size={20} />
        </div>

        <div>
          <h2 className="font-semibold text-stone-900">
            Case History
          </h2>

          <p className="mt-1 text-sm leading-6 text-stone-500">
            Chronological record of the important
            actions performed on this case.
          </p>
        </div>
      </div>

      {loading && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-500">
          <Clock3
            size={16}
            className="shrink-0"
          />

          Loading case history...
        </div>
      )}

      {!loading && error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading &&
        !error &&
        history.length === 0 && (
          <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50 px-4 py-5 text-sm text-stone-500">
            No business history has been recorded
            for this case yet.
          </div>
        )}

      {!loading &&
        !error &&
        history.length > 0 && (
          <div className="mt-7">
            {history.map(
              (item, index) => {
                const config =
                  EVENT_CONFIG[
                    item.action
                  ] || {
                    label:
                      formatStatus(
                        item.action,
                      ),
                    icon: Clock3,
                  }

                const Icon =
                  config.icon

                const actor =
                  item.actorId

                const isLast =
                  index ===
                  history.length - 1

                const metadata =
                  item.metadata || {}

                return (
                  <div
                    key={item._id}
                    className="relative flex gap-4"
                  >
                    {!isLast && (
                      <div className="absolute left-[17px] top-9 h-[calc(100%-12px)] w-px bg-stone-200" />
                    )}

                    <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600">
                      <Icon size={16} />
                    </div>

                    <div
                      className={`min-w-0 flex-1 ${
                        isLast
                          ? ''
                          : 'pb-7'
                      }`}
                    >
                      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-stone-900">
                              {config.label}
                            </p>

                            {item.description && (
                              <p className="mt-1 text-sm leading-6 text-stone-600">
                                {
                                  item.description
                                }
                              </p>
                            )}
                          </div>

                          <span className="shrink-0 text-xs text-stone-400">
                            {formatDate(
                              item.createdAt,
                            )}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                          <span>
                            By:{' '}
                            <strong className="font-medium text-stone-700">
                              {actor?.name ||
                                'System'}
                            </strong>
                          </span>

                          {actor?.role && (
                            <span>
                              Role:{' '}
                              <strong className="font-medium text-stone-700">
                                {formatRole(
                                  actor.role,
                                )}
                              </strong>
                            </span>
                          )}
                        </div>

                        {(metadata.previousStatus ||
                          metadata.newStatus) && (
                          <div className="mt-3 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600">
                            {metadata.previousStatus && (
                              <span>
                                {formatStatus(
                                  metadata.previousStatus,
                                )}
                              </span>
                            )}

                            {metadata.previousStatus &&
                              metadata.newStatus && (
                                <span className="mx-2">
                                  →
                                </span>
                              )}

                            {metadata.newStatus && (
                              <span className="font-medium text-stone-800">
                                {formatStatus(
                                  metadata.newStatus,
                                )}
                              </span>
                            )}
                          </div>
                        )}

                        {metadata.returnReason && (
                          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            Return Reason:{' '}
                            <strong>
                              {formatStatus(
                                metadata.returnReason,
                              )}
                            </strong>
                          </div>
                        )}

                        {Array.isArray(
                          metadata.updatedSections,
                        ) &&
                          metadata.updatedSections
                            .length > 0 && (
                            <div className="mt-3 text-xs text-stone-500">
                              Updated:{' '}
                              {metadata.updatedSections
                                .map(
                                  (
                                    section,
                                  ) =>
                                    formatStatus(
                                      section,
                                    ),
                                )
                                .join(', ')}
                            </div>
                          )}

                        {metadata.resolutionExecutionNote && (
                          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs leading-5 text-emerald-800">
                            <strong>
                              Resolution Execution:
                            </strong>{' '}
                            {
                              metadata.resolutionExecutionNote
                            }
                          </div>
                        )}

                        {metadata.closureNote && (
                          <div className="mt-3 rounded-lg border border-stone-200 bg-white px-3 py-3 text-xs leading-5 text-stone-700">
                            <strong>
                              Closure Note:
                            </strong>{' '}
                            {
                              metadata.closureNote
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              },
            )}
          </div>
        )}
    </section>
  )
}

export default CaseHistoryTimeline