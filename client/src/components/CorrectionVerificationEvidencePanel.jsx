import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileWarning,
  Loader2,
  RotateCcw,
  ShieldCheck,
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

function formatAmount(amount) {
  if (
    amount === null ||
    amount === undefined
  ) {
    return '—'
  }

  if (
    typeof amount === 'object' &&
    amount.$numberDecimal
  ) {
    return amount.$numberDecimal
  }

  return String(amount)
}

function recordChanged(
  original,
  corrected,
) {
  if (
    !original ||
    !corrected
  ) {
    return false
  }

  return (
    String(
      original.transactionId ||
        '',
    ) !==
      String(
        corrected.transactionId ||
          '',
      ) ||
    String(
      original.referenceNumber ||
        '',
    ) !==
      String(
        corrected.referenceNumber ||
          '',
      ) ||
    String(
      original.accountNumber ||
        '',
    ) !==
      String(
        corrected.accountNumber ||
          '',
      ) ||
    formatAmount(
      original.amount,
    ) !==
      formatAmount(
        corrected.amount,
      ) ||
    String(
      original.status ||
        '',
    ) !==
      String(
        corrected.status ||
          '',
      )
  )
}

function CorrectionVerificationEvidencePanel({
  caseRecord,
  currentUser,
}) {
  const [task, setTask] =
    useState(null)

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  const [
    rejectReason,
    setRejectReason,
  ] = useState('')

  const [
    rejecting,
    setRejecting,
  ] = useState(false)

  const [
    actionMessage,
    setActionMessage,
  ] = useState('')

  const isDataQualityCase =
    caseRecord?.originType ===
      'DATA_QUALITY_ISSUE' ||
    Boolean(
      caseRecord?.dataQualityIssueId &&
        !caseRecord?.exceptionId,
    )

  const canView =
    isDataQualityCase &&
    [
      'ADMIN',
      'OPERATIONS_MANAGER',
      'AUDITOR',
      'CHECKER',
      'IMPORT_OFFICER',
    ].includes(
      currentUser?.role,
    )

  useEffect(() => {
    if (
      !canView ||
      !caseRecord?._id
    ) {
      return
    }

    let cancelled = false

    const loadEvidence =
      async () => {
        setLoading(true)
        setError('')

        try {
          const response =
            await apiRequest(
              `/data-corrections/case/${caseRecord._id}`,
            )

          if (!cancelled) {
            setTask(
              response.data ||
                null,
            )
          }
        } catch (err) {
          if (!cancelled) {
            setError(
              err.message ||
                'Unable to load correction verification evidence.',
            )
          }
        } finally {
          if (!cancelled) {
            setLoading(false)
          }
        }
      }

    loadEvidence()

    return () => {
      cancelled = true
    }
  }, [
    canView,
    caseRecord?._id,
  ])

  const evidence =
    task?.verificationEvidence

  const originalRows =
    evidence
      ?.originalAffectedTransactions ||
    []

  const correctedRows =
    evidence
      ?.correctedTransactions ||
    []

  const comparisonRows =
    useMemo(() => {
      const usedCorrectedIds =
        new Set()

      return originalRows.map(
        (original) => {
          /*
           * Reference number is normally the
           * strongest stable link when a
           * duplicate transaction ID itself
           * was corrected.
           *
           * If reference changed instead,
           * transaction ID provides the
           * fallback link.
           */
          let corrected =
            correctedRows.find(
              (item) =>
                !usedCorrectedIds.has(
                  String(
                    item._id,
                  ),
                ) &&
                original.referenceNumber &&
                item.referenceNumber ===
                  original.referenceNumber,
            )

          if (!corrected) {
            corrected =
              correctedRows.find(
                (item) =>
                  !usedCorrectedIds.has(
                    String(
                      item._id,
                    ),
                  ) &&
                  original.transactionId &&
                  item.transactionId ===
                    original.transactionId,
              )
          }

          if (corrected?._id) {
            usedCorrectedIds.add(
              String(
                corrected._id,
              ),
            )
          }

          return {
            original,
            corrected:
              corrected || null,
            changed:
              recordChanged(
                original,
                corrected,
              ),
          }
        },
      )
    }, [
      originalRows,
      correctedRows,
    ])

  if (!canView) {
    return null
  }

  if (loading) {
    return (
      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2
            size={17}
            className="animate-spin"
          />
          Loading correction verification evidence...
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
        <div className="flex items-start gap-2">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0 text-red-600"
          />

          <p className="text-sm text-red-700">
            {error}
          </p>
        </div>
      </section>
    )
  }

  /*
   * No correction handoff exists yet.
   */
  if (!task) {
    return null
  }

  /*
   * Before a corrected upload exists there is
   * not yet verification evidence to compare.
   */
  if (!task.correctedUploadId) {
    return null
  }

  const passed =
    Boolean(
      evidence
        ?.verificationPassed,
    )

  const canRejectVerification =
    passed &&
    task?.status ===
      'VERIFIED_RESOLVED' &&
    caseRecord?.status ===
      'APPROVED' &&
    [
      'ADMIN',
      'OPERATIONS_MANAGER',
    ].includes(
      currentUser?.role,
    )

  const handleRejectVerification =
    async () => {
      setError('')
      setActionMessage('')

      if (
        rejectReason
          .trim()
          .length < 10
      ) {
        setError(
          'Explain why the corrected data is still operationally incorrect.',
        )
        return
      }

      setRejecting(true)

      try {
        const response =
          await apiRequest(
            `/data-corrections/${task._id}/reject-verification`,
            {
              method: 'POST',
              body: JSON.stringify({
                reason:
                  rejectReason.trim(),
              }),
            },
          )

        setTask(
          (current) => ({
            ...current,
            status:
              'VERIFICATION_FAILED',
            verificationFailureReason:
              rejectReason.trim(),
            verifiedAt: null,
            verificationEvidence: {
              ...current
                .verificationEvidence,
              verificationPassed:
                false,
              issue: current
                .verificationEvidence
                ?.issue
                ? {
                    ...current
                      .verificationEvidence
                      .issue,
                    status:
                      'VERIFICATION_FAILED',
                    verifiedResolvedAt:
                      null,
                  }
                : null,
            },
          }),
        )

        setActionMessage(
          response.message ||
            'Verification rejected and returned to the Import Officer.',
        )

        setRejectReason('')
      } catch (err) {
        setError(
          err.message ||
            'Unable to reject the correction verification.',
        )
      } finally {
        setRejecting(false)
      }
    }

  return (
    <section
      className={`mt-6 rounded-2xl border bg-white p-6 shadow-sm sm:p-8 ${
        passed
          ? 'border-emerald-200'
          : 'border-amber-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            passed
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-amber-50 text-amber-600'
          }`}
        >
          <ShieldCheck
            size={20}
          />
        </div>

        <div>
          <h2 className="font-semibold text-stone-900">
            Correction Verification Evidence
          </h2>

          <p className="mt-1 text-sm leading-6 text-stone-500">
            Review the immutable original defect beside the linked corrected upload and BankSync&apos;s automated verification result before final Case resolution.
          </p>
        </div>
      </div>

      {/* VERIFICATION RESULT */}
      <div
        className={`mt-6 rounded-xl border p-4 ${
          passed
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-amber-200 bg-amber-50'
        }`}
      >
        <div className="flex items-start gap-3">
          {passed ? (
            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0 text-emerald-600"
            />
          ) : (
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0 text-amber-600"
            />
          )}

          <div>
            <p
              className={`text-sm font-semibold ${
                passed
                  ? 'text-emerald-900'
                  : 'text-amber-900'
              }`}
            >
              {passed
                ? 'Automated verification passed'
                : 'Automated verification has not passed'}
            </p>

            <p
              className={`mt-1 text-xs leading-5 ${
                passed
                  ? 'text-emerald-800'
                  : 'text-amber-800'
              }`}
            >
              {passed
                ? `BankSync re-scanned the corrected upload and did not detect the original ${formatLabel(
                    evidence?.issue
                      ?.issueType,
                  )} defect for key ${
                    evidence?.issue
                      ?.keyValue ||
                    '—'
                  }.`
                : task.verificationFailureReason ||
                  'The correction is still awaiting successful verification.'}
            </p>
          </div>
        </div>
      </div>

      {/* UPLOAD VERSION CHAIN */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5">
          <div className="flex items-center gap-2">
            <FileWarning
              size={18}
              className="text-amber-600"
            />

            <p className="text-sm font-semibold text-stone-900">
              Original Upload
            </p>
          </div>

          <p className="mt-3 break-all text-sm font-semibold text-stone-900">
            {task.originalUploadId
              ?.originalName ||
              task.originalUploadId
                ?.fileName ||
              '—'}
          </p>

          <p className="mt-1 text-xs text-stone-500">
            {formatLabel(
              task.originalUploadId
                ?.status,
            )}
            {' · '}
            {task.originalUploadId
              ?.validRows ??
              '—'}{' '}
            valid
            {' · '}
            {task.originalUploadId
              ?.invalidRows ??
              '—'}{' '}
            rejected
          </p>

          <p className="mt-3 text-xs leading-5 text-amber-800">
            Preserved as immutable audit evidence.
          </p>
        </div>

        <div className="hidden items-center justify-center lg:flex">
          <ArrowRight
            size={22}
            className="text-stone-300"
          />
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
          <div className="flex items-center gap-2">
            <FileCheck2
              size={18}
              className="text-emerald-600"
            />

            <p className="text-sm font-semibold text-stone-900">
              Corrected Upload
            </p>
          </div>

          <p className="mt-3 break-all text-sm font-semibold text-stone-900">
            {task.correctedUploadId
              ?.originalName ||
              task.correctedUploadId
                ?.fileName ||
              '—'}
          </p>

          <p className="mt-1 text-xs text-stone-500">
            {formatLabel(
              task.correctedUploadId
                ?.status,
            )}
            {' · '}
            {task.correctedUploadId
              ?.validRows ??
              '—'}{' '}
            valid
            {' · '}
            {task.correctedUploadId
              ?.invalidRows ??
              '—'}{' '}
            rejected
          </p>

          <p className="mt-3 text-xs leading-5 text-emerald-800">
            Linked corrected version submitted through the approved correction task.
          </p>
        </div>
      </div>

      {/* VERIFICATION METADATA */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-stone-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
            Original Defect
          </p>

          <p className="mt-1 text-sm font-semibold text-stone-900">
            {formatLabel(
              evidence?.issue
                ?.issueType,
            )}
          </p>
        </div>

        <div className="rounded-xl bg-stone-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
            Detected Key
          </p>

          <p className="mt-1 font-mono text-sm font-semibold text-stone-900">
            {evidence?.issue
              ?.keyValue ||
              '—'}
          </p>
        </div>

        <div className="rounded-xl bg-stone-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
            Verification Status
          </p>

          <p
            className={`mt-1 text-sm font-semibold ${
              passed
                ? 'text-emerald-700'
                : 'text-amber-700'
            }`}
          >
            {formatLabel(
              evidence?.issue
                ?.status ||
                task.status,
            )}
          </p>
        </div>

        <div className="rounded-xl bg-stone-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
            Verified At
          </p>

          <p className="mt-1 text-sm font-semibold text-stone-900">
            {formatDate(
              task.verifiedAt ||
                evidence?.issue
                  ?.verifiedResolvedAt,
            )}
          </p>
        </div>
      </div>

      {/* BEFORE / AFTER TRANSACTION EVIDENCE */}
      <div className="mt-6">
        <h3 className="font-semibold text-stone-900">
          Affected Record Comparison
        </h3>

        <p className="mt-1 text-sm text-stone-500">
          Original affected rows remain unchanged. The corrected-side records come from the linked corrected upload.
        </p>

        {comparisonRows.length ===
        0 ? (
          <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">
            No row-level comparison evidence is available.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {comparisonRows.map(
              (
                row,
                index,
              ) => (
                <div
                  key={
                    row.original
                      ?._id ||
                    index
                  }
                  className="overflow-hidden rounded-xl border border-stone-200"
                >
                  <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-sm font-semibold text-stone-900">
                      Affected Record{' '}
                      {index + 1}
                    </p>

                    {row.corrected ? (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          row.changed
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {row.changed
                          ? 'Changed'
                          : 'Unchanged'}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        No linked corrected row
                      </span>
                    )}
                  </div>

                  <div className="grid lg:grid-cols-2">
                    <div className="border-b border-stone-200 p-4 lg:border-b-0 lg:border-r">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                        Original
                      </p>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <Value
                          label="Transaction ID"
                          value={
                            row.original
                              ?.transactionId
                          }
                        />

                        <Value
                          label="Reference"
                          value={
                            row.original
                              ?.referenceNumber
                          }
                        />

                        <Value
                          label="Account"
                          value={
                            row.original
                              ?.accountNumber
                          }
                        />

                        <Value
                          label="Amount"
                          value={formatAmount(
                            row.original
                              ?.amount,
                          )}
                        />

                        <Value
                          label="Date"
                          value={formatDate(
                            row.original
                              ?.transactionDate,
                          )}
                        />

                        <Value
                          label="Status"
                          value={
                            row.original
                              ?.status
                          }
                        />
                      </div>
                    </div>

                    <div className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                        Corrected
                      </p>

                      {row.corrected ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <Value
                            label="Transaction ID"
                            value={
                              row.corrected
                                ?.transactionId
                            }
                            changed={
                              String(
                                row.original
                                  ?.transactionId ||
                                  '',
                              ) !==
                              String(
                                row.corrected
                                  ?.transactionId ||
                                  '',
                              )
                            }
                          />

                          <Value
                            label="Reference"
                            value={
                              row.corrected
                                ?.referenceNumber
                            }
                            changed={
                              String(
                                row.original
                                  ?.referenceNumber ||
                                  '',
                              ) !==
                              String(
                                row.corrected
                                  ?.referenceNumber ||
                                  '',
                              )
                            }
                          />

                          <Value
                            label="Account"
                            value={
                              row.corrected
                                ?.accountNumber
                            }
                            changed={
                              String(
                                row.original
                                  ?.accountNumber ||
                                  '',
                              ) !==
                              String(
                                row.corrected
                                  ?.accountNumber ||
                                  '',
                              )
                            }
                          />

                          <Value
                            label="Amount"
                            value={formatAmount(
                              row.corrected
                                ?.amount,
                            )}
                            changed={
                              formatAmount(
                                row.original
                                  ?.amount,
                              ) !==
                              formatAmount(
                                row.corrected
                                  ?.amount,
                              )
                            }
                          />

                          <Value
                            label="Date"
                            value={formatDate(
                              row.corrected
                                ?.transactionDate,
                            )}
                          />

                          <Value
                            label="Status"
                            value={
                              row.corrected
                                ?.status
                            }
                            changed={
                              String(
                                row.original
                                  ?.status ||
                                  '',
                              ) !==
                              String(
                                row.corrected
                                  ?.status ||
                                  '',
                              )
                            }
                          />
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-stone-500">
                          No corresponding corrected transaction was found using the original transaction ID/reference evidence.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>

      {canRejectVerification && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50/40 p-5">
          <div className="flex items-start gap-3">
            <RotateCcw
              size={19}
              className="mt-0.5 shrink-0 text-red-600"
            />

            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">
                Final operational review
              </p>

              <p className="mt-1 text-xs leading-5 text-red-700">
                The automated Data Quality rule passed, but Admin/Operations must still confirm that the corrected values are authoritative. If the before/after comparison is wrong, reject this verification and return the correction task to the Import Officer.
              </p>

              <textarea
                rows={4}
                maxLength={3000}
                value={rejectReason}
                onChange={(event) => {
                  setRejectReason(
                    event.target.value,
                  )
                  setError('')
                  setActionMessage('')
                }}
                placeholder="Example: Corrected transaction ID DQ2005 is still paired with reference DQREF2002. The authoritative corrected sequence requires DQ2005 to pair with DQREF2005."
                className="mt-4 w-full resize-y rounded-xl border border-red-200 bg-white p-3 text-sm text-stone-800 outline-none focus:border-red-300"
              />

              <button
                type="button"
                onClick={
                  handleRejectVerification
                }
                disabled={
                  rejecting ||
                  rejectReason
                    .trim()
                    .length < 10
                }
                className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw
                  size={16}
                />

                {rejecting
                  ? 'Returning...'
                  : 'Reject Verification & Return to Import Officer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionMessage && (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {actionMessage}
        </div>
      )}

      {evidence?.repeatedIssue && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">
            Original defect is still detected
          </p>

          <p className="mt-1 text-xs leading-5 text-red-700">
            BankSync found the same issue type and detected key in the corrected upload. Final Case resolution should remain blocked.
          </p>
        </div>
      )}
    </section>
  )
}

function Value({
  label,
  value,
  changed = false,
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        changed
          ? 'border-blue-200 bg-blue-50'
          : 'border-stone-200 bg-white'
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
        {label}
      </p>

      <p
        className={`mt-1 break-all text-sm font-semibold ${
          changed
            ? 'text-blue-800'
            : 'text-stone-800'
        }`}
      >
        {value ??
          '—'}
      </p>
    </div>
  )
}

export default CorrectionVerificationEvidencePanel
