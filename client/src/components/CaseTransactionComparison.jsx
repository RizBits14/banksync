import {
  CircleAlert,
  GitCompareArrows,
} from 'lucide-react'

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

function formatDate(value) {
  if (!value) return '—'

  return new Date(
    value,
  ).toLocaleString()
}

function TransactionField({
  label,
  value,
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-stone-800">
        {value ?? '—'}
      </p>
    </div>
  )
}

function TransactionCard({
  title,
  transaction,
  missingMessage,
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-5">
      <h3 className="text-sm font-semibold text-stone-900">
        {title}
      </h3>

      {!transaction ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-4">
          <div className="flex items-start gap-2">
            <CircleAlert
              size={17}
              className="mt-0.5 shrink-0 text-red-600"
            />

            <div>
              <p className="text-sm font-semibold text-red-700">
                No transaction found
              </p>

              <p className="mt-1 text-sm leading-6 text-red-600">
                {missingMessage}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TransactionField
            label="Transaction ID"
            value={
              transaction.transactionId
            }
          />

          <TransactionField
            label="System"
            value={
              transaction.sourceSystem
            }
          />

          <TransactionField
            label="Amount"
            value={formatAmount(
              transaction.amount,
            )}
          />

          <TransactionField
            label="Status"
            value={
              transaction.status
            }
          />

          <TransactionField
            label="Reference"
            value={
              transaction.referenceNumber
            }
          />

          <TransactionField
            label="Account"
            value={
              transaction.accountNumber
            }
          />

          <div className="sm:col-span-2">
            <TransactionField
              label="Transaction Date"
              value={formatDate(
                transaction.transactionDate,
              )}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function CaseTransactionComparison({
  caseRecord,
}) {
  const exception =
    caseRecord?.exceptionId

  const result =
    exception?.reconciliationResultId

  const sourceTransaction =
    result?.sourceTransactionId

  const targetTransaction =
    result?.targetTransactionId

  if (!result) {
    return null
  }

  return (
    <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <GitCompareArrows
            size={20}
          />
        </div>

        <div>
          <h2 className="font-semibold text-stone-900">
            Transaction Comparison
          </h2>

          <p className="mt-1 text-sm leading-6 text-stone-500">
            Compare the source-side and target-side transaction records used by
            the reconciliation engine.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <TransactionCard
          title="Source-Side Transaction"
          transaction={
            sourceTransaction
          }
          missingMessage="No corresponding transaction exists on the source side of this reconciliation result."
        />

        <TransactionCard
          title="Target-Side Transaction"
          transaction={
            targetTransaction
          }
          missingMessage="No corresponding transaction exists on the target side of this reconciliation result."
        />
      </div>
    </section>
  )
}

export default CaseTransactionComparison