import { useEffect, useState } from 'react'
import {
  UserRoundCheck,
} from 'lucide-react'

import { apiRequest } from '../services/api'

function CaseAssignmentPanel({
  caseRecord,
  currentUser,
  onCaseUpdated,
}) {
  const [makers, setMakers] =
    useState([])

  const [makerId, setMakerId] =
    useState('')

  const [loadingMakers, setLoadingMakers] =
    useState(false)

  const [assigning, setAssigning] =
    useState(false)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const canAssign =
    currentUser?.role === 'ADMIN' ||
    currentUser?.role ===
      'OPERATIONS_MANAGER'

  const caseCanBeAssigned =
    caseRecord?.status === 'OPEN' ||
    caseRecord?.status === 'ASSIGNED'

  useEffect(() => {
    if (!canAssign) {
      return
    }

    const loadMakers = async () => {
      setLoadingMakers(true)

      try {
        const response =
          await apiRequest('/users/makers')

        setMakers(response.data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoadingMakers(false)
      }
    }

    loadMakers()
  }, [canAssign])

  if (!canAssign || !caseCanBeAssigned) {
    return null
  }

  const handleAssign = async (
    event,
  ) => {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!makerId) {
      setError(
        'Please select a Maker.',
      )
      return
    }

    setAssigning(true)

    try {
      const response =
        await apiRequest(
          `/cases/${caseRecord._id}/assign`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              makerId,
            }),
          },
        )

      setSuccess(
        response.message ||
          'Case assigned successfully.',
      )

      setMakerId('')

      if (onCaseUpdated) {
        await onCaseUpdated()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setAssigning(false)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <UserRoundCheck size={19} />
        </div>

        <div>
          <h2 className="font-semibold text-stone-900">
            Assign Case
          </h2>

          <p className="mt-1 text-sm text-stone-500">
            Assign this case to an active Maker for investigation.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleAssign}
        className="mt-5 flex flex-col gap-3 sm:flex-row"
      >
        <select
          value={makerId}
          onChange={(event) =>
            setMakerId(
              event.target.value,
            )
          }
          disabled={
            loadingMakers ||
            assigning
          }
          className="h-11 flex-1 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">
            {loadingMakers
              ? 'Loading Makers...'
              : 'Select Maker'}
          </option>

          {makers.map((maker) => (
            <option
              key={maker._id}
              value={maker._id}
            >
              {maker.name} — {maker.email}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={
            assigning ||
            loadingMakers ||
            makers.length === 0
          }
          className="h-11 rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {assigning
            ? 'Assigning...'
            : caseRecord.assignedTo
              ? 'Reassign Maker'
              : 'Assign Maker'}
        </button>
      </form>

      {makers.length === 0 &&
        !loadingMakers && (
          <p className="mt-3 text-sm text-amber-700">
            No active Makers are available.
          </p>
        )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}
    </section>
  )
}

export default CaseAssignmentPanel