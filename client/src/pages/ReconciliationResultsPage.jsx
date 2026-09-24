import {
  useEffect,
  useState,
} from 'react'

import {
  ArrowLeft,
  CheckCircle2,
  CircleHelp,
  TriangleAlert,
} from 'lucide-react'

import {
  Link,
  useParams,
} from 'react-router-dom'

import { apiRequest } from '../services/api'

function formatResult(result) {
  if (!result) return '—'

  return result
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

function getResultClasses(result) {
  if (result === 'MATCHED') {
    return 'bg-emerald-50 text-emerald-700'
  }

  if (result === 'PROBABLE_MATCH') {
    return 'bg-amber-50 text-amber-700'
  }

  if (result === 'UNMATCHED') {
    return 'bg-stone-100 text-stone-700'
  }

  return 'bg-red-50 text-red-700'
}

function ReconciliationResultsPage() {
  const { id } = useParams()

  const [results, setResults] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    const loadResults = async () => {
      setLoading(true)
      setError('')

      try {
        const response =
          await apiRequest(
            `/reconciliations/${id}/results`,
          )

        setResults(response.data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadResults()
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-medium text-stone-500">
          Loading reconciliation results...
        </p>
      </div>
    )
  }

  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <Link
          to="/reconciliation"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition hover:text-stone-900"
        >
          <ArrowLeft size={17} />
          Back to reconciliation
        </Link>

        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <CheckCircle2 size={22} />
            </div>

            <div>
              <p className="text-sm font-medium text-amber-600">
                Matching Details
              </p>

              <h1 className="mt-1 text-2xl font-semibold text-stone-900">
                Reconciliation Results
              </h1>

              <p className="mt-2 text-sm text-stone-500">
                Review the source and target transaction pairs produced by this
                reconciliation run.
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && results.length === 0 && (
          <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-sm">
            <CircleHelp
              size={26}
              className="mx-auto text-stone-400"
            />

            <p className="mt-3 text-sm text-stone-500">
              No reconciliation results found.
            </p>
          </div>
        )}

        {!error && results.length > 0 && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-6 py-5">
              <p className="text-sm font-medium text-amber-600">
                Transaction Results
              </p>

              <h2 className="mt-1 text-xl font-semibold text-stone-900">
                {results.length} result rows
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Result
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Score
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Source Transaction
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Source Amount
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Source Status
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Target Transaction
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Target Amount
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Target Status
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-100">
                  {results.map((result) => {
                    const source =
                      result.sourceTransactionId

                    const target =
                      result.targetTransactionId

                    return (
                      <tr
                        key={result._id}
                        className="transition hover:bg-stone-50"
                      >
                        <td className="whitespace-nowrap px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getResultClasses(
                              result.result,
                            )}`}
                          >
                            {formatResult(
                              result.result,
                            )}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-stone-600">
                          {result.matchScore ??
                            '—'}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-stone-800">
                            {source?.transactionId ||
                              '—'}
                          </p>

                          <p className="mt-1 text-xs text-stone-400">
                            {source?.sourceSystem ||
                              ''}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-stone-700">
                          {formatAmount(
                            source?.amount,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-stone-700">
                          {source?.status ||
                            '—'}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-stone-800">
                            {target?.transactionId ||
                              '—'}
                          </p>

                          <p className="mt-1 text-xs text-stone-400">
                            {target?.sourceSystem ||
                              ''}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-stone-700">
                          {formatAmount(
                            target?.amount,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-stone-700">
                          {target?.status ||
                            '—'}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-stone-500">
                          {formatDate(
                            source?.transactionDate ||
                              target?.transactionDate,
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {error && (
          <div className="mt-5 flex items-center gap-2 text-sm text-red-600">
            <TriangleAlert size={16} />
            Results could not be loaded.
          </div>
        )}
      </div>
    </div>
  )
}

export default ReconciliationResultsPage