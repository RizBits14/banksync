function ReconciliationSummary({
  totalProcessed = 0,
  matched = 0,
  probable = 0,
  unmatched = 0,
  mismatches = 0,
  exactMatchRate = 0,
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-amber-600">
            Reconciliation Performance
          </p>

          <h2 className="mt-1 text-xl font-semibold text-stone-900">
            Latest processing summary
          </h2>

          <p className="mt-2 text-sm text-stone-500">
            Overview of transaction matching results.
          </p>
        </div>

        <div className="rounded-xl bg-amber-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
            Exact Match Rate
          </p>

          <p className="mt-1 text-2xl font-semibold text-stone-900">
            {exactMatchRate}%
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl bg-stone-50 p-4">
          <p className="text-xs font-medium text-stone-500">
            Processed
          </p>

          <p className="mt-2 text-2xl font-semibold text-stone-900">
            {totalProcessed}
          </p>
        </div>

        <div className="rounded-xl bg-stone-50 p-4">
          <p className="text-xs font-medium text-stone-500">
            Matched
          </p>

          <p className="mt-2 text-2xl font-semibold text-stone-900">
            {matched}
          </p>
        </div>

        <div className="rounded-xl bg-stone-50 p-4">
          <p className="text-xs font-medium text-stone-500">
            Probable
          </p>

          <p className="mt-2 text-2xl font-semibold text-stone-900">
            {probable}
          </p>
        </div>

        <div className="rounded-xl bg-stone-50 p-4">
          <p className="text-xs font-medium text-stone-500">
            Unmatched
          </p>

          <p className="mt-2 text-2xl font-semibold text-stone-900">
            {unmatched}
          </p>
        </div>

        <div className="rounded-xl bg-stone-50 p-4">
          <p className="text-xs font-medium text-stone-500">
            Mismatches
          </p>

          <p className="mt-2 text-2xl font-semibold text-stone-900">
            {mismatches}
          </p>
        </div>
      </div>
    </section>
  )
}

export default ReconciliationSummary