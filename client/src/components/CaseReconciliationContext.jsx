import {
  ArrowRight,
  FileText,
  GitCompareArrows,
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

function UploadCard({
  title,
  upload,
}) {
  if (!upload) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-5">
        <p className="text-sm text-stone-500">
          {title} information unavailable.
        </p>
      </div>
    )
  }

  const hasInvalidRows =
    Number(upload.invalidRows || 0) > 0

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600">
          <FileText size={18} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
            {title}
          </p>

          <p className="mt-1 break-all text-sm font-semibold text-stone-900">
            {upload.originalName ||
              upload.fileName}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <TransactionField
          label="System"
          value={upload.sourceSystem}
        />

        <TransactionField
          label="Status"
          value={formatLabel(
            upload.status,
          )}
        />

        <TransactionField
          label="Total Rows"
          value={upload.totalRows}
        />

        <TransactionField
          label="Valid Rows"
          value={upload.validRows}
        />

        <TransactionField
          label="Invalid Rows"
          value={upload.invalidRows}
        />
      </div>

      {hasInvalidRows && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
          This reconciliation file contains invalid rows. Review them in
          Dataset Investigation before finalizing the investigation.
        </div>
      )}
    </div>
  )
}

function CaseReconciliationContext({
  caseRecord,
}) {
  const exception =
    caseRecord?.exceptionId

  const reconciliation =
    exception?.reconciliationId

  const sourceUpload =
    reconciliation?.sourceUploadId

  const targetUpload =
    reconciliation?.targetUploadId

  if (
    !exception ||
    !reconciliation
  ) {
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
            Reconciliation Context
          </h2>

          <p className="mt-1 text-sm leading-6 text-stone-500">
            Review the source and target files that produced this
            reconciliation exception.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <UploadCard
          title="Reconciliation Source File"
          upload={sourceUpload}
        />

        <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-500 lg:flex">
          <ArrowRight size={18} />
        </div>

        <UploadCard
          title="Reconciliation Target File"
          upload={targetUpload}
        />
      </div>
    </section>
  )
}

export default CaseReconciliationContext