import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Eye,
  ShieldAlert,
} from 'lucide-react'

import { Link } from 'react-router-dom'
import { apiRequest } from '../services/api'

function formatLabel(value) {
  if (!value) return '—'

  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    )
}

function formatDate(dateString) {
  if (!dateString) return '—'

  return new Date(dateString).toLocaleString()
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

function getPriorityClasses(priority) {
  if (priority === 'CRITICAL') {
    return 'bg-red-100 text-red-700'
  }

  if (priority === 'HIGH') {
    return 'bg-orange-50 text-orange-700'
  }

  if (priority === 'MEDIUM') {
    return 'bg-amber-50 text-amber-700'
  }

  return 'bg-stone-100 text-stone-600'
}

function getStatusClasses(status) {
  if (
    status === 'APPROVED' ||
    status === 'RESOLVED' ||
    status === 'CLOSED'
  ) {
    return 'bg-emerald-50 text-emerald-700'
  }

  if (
    status === 'PENDING_CHECKER_APPROVAL'
  ) {
    return 'bg-violet-50 text-violet-700'
  }

  if (
    status === 'UNDER_INVESTIGATION' ||
    status === 'ASSIGNED'
  ) {
    return 'bg-amber-50 text-amber-700'
  }

  if (
    status === 'RETURNED_TO_MAKER'
  ) {
    return 'bg-red-50 text-red-700'
  }

  return 'bg-stone-100 text-stone-700'
}

function CasesPage() {
  const [cases, setCases] = useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    const loadCases = async () => {
      setLoading(true)
      setError('')

      try {
        const response =
          await apiRequest('/cases')

        setCases(response.data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadCases()
  }, [])

  const summary = useMemo(() => {
    return {
      total: cases.length,

      open: cases.filter(
        (item) =>
          item.status === 'OPEN',
      ).length,

      investigation: cases.filter(
        (item) =>
          item.status ===
          'UNDER_INVESTIGATION',
      ).length,

      pendingChecker: cases.filter(
        (item) =>
          item.status ===
          'PENDING_CHECKER_APPROVAL',
      ).length,
    }
  }, [cases])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-medium text-stone-500">
          Loading cases...
        </p>
      </div>
    )
  }

  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <BriefcaseBusiness size={22} />
            </div>

            <div>
              <p className="text-sm font-medium text-amber-600">
                Investigation Workflow
              </p>

              <h1 className="mt-1 text-2xl font-semibold text-stone-900">
                Cases
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
                Track reconciliation exceptions through assignment,
                investigation, Maker submission, and Checker review.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <BriefcaseBusiness
              size={20}
              className="text-stone-500"
            />

            <p className="mt-4 text-sm text-stone-500">
              Total Cases
            </p>

            <p className="mt-1 text-2xl font-semibold text-stone-900">
              {summary.total}
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <ShieldAlert
              size={20}
              className="text-red-500"
            />

            <p className="mt-4 text-sm text-stone-500">
              Open
            </p>

            <p className="mt-1 text-2xl font-semibold text-stone-900">
              {summary.open}
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <Clock3
              size={20}
              className="text-amber-500"
            />

            <p className="mt-4 text-sm text-stone-500">
              Under Investigation
            </p>

            <p className="mt-1 text-2xl font-semibold text-stone-900">
              {summary.investigation}
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <CheckCircle2
              size={20}
              className="text-violet-500"
            />

            <p className="mt-4 text-sm text-stone-500">
              Pending Checker
            </p>

            <p className="mt-1 text-2xl font-semibold text-stone-900">
              {summary.pendingChecker}
            </p>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">

            <div className="border-b border-stone-100 px-6 py-5">
              <p className="text-sm font-medium text-amber-600">
                Case Queue
              </p>

              <h2 className="mt-1 text-xl font-semibold text-stone-900">
                Investigation cases
              </h2>
            </div>

            {cases.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-stone-500">
                  No cases found.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1300px] w-full">

                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Priority
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Status
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Exception
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Transaction
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Amount
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Assigned To
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Created
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-stone-100">

                    {cases.map((caseRecord) => {
                      const exception =
                        caseRecord.exceptionId

                      const transaction =
                        exception?.transactionId

                      return (
                        <tr
                          key={caseRecord._id}
                          className="transition hover:bg-stone-50"
                        >
                          <td className="whitespace-nowrap px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPriorityClasses(
                                caseRecord.priority,
                              )}`}
                            >
                              {formatLabel(
                                caseRecord.priority,
                              )}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                                caseRecord.status,
                              )}`}
                            >
                              {formatLabel(
                                caseRecord.status,
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-stone-800">
                              {formatLabel(
                                exception?.exceptionType,
                              )}
                            </p>

                            <p className="mt-1 text-xs text-stone-400">
                              Score:{' '}
                              {exception?.score ??
                                '—'}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-stone-800">
                              {transaction?.transactionId ||
                                '—'}
                            </p>

                            <p className="mt-1 text-xs text-stone-400">
                              {transaction?.sourceSystem ||
                                ''}
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-stone-700">
                            {formatAmount(
                              transaction?.amount,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {caseRecord.assignedTo ? (
                              <>
                                <p className="text-sm font-medium text-stone-700">
                                  {caseRecord
                                    .assignedTo
                                    ?.name || '—'}
                                </p>

                                <p className="mt-1 text-xs text-stone-400">
                                  {caseRecord
                                    .assignedTo
                                    ?.email || ''}
                                </p>
                              </>
                            ) : (
                              <span className="text-sm text-stone-400">
                                Unassigned
                              </span>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-stone-500">
                            {formatDate(
                              caseRecord.createdAt,
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <Link
                              to={`/cases/${caseRecord._id}`}
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 hover:text-stone-950"
                            >
                              <Eye size={15} />
                              View Case
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

export default CasesPage