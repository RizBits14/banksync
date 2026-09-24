import { AlertTriangle } from 'lucide-react'

function formatFieldName(field) {
  if (!field) {
    return 'Transaction'
  }

  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (letter) => letter.toUpperCase())
}

function UploadValidationErrors({
  validationErrors = [],
  truncated = false,
}) {
  if (validationErrors.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={19}
          className="mt-0.5 shrink-0 text-amber-600"
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900">
            Some transaction rows could not be validated
          </p>

          <p className="mt-1 text-xs leading-5 text-amber-700">
            Review the rows below and correct the source file if needed.
          </p>
        </div>
      </div>

      <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">
        {validationErrors.map((item) => (
          <div
            key={item.recordNumber}
            className="rounded-lg border border-amber-200 bg-white p-3"
          >
            <p className="text-sm font-semibold text-stone-800">
              Row {item.recordNumber}
            </p>

            <div className="mt-2 space-y-1.5">
              {item.errors?.map((issue, index) => (
                <p
                  key={`${item.recordNumber}-${issue.field}-${index}`}
                  className="text-xs leading-5 text-stone-600"
                >
                  <span className="font-medium text-stone-800">
                    {formatFieldName(issue.field)}:
                  </span>{' '}
                  {issue.message}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {truncated && (
        <p className="mt-3 text-xs font-medium text-amber-700">
          Only the first 100 invalid rows are shown.
        </p>
      )}
    </div>
  )
}

export default UploadValidationErrors