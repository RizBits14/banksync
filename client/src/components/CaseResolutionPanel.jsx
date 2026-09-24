import {
  useEffect,
  useState,
} from 'react'

import {
  Archive,
  CheckCircle2,
  CircleCheckBig,
  TriangleAlert,
} from 'lucide-react'

import { apiRequest } from '../services/api'

function CaseResolutionPanel({
  caseRecord,
  currentUser,
  onCaseUpdated,
}) {
  const [
    resolutionExecutionNote,
    setResolutionExecutionNote,
  ] = useState('')

  const [
    closureNote,
    setClosureNote,
  ] = useState('')

  const [
    processingAction,
    setProcessingAction,
  ] = useState(null)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const allowedRole =
    currentUser?.role === 'ADMIN' ||
    currentUser?.role ===
      'OPERATIONS_MANAGER'

  const canResolve =
    allowedRole &&
    caseRecord?.status === 'APPROVED'

  const canClose =
    allowedRole &&
    caseRecord?.status === 'RESOLVED'

  useEffect(() => {
    setResolutionExecutionNote(
      caseRecord
        ?.resolutionExecutionNote || '',
    )

    setClosureNote(
      caseRecord?.closureNote || '',
    )

    setError('')
    setSuccess('')
  }, [
    caseRecord?._id,
    caseRecord?.status,
  ])

  if (!canResolve && !canClose) {
    return null
  }

  const handleResolve = async () => {
    setError('')
    setSuccess('')

    const note =
      resolutionExecutionNote.trim()

    if (note.length < 3) {
      setError(
        'Explain what corrective action was completed before resolving the case.',
      )

      return
    }

    setProcessingAction('resolve')

    try {
      const response =
        await apiRequest(
          `/cases/${caseRecord._id}/resolve`,
          {
            method: 'POST',

            body: JSON.stringify({
              resolutionExecutionNote:
                note,
            }),
          },
        )

      setSuccess(
        response.message ||
          'Case resolved successfully.',
      )

      if (onCaseUpdated) {
        await onCaseUpdated()
      }
    } catch (err) {
      setError(
        err.message ||
          'Unable to resolve case.',
      )
    } finally {
      setProcessingAction(null)
    }
  }

  const handleClose = async () => {
    setError('')
    setSuccess('')

    const note =
      closureNote.trim()

    if (note.length < 3) {
      setError(
        'Add a final closure note before closing the case.',
      )

      return
    }

    setProcessingAction('close')

    try {
      const response =
        await apiRequest(
          `/cases/${caseRecord._id}/close`,
          {
            method: 'POST',

            body: JSON.stringify({
              closureNote: note,
            }),
          },
        )

      setSuccess(
        response.message ||
          'Case closed successfully.',
      )

      if (onCaseUpdated) {
        await onCaseUpdated()
      }
    } catch (err) {
      setError(
        err.message ||
          'Unable to close case.',
      )
    } finally {
      setProcessingAction(null)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          {canResolve ? (
            <CircleCheckBig size={20} />
          ) : (
            <Archive size={20} />
          )}
        </div>

        <div>
          <h2 className="font-semibold text-stone-900">
            {canResolve
              ? 'Resolution Execution'
              : 'Final Case Closure'}
          </h2>

          <p className="mt-1 text-sm leading-6 text-stone-500">
            {canResolve
              ? 'The Checker has approved the investigation. Confirm that the approved corrective action has actually been completed.'
              : 'The corrective action has been completed and the case is resolved. Perform the final administrative closure.'}
          </p>
        </div>
      </div>

      {canResolve && (
        <>
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Approved Action
            </p>

            <p className="mt-2 text-sm font-semibold text-stone-900">
              {caseRecord
                ?.proposedAction
                ?.replaceAll('_', ' ')
                .toLowerCase()
                .replace(
                  /\b\w/g,
                  (letter) =>
                    letter.toUpperCase(),
                ) || '—'}
            </p>

            {caseRecord
              ?.proposedResolution && (
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {
                  caseRecord
                    .proposedResolution
                }
              </p>
            )}
          </div>

          <div className="mt-6">
            <label
              htmlFor="resolutionExecutionNote"
              className="mb-2 block text-sm font-medium text-stone-700"
            >
              Resolution Execution Note
            </label>

            <textarea
              id="resolutionExecutionNote"
              rows={5}
              maxLength={2000}
              value={
                resolutionExecutionNote
              }
              onChange={(event) => {
                setResolutionExecutionNote(
                  event.target.value,
                )

                setError('')
              }}
              placeholder="Describe what corrective action was actually completed. For example: Source transaction record was corrected and the affected transaction was successfully reprocessed."
              className="w-full resize-y rounded-xl border border-stone-200 p-3 text-sm text-stone-800 outline-none focus:border-emerald-300"
            />

            <div className="mt-1 text-right text-xs text-stone-400">
              {
                resolutionExecutionNote.length
              }
              /2000
            </div>
          </div>
        </>
      )}

      {canClose && (
        <>
          <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
              Completed Resolution
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-600">
              {caseRecord
                ?.resolutionExecutionNote ||
                'No resolution execution note available.'}
            </p>
          </div>

          <div className="mt-6">
            <label
              htmlFor="closureNote"
              className="mb-2 block text-sm font-medium text-stone-700"
            >
              Closure Note
            </label>

            <textarea
              id="closureNote"
              rows={5}
              maxLength={2000}
              value={closureNote}
              onChange={(event) => {
                setClosureNote(
                  event.target.value,
                )

                setError('')
              }}
              placeholder="Confirm why this resolved case is ready for final closure."
              className="w-full resize-y rounded-xl border border-stone-200 p-3 text-sm text-stone-800 outline-none focus:border-emerald-300"
            />

            <div className="mt-1 text-right text-xs text-stone-400">
              {closureNote.length}/2000
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <TriangleAlert
            size={17}
            className="mt-0.5 shrink-0 text-red-600"
          />

          <p className="text-sm text-red-700">
            {error}
          </p>
        </div>
      )}

      {success && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2
            size={17}
            className="mt-0.5 shrink-0 text-emerald-600"
          />

          <p className="text-sm text-emerald-700">
            {success}
          </p>
        </div>
      )}

      <div className="mt-6 border-t border-stone-100 pt-5">
        {canResolve && (
          <button
            type="button"
            onClick={handleResolve}
            disabled={Boolean(
              processingAction,
            )}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CircleCheckBig size={17} />

            {processingAction ===
            'resolve'
              ? 'Resolving...'
              : 'Confirm Resolution Completed'}
          </button>
        )}

        {canClose && (
          <button
            type="button"
            onClick={handleClose}
            disabled={Boolean(
              processingAction,
            )}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Archive size={17} />

            {processingAction ===
            'close'
              ? 'Closing...'
              : 'Close Case'}
          </button>
        )}
      </div>
    </section>
  )
}

export default CaseResolutionPanel