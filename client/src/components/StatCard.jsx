function StatCard({
  title,
  value,
  description,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-stone-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
            {value}
          </p>
        </div>

        {Icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Icon size={20} />
          </div>
        )}
      </div>

      {description && (
        <p className="mt-3 text-xs leading-5 text-stone-400">
          {description}
        </p>
      )}
    </div>
  )
}

export default StatCard