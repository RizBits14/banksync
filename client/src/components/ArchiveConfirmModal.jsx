import {
  Archive,
  Info,
  X,
} from 'lucide-react'

function ArchiveConfirmModal({
  open,
  fileName,
  archiving,
  onCancel,
  onConfirm,
}) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white shadow-xl">

        <div className="flex items-start justify-between gap-4 border-b border-stone-100 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Info size={21} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Archive upload
              </h2>

              <p className="mt-1 text-sm leading-6 text-stone-500">
                The upload will remain in BankSync for reconciliation,
                audit, and historical records.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={archiving}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close archive confirmation"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="rounded-xl bg-stone-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
              File
            </p>

            <p className="mt-1 break-all text-sm font-medium text-stone-800">
              {fileName}
            </p>
          </div>

          <p className="mt-4 text-sm leading-6 text-stone-600">
            Archiving does not delete transactions or reconciliation history.
            Only Admins can archive uploads.
          </p>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={archiving}
              className="h-11 rounded-xl border border-stone-200 bg-white px-5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={archiving}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-semibold text-stone-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Archive size={17} />

              {archiving
                ? 'Archiving...'
                : 'Archive file'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ArchiveConfirmModal