import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ListTodo,
} from 'lucide-react'

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

  return new Date(
    dateString,
  ).toLocaleString()
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

function getStatusClasses(status) {
  if (status === 'RESOLVED') {
    return 'bg-emerald-50 text-emerald-700'
  }

  if (status === 'ASSIGNED') {
    return 'bg-amber-50 text-amber-700'
  }

  return 'bg-red-50 text-red-700'
}

function getTypeClasses(type) {
  if (type === 'PROBABLE_MATCH') {
    return 'bg-amber-50 text-amber-700'
  }

  if (type === 'UNMATCHED') {
    return 'bg-stone-100 text-stone-700'
  }

  return 'bg-red-50 text-red-700'
}

function ExceptionsPage() {
  const [
    exceptions,
    setExceptions,
  ] = useState([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  useEffect(() => {
    const loadExceptions =
      async () => {
        setLoading(true)
        setError('')

        try {
          const response =
            await apiRequest(
              '/exceptions',
            )

          setExceptions(
            response.data || [],
          )
        } catch (err) {
          setError(
            err.message,
          )
        } finally {
          setLoading(false)
        }
      }

    loadExceptions()
  }, [])

  const summary = useMemo(() => {
    return {
      total:
        exceptions.length,

      open:
        exceptions.filter(
          (item) =>
            item.status ===
            'OPEN',
        ).length,

      assigned:
        exceptions.filter(
          (item) =>
            item.status ===
            'ASSIGNED',
        ).length,

      resolved:
        exceptions.filter(
          (item) =>
            item.status ===
            'RESOLVED',
        ).length,
    }
  }, [exceptions])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-medium text-stone-500">
          Loading exceptions...
        </p>
      </div>
    )
  }

  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* PAGE HEADER */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle
                size={22}
              />
            </div>

            <div>
              <p className="text-sm font-medium text-amber-600">
                Exception Management
              </p>

              <h1 className="mt-1 text-2xl font-semibold text-stone-900">
                Exceptions
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
                Review transactions that
                require investigation
                after reconciliation.
              </p>
            </div>
          </div>
        </section>

        {/* SUMMARY */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <ListTodo
              size={20}
              className="text-stone-500"
            />

            <p className="mt-4 text-sm text-stone-500">
              Total Exceptions
            </p>

            <p className="mt-1 text-2xl font-semibold text-stone-900">
              {summary.total}
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <AlertTriangle
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
              Assigned
            </p>

            <p className="mt-1 text-2xl font-semibold text-stone-900">
              {summary.assigned}
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <CheckCircle2
              size={20}
              className="text-emerald-500"
            />

            <p className="mt-4 text-sm text-stone-500">
              Resolved
            </p>

            <p className="mt-1 text-2xl font-semibold text-stone-900">
              {summary.resolved}
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
                Exception Queue
              </p>

              <h2 className="mt-1 text-xl font-semibold text-stone-900">
                Reconciliation Exceptions
              </h2>
            </div>

            {exceptions.length ===
            0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-stone-500">
                  No exceptions found.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1050px] w-full">

                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Type
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Transaction
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Amount
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Transaction Status
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Reason
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Exception Status
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Created
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-stone-100">

                    {exceptions.map(
                      (exception) => {
                        const transaction =
                          exception.transactionId

                        return (
                          <tr
                            key={
                              exception._id
                            }
                            className="transition hover:bg-stone-50"
                          >
                            <td className="whitespace-nowrap px-5 py-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getTypeClasses(
                                  exception.exceptionType,
                                )}`}
                              >
                                {formatLabel(
                                  exception.exceptionType,
                                )}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-sm font-medium text-stone-800">
                                {transaction
                                  ?.transactionId ||
                                  '—'}
                              </p>

                              <p className="mt-1 text-xs text-stone-400">
                                {transaction
                                  ?.sourceSystem ||
                                  ''}
                              </p>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-sm text-stone-700">
                              {formatAmount(
                                transaction
                                  ?.amount,
                              )}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-sm text-stone-700">
                              {transaction
                                ?.status ||
                                '—'}
                            </td>

                            <td className="max-w-xs px-5 py-4">
                              {exception
                                .reasons
                                ?.length >
                              0 ? (
                                <div className="space-y-1">
                                  {exception.reasons.map(
                                    (
                                      reason,
                                      index,
                                    ) => (
                                      <p
                                        key={`${exception._id}-${index}`}
                                        className="text-xs leading-5 text-stone-500"
                                      >
                                        {
                                          reason
                                        }
                                      </p>
                                    ),
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-stone-400">
                                  —
                                </span>
                              )}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                                  exception.status,
                                )}`}
                              >
                                {formatLabel(
                                  exception.status,
                                )}
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-sm text-stone-500">
                              {formatDate(
                                exception.createdAt,
                              )}
                            </td>
                          </tr>
                        )
                      },
                    )}
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

export default ExceptionsPage