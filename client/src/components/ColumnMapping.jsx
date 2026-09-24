const mappingFields = [
  {
    key: 'transactionId',
    label: 'Transaction ID',
    required: true,
  },
  {
    key: 'referenceNumber',
    label: 'Reference Number',
    required: false,
  },
  {
    key: 'accountNumber',
    label: 'Account Number',
    required: false,
  },
  {
    key: 'amount',
    label: 'Amount',
    required: true,
  },
  {
    key: 'transactionDate',
    label: 'Transaction Date',
    required: true,
  },
  {
    key: 'status',
    label: 'Status',
    required: true,
  },
]

function ColumnMapping({
  headers = [],
  mapping,
  setMapping,
}) {
  const handleChange = (field, value) => {
    setMapping((current) => ({
      ...current,
      [field]: value,
    }))
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
      <div>
        <p className="text-sm font-medium text-amber-600">
          Column Mapping
        </p>

        <h3 className="mt-1 text-lg font-semibold text-stone-900">
          Match file columns
        </h3>

        <p className="mt-2 text-sm leading-6 text-stone-500">
          Tell BankSync which column in your file represents each
          transaction field.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {mappingFields.map((field) => (
          <div key={field.key}>
            <label
              htmlFor={field.key}
              className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700"
            >
              {field.label}

              {field.required ? (
                <span className="text-xs font-medium text-red-500">
                  Required
                </span>
              ) : (
                <span className="text-xs text-stone-400">
                  Optional
                </span>
              )}
            </label>

            <select
              id={field.key}
              value={mapping[field.key] || ''}
              onChange={(event) =>
                handleChange(
                  field.key,
                  event.target.value,
                )
              }
              className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
            >
              <option value="">
                Select column
              </option>

              {headers.map((header) => (
                <option
                  key={header}
                  value={header}
                >
                  {header}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </section>
  )
}

export default ColumnMapping