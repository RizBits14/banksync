function formatStatus(status) {
  return status
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function CaseStatusSummary({ cases = [] }) {
  const totalCases = cases.reduce(
    (total, item) => total + item.count,
    0,
  )

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-medium text-amber-600">
          Case Management
        </p>

        <h2 className="mt-1 text-xl font-semibold text-stone-900">
          Case status
        </h2>

        <p className="mt-2 text-sm text-stone-500">
          Current distribution of reconciliation cases.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {cases.length === 0 ? (
          <div className="rounded-xl bg-stone-50 px-4 py-5 text-sm text-stone-500">
            No case data available.
          </div>
        ) : (
          cases.map((item) => {
            const percentage =
              totalCases > 0
                ? Math.round((item.count / totalCases) * 100)
                : 0

            return (
              <div
                key={item._id}
                className="rounded-xl border border-stone-100 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-stone-700">
                      {formatStatus(item._id)}
                    </p>

                    <p className="mt-1 text-xs text-stone-400">
                      {percentage}% of all cases
                    </p>
                  </div>

                  <p className="text-2xl font-semibold text-stone-900">
                    {item.count}
                  </p>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

export default CaseStatusSummary