import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Send,
  UserRound,
} from 'lucide-react'

import { apiRequest } from '../services/api'

function formatLabel(value) {
  if (!value) return '—'

  return String(value)
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    )
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return String(value)
  }

  return date.toLocaleString()
}

function RequestDataCorrectionPanel({
  caseRecord,
  currentUser,
  onCaseUpdated,
}) {
  const [task, setTask] =
    useState(null)

  const [
    importOfficers,
    setImportOfficers,
  ] = useState([])

  const [
    selectedOfficerId,
    setSelectedOfficerId,
  ] = useState('')

  const [
    checkerInstruction,
    setCheckerInstruction,
  ] = useState('')

  const [loading, setLoading] =
    useState(false)

  const [submitting, setSubmitting] =
    useState(false)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const isDataQualityCase =
    caseRecord?.originType ===
      'DATA_QUALITY_ISSUE' ||
    Boolean(
      caseRecord?.dataQualityIssueId &&
        !caseRecord?.exceptionId,
    )

  /*
   * The handoff appears only AFTER the
   * Checker has approved the investigation.
   *
   * The Case remains APPROVED while the
   * separate correction task moves through
   * Import Officer + verification workflow.
   */
  const canManageHandoff =
    isDataQualityCase &&
    currentUser?.role ===
      'CHECKER' &&
    caseRecord?.status ===
      'APPROVED'

  const makerRecommendation =
    useMemo(
      () => ({
        action:
          caseRecord?.proposedAction,
        resolution:
          caseRecord?.proposedResolution,
      }),
      [
        caseRecord?.proposedAction,
        caseRecord?.proposedResolution,
      ],
    )

  useEffect(() => {
    if (!canManageHandoff) {
      return
    }

    let cancelled = false

    const loadHandoff =
      async () => {
        setLoading(true)
        setError('')

        try {
          const taskResponse =
            await apiRequest(
              `/data-corrections/case/${caseRecord._id}`,
            )

          if (cancelled) return

          const existingTask =
            taskResponse.data || null

          setTask(existingTask)

          /*
           * Only load assignment options
           * when a task has not already
           * been created.
           */
          if (!existingTask) {
            const officersResponse =
              await apiRequest(
                '/data-corrections/import-officers',
              )

            if (cancelled) return

            const officers =
              officersResponse.data ||
              []

            setImportOfficers(
              officers,
            )

            if (
              officers.length === 1
            ) {
              setSelectedOfficerId(
                officers[0]._id,
              )
            }
          }
        } catch (err) {
          if (!cancelled) {
            setError(
              err.message ||
                'Unable to load correction handoff.',
            )
          }
        } finally {
          if (!cancelled) {
            setLoading(false)
          }
        }
      }

    loadHandoff()

    return () => {
      cancelled = true
    }
  }, [
    canManageHandoff,
    caseRecord?._id,
  ])

  if (!canManageHandoff) {
    return null
  }

  const handleRequestCorrection =
    async () => {
      setError('')
      setSuccess('')

      if (!selectedOfficerId) {
        setError(
          'Select an Import Officer.',
        )
        return
      }

      if (
        checkerInstruction
          .trim()
          .length < 10
      ) {
        setError(
          'Write a clear correction instruction of at least 10 characters.',
        )
        return
      }

      setSubmitting(true)

      try {
        const response =
          await apiRequest(
            `/data-corrections/case/${caseRecord._id}/request`,
            {
              method: 'POST',

              body:
                JSON.stringify({
                  importOfficerId:
                    selectedOfficerId,

                  checkerInstruction:
                    checkerInstruction.trim(),
                }),
            },
          )

        setTask(response.data)

        setSuccess(
          response.message ||
            'Correction task assigned to Import Officer.',
        )

        if (onCaseUpdated) {
          await onCaseUpdated()
        }
      } catch (err) {
        setError(
          err.message ||
            'Unable to request data correction.',
        )
      } finally {
        setSubmitting(false)
      }
    }

  /*
   * ----------------------------------------
   * EXISTING HANDOFF
   * ----------------------------------------
   */
  if (task) {
    return (
      <section className="mt-6 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2
              size={20}
            />
          </div>

          <div>
            <h2 className="font-semibold text-stone-900">
              Data Correction Handoff
            </h2>

            <p className="mt-1 text-sm leading-6 text-stone-500">
              The approved Data Quality investigation has been handed to the Import Officer for source-data correction. The original BankSync upload remains immutable.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-stone-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
              Task Status
            </p>

            <p className="mt-2 text-sm font-semibold text-stone-900">
              {formatLabel(
                task.status,
              )}
            </p>
          </div>

          <div className="rounded-xl bg-stone-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
              Assigned Import Officer
            </p>

            <p className="mt-2 text-sm font-semibold text-stone-900">
              {task.assignedTo
                ?.name ||
                '—'}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              {task.assignedTo
                ?.email ||
                ''}
            </p>
          </div>

          <div className="rounded-xl bg-stone-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
              Requested
            </p>

            <p className="mt-2 text-sm font-semibold text-stone-900">
              {formatDate(
                task.requestedAt,
              )}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-stone-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
            Checker Correction Instruction
          </p>

          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">
            {task.checkerInstruction ||
              '—'}
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs leading-5 text-amber-800">
            The Data Quality issue is now in the correction workflow. It is not resolved until a corrected upload is submitted and BankSync verifies that the original defect no longer exists.
          </p>
        </div>
      </section>
    )
  }

  /*
   * ----------------------------------------
   * CREATE HANDOFF
   * ----------------------------------------
   */
  return (
    <section className="mt-6 rounded-2xl border border-violet-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <ClipboardCheck
            size={20}
          />
        </div>

        <div>
          <h2 className="font-semibold text-stone-900">
            Request Data Correction
          </h2>

          <p className="mt-1 text-sm leading-6 text-stone-500">
            The Maker investigation is approved. Create the operational handoff to an Import Officer so the source extract can be corrected and resubmitted for BankSync verification.
          </p>
        </div>
      </div>

      {/* MAKER RECOMMENDATION - READ ONLY */}
      <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Maker Recommendation — Read Only
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
              Proposed Action
            </p>

            <p className="mt-1 text-sm font-semibold text-stone-900">
              {formatLabel(
                makerRecommendation.action,
              )}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
              Original Upload
            </p>

            <p className="mt-1 break-all text-sm font-semibold text-stone-900">
              {caseRecord
                ?.originalUploadId
                ?.originalName ||
                caseRecord
                  ?.dataQualityIssueId
                  ?.uploadId
                  ?.originalName ||
                '—'}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
            Maker Resolution Recommendation
          </p>

          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">
            {makerRecommendation.resolution ||
              'No Maker resolution recommendation recorded.'}
          </p>
        </div>
      </div>

      {/* IMPORT OFFICER */}
      <div className="mt-6">
        <label
          htmlFor="importOfficer"
          className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700"
        >
          <UserRound size={16} />
          Assign Import Officer
        </label>

        <select
          id="importOfficer"
          value={
            selectedOfficerId
          }
          onChange={(event) => {
            setSelectedOfficerId(
              event.target.value,
            )
            setError('')
          }}
          disabled={
            loading ||
            importOfficers.length ===
              0
          }
          className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none focus:border-violet-300 disabled:bg-stone-50"
        >
          <option value="">
            Select active Import Officer
          </option>

          {importOfficers.map(
            (officer) => (
              <option
                key={officer._id}
                value={officer._id}
              >
                {officer.name} —{' '}
                {officer.email}
              </option>
            ),
          )}
        </select>

        {!loading &&
          importOfficers.length ===
            0 && (
            <p className="mt-2 text-xs text-red-600">
              No active Import Officer is available. An Admin must activate or create an Import Officer account before correction can be assigned.
            </p>
          )}
      </div>

      {/* CHECKER INSTRUCTION */}
      <div className="mt-5">
        <label
          htmlFor="checkerInstruction"
          className="mb-2 block text-sm font-medium text-stone-700"
        >
          Checker Correction Instruction
        </label>

        <textarea
          id="checkerInstruction"
          rows={6}
          maxLength={5000}
          value={
            checkerInstruction
          }
          onChange={(event) => {
            setCheckerInstruction(
              event.target.value,
            )
            setError('')
          }}
          placeholder="State exactly what the Import Officer must correct in the source extract. Do not edit the original BankSync upload. The corrected file must later be uploaded as a new linked version for automated verification."
          className="w-full resize-y rounded-xl border border-stone-200 p-3 text-sm text-stone-800 outline-none focus:border-violet-300"
        />

        <div className="mt-1 text-right text-xs text-stone-400">
          {
            checkerInstruction.length
          }
          /5000
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle
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
        <button
          type="button"
          onClick={
            handleRequestCorrection
          }
          disabled={
            loading ||
            submitting ||
            !selectedOfficerId ||
            checkerInstruction
              .trim()
              .length < 10
          }
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={17} />

          {submitting
            ? 'Creating Handoff...'
            : 'Assign Correction to Import Officer'}
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs leading-5 text-amber-800">
          This action does not reassign the Case and does not resolve the Data Quality issue. It creates a separate correction task while the approved Maker/Checker investigation remains preserved.
        </p>
      </div>
    </section>
  )
}

export default RequestDataCorrectionPanel
