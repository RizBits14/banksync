import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  ArrowLeft,
  BriefcaseBusiness,
  CircleAlert,
  Database,
  FileWarning,
  UserRound,
} from 'lucide-react'

import {
  Link,
  useParams,
} from 'react-router-dom'

import { apiRequest } from '../services/api'

import CaseAssignmentPanel from '../components/CaseAssignmentPanel.jsx'
import MakerInvestigationPanel from '../components/MakerInvestigationPanel.jsx'
import MakerInvestigationForm from '../components/MakerInvestigationForm.jsx'
import MakerSubmitCasePanel from '../components/MakerSubmitCasePanel.jsx'
import CheckerReviewPanel from '../components/CheckerReviewPanel.jsx'
import CaseReconciliationContext from '../components/CaseReconciliationContext.jsx'
import CaseDatasetInspector from '../components/CaseDatasetInspector.jsx'
import CaseTransactionComparison from '../components/CaseTransactionComparison.jsx'
import CaseResultScoring from '../components/CaseResultScoring.jsx'
import CaseHistoryTimeline from '../components/CaseHistoryTimeline.jsx'
import CaseResolutionPanel from '../components/CaseResolutionPanel.jsx'
import RequestDataCorrectionPanel from '../components/RequestDataCorrectionPanel.jsx'
import CorrectionVerificationEvidencePanel from '../components/CorrectionVerificationEvidencePanel.jsx'

function formatLabel(value) {
  if (!value) return '—'

  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    )
}

