import {
  CircleAlert,
  FileCheck2,
} from 'lucide-react'

function formatLabel(value) {
  if (!value) return '—'

  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    )
}

function CaseResultScoring({
  caseRecord,
}) {
  const exception =
    caseRecord?.exceptionId

  const result =
    exception?.reconciliationResultId

  if (!exception || !result) {
    return null
  }

  const systemReasons =
    exception?.reasons || []

  return (
    <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <FileCheck2 size={20} />
        </div>

        <div>
          <h2 className="font-semibold text-stone-900">
            Reconciliation Result
          </h2>

          <p className="mt-1 text-sm leading-6 text-stone-500">
            Review the final reconciliation outcome and the system reason that
            created this exception.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
            Reconciliation Result
          </p>

          <p className="mt-2 text-lg font-semibold text-stone-900">
            {formatLabel(
              result.result,
            )}
          </p>
        </div>

        <div className="rounded-xl border border-stone-200 bg-stone-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
            Exception Type
          </p>

          <p className="mt-2 text-lg font-semibold text-stone-900">
            {formatLabel(
              exception.exceptionType,
            )}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
          System Reason
        </p>

        {systemReasons.length > 0 ? (
          <div className="mt-3 space-y-2">
            {systemReasons.map(
              (reason, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-4"
                >
                  <CircleAlert
                    size={17}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />

                  <p className="text-sm leading-6 text-stone-700">
                    {reason}
                  </p>
                </div>
              ),
            )}
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-stone-50 px-4 py-4 text-sm text-stone-500">
            No system reason recorded.
          </p>
        )}
      </div>
    </section>
  )
}

export default CaseResultScoring