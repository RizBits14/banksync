function formatDate(dateString) {
  if (!dateString) return '—'

  return new Date(dateString).toLocaleString()
}

function formatStatus(status) {
  return status
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function RecentReconciliations({ reconciliations = [] }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-100 px-6 py-5">
        <p className="text-sm font-medium text-amber-600">
          Reconciliation Activity
        </p>

        <h2 className="mt-1 text-xl font-semibold text-stone-900">
          Recent reconciliations
        </h2>

        <p className="mt-2 text-sm text-stone-500">
          Latest reconciliation runs processed by BankSync.
        </p>
      </div>

      {reconciliations.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm text-stone-500">
            No reconciliation history available.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Status
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Transactions
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Matched
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Probable
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Unmatched
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Mismatches
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Created
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100">
              {reconciliations.map((item) => (
                <tr
                  key={item._id}
                  className="transition hover:bg-stone-50"
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      {formatStatus(item.status)}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-stone-900">
                    {item.totalTransactions ?? 0}
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-600">
                    {item.matchedCount ?? 0}
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-600">
                    {item.probableMatchCount ?? 0}
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-600">
                    {item.unmatchedCount ?? 0}
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-600">
                    {item.mismatchCount ?? 0}
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-500">
                    {formatDate(item.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default RecentReconciliations