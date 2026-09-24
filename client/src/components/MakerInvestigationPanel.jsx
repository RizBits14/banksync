import { useState } from 'react'
import {
  PlayCircle,
} from 'lucide-react'

import { apiRequest } from '../services/api'

function MakerInvestigationPanel({
  caseRecord,
  currentUser,
  onCaseUpdated,
}) {
  const [starting, setStarting] =
    useState(false)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const currentUserId =
    currentUser?._id ||
    currentUser?.id ||
    currentUser?.userId

  const assignedToId =
    caseRecord?.assignedTo?._id ||
    caseRecord?.assignedTo

  const isAssignedMaker =
    currentUser?.role === 'MAKER' &&
    currentUserId &&
    assignedToId &&
    String(currentUserId) ===
      String(assignedToId)

  const canStart =
    isAssignedMaker &&
    (
      caseRecord?.status === 'ASSIGNED' ||
      caseRecord?.status ===
        'RETURNED_TO_MAKER'
    )

  if (!canStart) {
    return null
  }

  const handleStart = async () => {
    setStarting(true)
    setError('')
    setSuccess('')

    try {
      const response =
        await apiRequest(
          `/cases/${caseRecord._id}/start`,
          {
            method: 'PATCH',
          },
        )

      setSuccess(
        response.message ||
          'Investigation started.',
      )

      if (onCaseUpdated) {
        await onCaseUpdated()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setStarting(false)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <PlayCircle size={20} />
        </div>

        <div className="flex-1">
          <h2 className="font-semibold text-stone-900">
            Begin Investigation
          </h2>

          <p className="mt-1 text-sm leading-6 text-stone-500">
            Start working on this assigned case. The case status will change to
            Under Investigation.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleStart}
        disabled={starting}
        className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <PlayCircle size={17} />

        {starting
          ? 'Starting...'
          : 'Start Investigation'}
      </button>

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

export default MakerInvestigationPanel