function formatDate(dateString) {
  if (!dateString) return '—'

  return new Date(
    dateString,
  ).toLocaleString()
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

function getDataQualityStatusClasses(status) {
  if (status === 'VERIFIED_RESOLVED') {
    return 'bg-emerald-50 text-emerald-700'
  }

  if (status === 'VERIFICATION_FAILED') {
    return 'bg-red-50 text-red-700'
  }

  if (
    status === 'CORRECTION_REQUIRED' ||
    status === 'PENDING_VERIFICATION'
  ) {
    return 'bg-violet-50 text-violet-700'
  }

  if (status === 'UNDER_REVIEW') {
    return 'bg-blue-50 text-blue-700'
  }

  if (status === 'OPEN') {
    return 'bg-amber-50 text-amber-700'
  }

  return 'bg-stone-100 text-stone-700'
}

function getAffectedTransactions(issue) {
  if (!issue) return []

  if (
    Array.isArray(
      issue.relatedTransactionIds,
    ) &&
    issue.relatedTransactionIds.length > 0
  ) {
    return issue.relatedTransactionIds
  }

  if (issue.primaryTransactionId) {
    return [issue.primaryTransactionId]
  }

  return []
}

function getPriorityClasses(priority) {
  if (priority === 'CRITICAL') {
    return 'bg-red-100 text-red-700'
  }

  if (priority === 'HIGH') {
    return 'bg-orange-50 text-orange-700'
  }

  if (priority === 'MEDIUM') {
    return 'bg-amber-50 text-amber-700'
  }

  return 'bg-stone-100 text-stone-600'
}

function getStatusClasses(status) {
  if (
    status === 'APPROVED' ||
    status === 'RESOLVED' ||
    status === 'CLOSED'
  ) {
    return 'bg-emerald-50 text-emerald-700'
  }

  if (
    status ===
    'PENDING_CHECKER_APPROVAL'
  ) {
    return 'bg-violet-50 text-violet-700'
  }

  if (
    status ===
    'UNDER_INVESTIGATION' ||
    status === 'ASSIGNED'
  ) {
    return 'bg-amber-50 text-amber-700'
  }

  if (
    status ===
    'RETURNED_TO_MAKER'
  ) {
    return 'bg-red-50 text-red-700'
  }

  return 'bg-stone-100 text-stone-700'
}

function CaseDetailsPage() {
  const { id } = useParams()

  const [
    caseRecord,
    setCaseRecord,
  ] = useState(null)

  const [
    currentUser,
    setCurrentUser,
  ] = useState(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const loadCase =
    useCallback(async () => {
      const response =
        await apiRequest(
          `/cases/${id}`,
        )

      setCaseRecord(
        response.data,
      )
    }, [id])

  useEffect(() => {
    const loadPageData =
      async () => {
        setLoading(true)
        setError('')

        try {
          const [
            caseResponse,
            meResponse,
          ] =
            await Promise.all([
              apiRequest(
                `/cases/${id}`,
              ),
              apiRequest(
                '/auth/me',
              ),
            ])

          setCaseRecord(
            caseResponse.data,
          )

          setCurrentUser(
            meResponse.data,
          )
        } catch (err) {
          setError(
            err.message,
          )
        } finally {
          setLoading(false)
        }
      }

    loadPageData()
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-medium text-stone-500">
          Loading case details...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-5 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl">
          <Link
            to="/cases"
            className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition hover:text-stone-900"
          >
            <ArrowLeft size={17} />
            Back to cases
          </Link>

          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        </div>
      </div>
    )
  }

  const isDataQualityCase =
    caseRecord?.originType ===
    'DATA_QUALITY_ISSUE'

  const exception =
    caseRecord?.exceptionId

  const transaction =
    exception?.transactionId

  const dataQualityIssue =
    caseRecord?.dataQualityIssueId

  const originalUpload =
    caseRecord?.originalUploadId ||
    dataQualityIssue?.uploadId

  const affectedTransactions =
    getAffectedTransactions(
      dataQualityIssue,
    )

  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/cases"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition hover:text-stone-900"
        >
          <ArrowLeft size={17} />
          Back to cases
        </Link>

        {/* CASE HEADER */}
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <BriefcaseBusiness
                  size={22}
                />
              </div>

              <div>
                <p className="text-sm font-medium text-amber-600">
                  {isDataQualityCase
                    ? 'Pre-Reconciliation Data Integrity Case'
                    : 'Reconciliation Exception Case'}
                </p>

                <h1 className="mt-1 text-2xl font-semibold text-stone-900">
                  Case Details
                </h1>

                <p className="mt-2 text-sm text-stone-500">
                  ID: {caseRecord?._id}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
                {isDataQualityCase
                  ? 'Data Integrity Origin'
                  : 'Reconciliation Origin'}
              </span>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPriorityClasses(
                  caseRecord?.priority,
                )}`}
              >
                {formatLabel(
                  caseRecord?.priority,
                )}
              </span>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                  caseRecord?.status,
                )}`}
              >
                {formatLabel(
                  caseRecord?.status,
                )}
              </span>
            </div>
          </div>
        </section>

        {/* ADMIN / OPERATIONS ASSIGNMENT */}
        <CaseAssignmentPanel
          caseRecord={caseRecord}
          currentUser={currentUser}
          onCaseUpdated={loadCase}
        />

        {/* DATASET INVESTIGATION - BOTH CASE ORIGINS */}
        <CaseDatasetInspector
          caseRecord={caseRecord}
        />

        {isDataQualityCase ? (
          <>
            {/* PRE-RECONCILIATION DATA INTEGRITY EVIDENCE */}
            <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <FileWarning
                    size={20}
                  />
                </div>

                <div>
                  <h2 className="font-semibold text-stone-900">
                    Pre-Reconciliation Data Integrity Evidence
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-stone-500">
                    BankSync detected a transaction-data integrity issue in an
                    uploaded banking dataset. This case investigates the defect
                    before corrected data is treated as reconciliation-ready.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl bg-stone-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Issue Type
                  </p>

                  <p className="mt-2 text-sm font-semibold text-stone-900">
                    {formatLabel(
                      dataQualityIssue?.issueType,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-stone-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Severity
                  </p>

                  <p className="mt-2 text-sm font-semibold text-stone-900">
                    {formatLabel(
                      dataQualityIssue?.severity,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-stone-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Data Quality Workflow
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getDataQualityStatusClasses(
                      dataQualityIssue?.status,
                    )}`}
                  >
                    {formatLabel(
                      dataQualityIssue?.status,
                    )}
                  </span>
                </div>

                <div className="rounded-xl border border-stone-200 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Source System
                  </p>

                  <p className="mt-2 text-sm font-medium text-stone-800">
                    {dataQualityIssue?.sourceSystem ||
                      originalUpload?.sourceSystem ||
                      '—'}
                  </p>
                </div>

                <div className="rounded-xl border border-stone-200 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Detected Key
                  </p>

                  <p className="mt-2 break-all font-mono text-sm text-stone-800">
                    {dataQualityIssue?.keyValue ||
                      '—'}
                  </p>
                </div>

                <div className="rounded-xl border border-stone-200 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Review Started
                  </p>

                  <p className="mt-2 text-sm text-stone-700">
                    {formatDate(
                      dataQualityIssue?.reviewStartedAt,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-stone-200 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  Detected Problem
                </p>

                <p className="mt-2 text-sm leading-6 text-stone-700">
                  {dataQualityIssue?.description ||
                    'No issue description is available.'}
                </p>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-stone-200 p-4">
                  <div className="flex items-center gap-2">
                    <Database
                      size={17}
                      className="text-stone-500"
                    />

                    <p className="text-sm font-semibold text-stone-900">
                      Original Uploaded Dataset
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                        File
                      </p>

                      <p className="mt-1 break-all text-sm font-medium text-stone-800">
                        {originalUpload?.originalName ||
                          originalUpload?.fileName ||
                          '—'}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                          Upload Status
                        </p>

                        <p className="mt-1 text-sm text-stone-700">
                          {formatLabel(
                            originalUpload?.status,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                          Source System
                        </p>

                        <p className="mt-1 text-sm text-stone-700">
                          {originalUpload?.sourceSystem ||
                            '—'}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                          Total Rows
                        </p>

                        <p className="mt-1 text-sm font-medium text-stone-800">
                          {originalUpload?.totalRows ??
                            '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                          Valid Rows
                        </p>

                        <p className="mt-1 text-sm font-medium text-stone-800">
                          {originalUpload?.validRows ??
                            '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                          Invalid Rows
                        </p>

                        <p className="mt-1 text-sm font-medium text-stone-800">
                          {originalUpload?.invalidRows ??
                            '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">
                    Reconciliation Relevance
                  </p>

                  <p className="mt-2 text-sm leading-6 text-amber-800">
                    This investigation supports BankSync&apos;s reconciliation
                    controls. The Maker determines the cause of the source-data
                    defect, the Checker independently reviews the proposed
                    remediation, and any corrected upload must later be verified
                    before it becomes the trusted version for future
                    reconciliation work.
                  </p>
                </div>
              </div>
            </section>

            {/* AFFECTED TRANSACTION RECORDS */}
            <section className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="border-b border-stone-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <CircleAlert
                    size={20}
                    className="text-amber-600"
                  />

                  <div>
                    <h2 className="font-semibold text-stone-900">
                      Affected Transaction Records
                    </h2>

                    <p className="mt-1 text-sm text-stone-500">
                      Banking transaction records involved in the detected data
                      integrity issue.
                    </p>
                  </div>
                </div>
              </div>

              {affectedTransactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-stone-50">
                      <tr className="text-left text-xs font-medium uppercase tracking-wide text-stone-400">
                        <th className="px-5 py-3">
                          Transaction ID
                        </th>
                        <th className="px-5 py-3">
                          Reference
                        </th>
                        <th className="px-5 py-3">
                          Account
                        </th>
                        <th className="px-5 py-3">
                          Amount
                        </th>
                        <th className="px-5 py-3">
                          Date
                        </th>
                        <th className="px-5 py-3">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-stone-100">
                      {affectedTransactions.map(
                        (item, index) => (
                          <tr
                            key={
                              item?._id ||
                              `${item?.transactionId || 'transaction'}-${index}`
                            }
                            className="text-sm"
                          >
                            <td className="px-5 py-4 font-medium text-stone-900">
                              {item?.transactionId ||
                                '—'}
                            </td>

                            <td className="px-5 py-4 text-stone-600">
                              {item?.referenceNumber ||
                                '—'}
                            </td>

                            <td className="px-5 py-4 text-stone-600">
                              {item?.accountNumber ||
                                '—'}
                            </td>

                            <td className="px-5 py-4 text-stone-600">
                              {formatAmount(
                                item?.amount,
                              )}
                            </td>

                            <td className="px-5 py-4 text-stone-600">
                              {formatDate(
                                item?.transactionDate,
                              )}
                            </td>

                            <td className="px-5 py-4 text-stone-600">
                              {item?.status ||
                                '—'}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-8 text-sm text-stone-500">
                  No affected transaction records are available for this issue.
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            {/* EXISTING RECONCILIATION EXCEPTION + TRANSACTION */}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <CircleAlert
                    size={20}
                    className="text-amber-600"
                  />

                  <h2 className="font-semibold text-stone-900">
                    Exception
                  </h2>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                      Type
                    </p>

                    <p className="mt-1 text-sm font-medium text-stone-800">
                      {formatLabel(
                        exception?.exceptionType,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                      Reason
                    </p>

                    {exception?.reasons?.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {exception.reasons.map(
                          (reason, index) => (
                            <p
                              key={index}
                              className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600"
                            >
                              {reason}
                            </p>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-stone-400">
                        —
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <h2 className="font-semibold text-stone-900">
                  Transaction
                </h2>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                      Transaction ID
                    </p>

                    <p className="mt-1 text-sm font-medium text-stone-800">
                      {transaction?.transactionId ||
                        '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                      System
                    </p>

                    <p className="mt-1 text-sm text-stone-700">
                      {transaction?.sourceSystem ||
                        '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                      Amount
                    </p>

                    <p className="mt-1 text-sm text-stone-700">
                      {formatAmount(
                        transaction?.amount,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                      Status
                    </p>

                    <p className="mt-1 text-sm text-stone-700">
                      {transaction?.status ||
                        '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                      Reference
                    </p>

                    <p className="mt-1 text-sm text-stone-700">
                      {transaction?.referenceNumber ||
                        '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                      Account
                    </p>

                    <p className="mt-1 text-sm text-stone-700">
                      {transaction?.accountNumber ||
                        '—'}
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                      Transaction Date
                    </p>

                    <p className="mt-1 text-sm text-stone-700">
                      {formatDate(
                        transaction?.transactionDate,
                      )}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}

        {/* START INVESTIGATION */}
        <MakerInvestigationPanel
          caseRecord={caseRecord}
          currentUser={currentUser}
          onCaseUpdated={loadCase}
        />

        {/* INVESTIGATION WORKSPACE */}
        <MakerInvestigationForm
          caseRecord={caseRecord}
          currentUser={currentUser}
          onCaseUpdated={loadCase}
        />

        {!isDataQualityCase && (
          <>
            {/* RECONCILIATION CONTEXT */}
            <CaseReconciliationContext
              caseRecord={caseRecord}
            />

            {/* TRANSACTION COMPARISON */}
            <CaseTransactionComparison
              caseRecord={caseRecord}
            />

            {/* RECONCILIATION RESULT */}
            <CaseResultScoring
              caseRecord={caseRecord}
            />
          </>
        )}

        {/* ASSIGNMENT & INVESTIGATION SUMMARY */}
        <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <UserRound
                size={20}
              />
            </div>

            <div>
              <h2 className="font-semibold text-stone-900">
                Assignment & Investigation Summary
              </h2>

              <p className="mt-1 text-sm leading-6 text-stone-500">
                Review the completed investigation before the case moves to
                Checker review.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Assigned To
              </p>

              <p className="mt-1 text-sm font-medium text-stone-800">
                {caseRecord
                  ?.assignedTo
                  ?.name ||
                  'Unassigned'}
              </p>

              <p className="mt-1 text-xs text-stone-400">
                {caseRecord
                  ?.assignedTo
                  ?.email ||
                  ''}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Assigned By
              </p>

              <p className="mt-1 text-sm text-stone-700">
                {caseRecord
                  ?.assignedBy
                  ?.name ||
                  '—'}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Assigned At
              </p>

              <p className="mt-1 text-sm text-stone-700">
                {formatDate(
                  caseRecord
                    ?.assignedAt,
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Investigation Started
              </p>

              <p className="mt-1 text-sm text-stone-700">
                {formatDate(
                  caseRecord
                    ?.investigationStartedAt,
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Root Cause
              </p>

              <p className="mt-1 text-sm font-medium text-stone-800">
                {formatLabel(
                  caseRecord
                    ?.rootCauseCategory,
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Proposed Action
              </p>

              <p className="mt-1 text-sm font-medium text-stone-800">
                {formatLabel(
                  caseRecord
                    ?.proposedAction,
                )}
              </p>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Root Cause Details
              </p>

              <p className="mt-2 whitespace-pre-wrap rounded-xl bg-stone-50 p-4 text-sm leading-6 text-stone-600">
                {caseRecord
                  ?.rootCauseDetails ||
                  'No root cause details recorded yet.'}
              </p>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Investigation Findings
              </p>

              <p className="mt-2 whitespace-pre-wrap rounded-xl bg-stone-50 p-4 text-sm leading-6 text-stone-600">
                {caseRecord
                  ?.investigationNotes ||
                  'No investigation findings recorded yet.'}
              </p>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Evidence Summary
              </p>

              <p className="mt-2 whitespace-pre-wrap rounded-xl bg-stone-50 p-4 text-sm leading-6 text-stone-600">
                {caseRecord
                  ?.evidenceSummary ||
                  'No evidence summary recorded yet.'}
              </p>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Resolution Details
              </p>

              <p className="mt-2 whitespace-pre-wrap rounded-xl bg-stone-50 p-4 text-sm leading-6 text-stone-600">
                {caseRecord
                  ?.proposedResolution ||
                  'No resolution details recorded yet.'}
              </p>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Checker Comment
              </p>

              <p className="mt-2 whitespace-pre-wrap rounded-xl bg-stone-50 p-4 text-sm leading-6 text-stone-600">
                {caseRecord
                  ?.checkerComment ||
                  'No Checker comment yet.'}
              </p>
            </div>
          </div>
        </section>



        {/* FINAL MAKER ACTION */}
        <MakerSubmitCasePanel
          caseRecord={caseRecord}
          currentUser={currentUser}
          onCaseUpdated={loadCase}
        />

        {/* CHECKER ACTION */}
        <CheckerReviewPanel
          caseRecord={caseRecord}
          currentUser={currentUser}
          onCaseUpdated={loadCase}
        />

        {/* CHECKER -> IMPORT OFFICER DATA CORRECTION HANDOFF */}
        <RequestDataCorrectionPanel
          caseRecord={caseRecord}
          currentUser={currentUser}
          onCaseUpdated={loadCase}
        />

        {/* CORRECTED UPLOAD + AUTOMATED VERIFICATION EVIDENCE */}
        <CorrectionVerificationEvidencePanel
          caseRecord={caseRecord}
          currentUser={currentUser}
        />

        <CaseResolutionPanel
          caseRecord={caseRecord}
          currentUser={currentUser}
          onCaseUpdated={loadCase}
        />


        <div className="mt-6">
          <CaseHistoryTimeline
            key={`${
              caseRecord?.updatedAt ||
              caseRecord?._id
            }:${
              dataQualityIssue?.status ||
              'NO_DQ_STATUS'
            }`}
            caseId={caseRecord?._id}
          />
        </div>
      </div>
    </div>
  )
}

export default CaseDetailsPage