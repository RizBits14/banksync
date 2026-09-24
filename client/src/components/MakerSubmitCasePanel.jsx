import { useMemo, useState } from 'react'

import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Send,
  ShieldCheck,
} from 'lucide-react'

import { apiRequest } from '../services/api'

function hasText(value) {
  return (
    typeof value === 'string' &&
    value.trim().length > 0
  )
}

function MakerSubmitCasePanel({
  caseRecord,
  currentUser,
  onCaseUpdated,
}) {
  const [submitting, setSubmitting] =
    useState(false)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const [serverMissing, setServerMissing] =
    useState([])

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

  const canView =
    isAssignedMaker &&
    caseRecord?.status ===
      'UNDER_INVESTIGATION'

  const checklist =
    caseRecord?.investigationChecklist ||
    {}

  /*
   * ----------------------------------------
   * CASE ORIGIN
   * ----------------------------------------
   *
   * BankSync remains a reconciliation
   * platform.
   *
   * Reconciliation exception cases:
   * Source ↔ Target reconciliation evidence.
   *
   * Data Quality cases:
   * Pre-reconciliation banking-data integrity
   * evidence that must be corrected/verified
   * before the dataset is reconciliation-ready.
   */
  const isDataQualityCase =
    caseRecord?.originType ===
      'DATA_QUALITY_ISSUE' ||
    Boolean(
      caseRecord?.dataQualityIssueId &&
        !caseRecord?.exceptionId,
    )

  /*
   * ----------------------------------------
   * RECONCILIATION CONTEXT
   * ----------------------------------------
   */
  const exception =
    caseRecord?.exceptionId

  const reconciliation =
    exception?.reconciliationId

  const sourceUpload =
    reconciliation?.sourceUploadId

  const targetUpload =
    reconciliation?.targetUploadId

  const sourceInvalidRows =
    Number(
      sourceUpload?.invalidRows || 0,
    )

  const targetInvalidRows =
    Number(
      targetUpload?.invalidRows || 0,
    )

  /*
   * ----------------------------------------
   * DATA QUALITY CONTEXT
   * ----------------------------------------
   */
  const dataQualityIssue =
    caseRecord?.dataQualityIssueId

  const originalUpload =
    caseRecord?.originalUploadId ||
    dataQualityIssue?.uploadId

  const originalInvalidRows =
    Number(
      originalUpload?.invalidRows || 0,
    )

  /*
   * ----------------------------------------
   * REJECTED ROW RULE
   * ----------------------------------------
   *
   * Reconciliation case:
   * rejected rows on either side matter.
   *
   * Data Quality case:
   * only the original uploaded banking
   * dataset exists at this stage.
   */
  const rejectedRowsReviewRequired =
    isDataQualityCase
      ? originalInvalidRows > 0
      : sourceInvalidRows > 0 ||
        targetInvalidRows > 0

  /*
   * ----------------------------------------
   * SUBMISSION READINESS
   * ----------------------------------------
   *
   * This mirrors the backend submitCase()
   * requirements exactly.
   */
  const readinessItems = useMemo(() => {
    const items =
      isDataQualityCase
        ? [
            {
              key:
                'sourceDatasetReviewed',
              label:
                'Original uploaded dataset reviewed',
              complete:
                Boolean(
                  checklist
                    ?.sourceDatasetReviewed,
                ),
            },

            {
              key:
                'accountChecked',
              label:
                'Affected account data checked',
              complete:
                Boolean(
                  checklist?.accountChecked,
                ),
            },

            {
              key:
                'referenceChecked',
              label:
                'Reference data checked',
              complete:
                Boolean(
                  checklist
                    ?.referenceChecked,
                ),
            },

            {
              key:
                'amountChecked',
              label:
                'Amount data checked',
              complete:
                Boolean(
                  checklist?.amountChecked,
                ),
            },

            {
              key:
                'transactionDateChecked',
              label:
                'Transaction dates checked',
              complete:
                Boolean(
                  checklist
                    ?.transactionDateChecked,
                ),
            },

            {
              key:
                'duplicateSearchPerformed',
              label:
                dataQualityIssue
                  ?.issueType ===
                  'DUPLICATE_TRANSACTION_ID'
                  ? 'Duplicate transaction-ID evidence reviewed'
                  : dataQualityIssue
                        ?.issueType ===
                      'DUPLICATE_REFERENCE'
                    ? 'Duplicate reference evidence reviewed'
                    : dataQualityIssue
                          ?.issueType ===
                          'REVERSAL_WITHOUT_ORIGINAL' ||
                        dataQualityIssue
                          ?.issueType ===
                          'REVERSAL_AMOUNT_MISMATCH'
                      ? 'Original / reversal relationship searched'
                      : 'Related-record search performed',
              complete:
                Boolean(
                  checklist
                    ?.duplicateSearchPerformed,
                ),
            },
          ]
        : [
            {
              key:
                'sourceDatasetReviewed',
              label:
                'Source dataset reviewed',
              complete:
                Boolean(
                  checklist
                    ?.sourceDatasetReviewed,
                ),
            },

            {
              key:
                'targetDatasetReviewed',
              label:
                'Target dataset reviewed',
              complete:
                Boolean(
                  checklist
                    ?.targetDatasetReviewed,
                ),
            },

            {
              key: 'accountChecked',
              label: 'Account checked',
              complete:
                Boolean(
                  checklist?.accountChecked,
                ),
            },

            {
              key:
                'referenceChecked',
              label: 'Reference checked',
              complete:
                Boolean(
                  checklist
                    ?.referenceChecked,
                ),
            },

            {
              key: 'amountChecked',
              label: 'Amount checked',
              complete:
                Boolean(
                  checklist?.amountChecked,
                ),
            },

            {
              key:
                'transactionDateChecked',
              label:
                'Transaction date checked',
              complete:
                Boolean(
                  checklist
                    ?.transactionDateChecked,
                ),
            },

            {
              key:
                'duplicateSearchPerformed',
              label:
                'Duplicate search performed',
              complete:
                Boolean(
                  checklist
                    ?.duplicateSearchPerformed,
                ),
            },
          ]

    if (
      rejectedRowsReviewRequired
    ) {
      items.push({
        key: 'rejectedRowsReviewed',

        label: isDataQualityCase
          ? 'Rejected rows from original upload reviewed'
          : 'Rejected rows reviewed',

        complete:
          Boolean(
            checklist
              ?.rejectedRowsReviewed,
          ),
      })
    }

    items.push(
      {
        key: 'rootCauseCategory',
        label: 'Root cause category',
        complete:
          hasText(
            caseRecord
              ?.rootCauseCategory,
          ),
      },

      {
        key: 'rootCauseDetails',
        label: 'Root cause details',
        complete:
          hasText(
            caseRecord
              ?.rootCauseDetails,
          ),
      },

      {
        key: 'investigationNotes',
        label:
          'Investigation findings',
        complete:
          hasText(
            caseRecord
              ?.investigationNotes,
          ),
      },

      {
        key: 'evidenceSummary',
        label: 'Evidence summary',
        complete:
          hasText(
            caseRecord
              ?.evidenceSummary,
          ),
      },

      {
        key: 'proposedAction',
        label: 'Proposed action',
        complete:
          hasText(
            caseRecord
              ?.proposedAction,
          ),
      },

      {
        key: 'proposedResolution',
        label: isDataQualityCase
          ? 'Recommended remediation details'
          : 'Resolution details',
        complete:
          hasText(
            caseRecord
              ?.proposedResolution,
          ),
      },
    )

    return items
  }, [
    caseRecord,
    checklist,
    dataQualityIssue,
    isDataQualityCase,
    rejectedRowsReviewRequired,
  ])

  if (!canView) {
    return null
  }

  const completedCount =
    readinessItems.filter(
      (item) => item.complete,
    ).length

  const totalCount =
    readinessItems.length

  const missingItems =
    readinessItems.filter(
      (item) => !item.complete,
    )

  const isReady =
    missingItems.length === 0

  const progressPercent =
    totalCount > 0
      ? Math.round(
          (completedCount /
            totalCount) *
            100,
        )
      : 0

  const handleSubmit = async () => {
    setError('')
    setSuccess('')
    setServerMissing([])

    if (!isReady) {
      setError(
        'Complete all required investigation items before submitting the case.',
      )

      return
    }

    setSubmitting(true)

    try {
      const response =
        await apiRequest(
          `/cases/${caseRecord._id}/submit`,
          {
            method: 'POST',
          },
        )

      setSuccess(
        response.message ||
          'Case submitted for Checker approval.',
      )

      if (onCaseUpdated) {
        await onCaseUpdated()
      }
    } catch (err) {
      const backendMissing =
        err?.data
          ?.missingRequirements ||
        []

      if (
        Array.isArray(
          backendMissing,
        )
      ) {
        setServerMissing(
          backendMissing,
        )
      }

      setError(
        err.message ||
          'Unable to submit case.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <Send size={19} />
        </div>

        <div>
          <h2 className="font-semibold text-stone-900">
            Submit for Checker Review
          </h2>

          <p className="mt-1 text-sm leading-6 text-stone-500">
            {isDataQualityCase
              ? 'Confirm that the pre-reconciliation data-integrity investigation is complete before sending the case for independent Checker review.'
              : 'Confirm that the reconciliation investigation is complete before sending the case for independent Checker review.'}
          </p>
        </div>
      </div>

      {/* READINESS SUMMARY */}
      <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50/60 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                isReady
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-amber-50 text-amber-600'
              }`}
            >
              <ShieldCheck
                size={18}
              />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-stone-900">
                Submission Readiness
              </h3>

              <p className="mt-1 text-sm text-stone-500">
                {completedCount} of{' '}
                {totalCount} required
                items complete.
              </p>

              {isDataQualityCase && (
                <p className="mt-1 text-xs leading-5 text-stone-400">
                  These checks confirm
                  the Maker has reviewed
                  the original banking
                  data and documented
                  what must happen before
                  the dataset can be
                  treated as
                  reconciliation-ready.
                </p>
              )}
            </div>
          </div>

          <div
            className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${
              isReady
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            {isReady
              ? 'Ready for Checker Review'
              : `${missingItems.length} item${
                  missingItems.length ===
                  1
                    ? ''
                    : 's'
                } remaining`}
          </div>
        </div>

        {/* PROGRESS */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">
              Investigation completion
            </span>

            <span className="text-xs font-semibold text-stone-700">
              {progressPercent}%
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-stone-200">
            <div
              className={`h-full rounded-full transition-all ${
                isReady
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              }`}
              style={{
                width: `${progressPercent}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* READINESS CHECKLIST */}
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {readinessItems.map(
          (item) => (
            <div
              key={item.key}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                item.complete
                  ? 'border-emerald-200 bg-emerald-50/60'
                  : 'border-stone-200 bg-white'
              }`}
            >
              {item.complete ? (
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />
              ) : (
                <Circle
                  size={18}
                  className="mt-0.5 shrink-0 text-stone-300"
                />
              )}

              <div>
                <p
                  className={`text-sm font-medium ${
                    item.complete
                      ? 'text-emerald-800'
                      : 'text-stone-700'
                  }`}
                >
                  {item.label}
                </p>

                {!item.complete && (
                  <p className="mt-1 text-xs text-stone-400">
                    Required before
                    submission
                  </p>
                )}
              </div>
            </div>
          ),
        )}
      </div>

      {/* REJECTED ROW CONTEXT */}
      {rejectedRowsReviewRequired && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={17}
              className="mt-0.5 shrink-0 text-amber-600"
            />

            <div>
              <p className="text-sm font-medium text-amber-800">
                Rejected-row review is
                required for this case.
              </p>

              {isDataQualityCase ? (
                <p className="mt-1 text-xs leading-5 text-amber-700">
                  Original upload
                  rejected rows:{' '}
                  {
                    originalInvalidRows
                  }.
                  Review them to confirm
                  that related evidence
                  was not excluded during
                  validation.
                </p>
              ) : (
                <p className="mt-1 text-xs leading-5 text-amber-700">
                  Source rejected rows:{' '}
                  {sourceInvalidRows}.
                  Target rejected rows:{' '}
                  {targetInvalidRows}.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FRONTEND MISSING ITEMS */}
      {!isReady && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-sm font-semibold text-amber-800">
            Complete before submission
          </p>

          <div className="mt-2 space-y-1">
            {missingItems.map(
              (item) => (
                <div
                  key={
                    item.key
                  }
                  className="flex items-center gap-2 text-sm text-amber-700"
                >
                  <Circle
                    size={12}
                    className="shrink-0"
                  />

                  <span>
                    {item.label}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* BACKEND VALIDATION */}
      {serverMissing.length >
        0 && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-4">
          <p className="text-sm font-semibold text-red-800">
            Server validation found
            missing requirements
          </p>

          <div className="mt-2 space-y-1">
            {serverMissing.map(
              (item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 text-sm text-red-700"
                >
                  <AlertCircle
                    size={14}
                    className="shrink-0"
                  />

                  <span>
                    {item}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* FINAL ACTION */}
      <div className="mt-6 flex flex-col gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {isReady ? (
            <p className="text-sm font-medium text-emerald-700">
              {isDataQualityCase
                ? 'Data-integrity investigation complete. This case is ready for independent Checker review.'
                : 'Investigation complete. This case is ready for Checker review.'}
            </p>
          ) : (
            <p className="text-sm text-stone-500">
              Complete the outstanding
              investigation requirements
              to enable submission.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            submitting ||
            !isReady
          }
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={17} />

          {submitting
            ? 'Submitting...'
            : 'Submit to Checker'}
        </button>
      </div>

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

export default MakerSubmitCasePanel
