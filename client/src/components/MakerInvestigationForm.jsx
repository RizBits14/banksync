import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Save,
  SearchCheck,
  ShieldAlert,
  Sparkles,
  WandSparkles,
} from 'lucide-react'

import { apiRequest } from '../services/api'

import {
  generateInvestigationFindings,
  generateResolutionDetails,
  generateRootCauseDetails,
  getSuggestedRootCause,
} from '../utils/investigationAutoDraft.js'

const EMPTY_CHECKLIST = {
  sourceDatasetReviewed: false,
  targetDatasetReviewed: false,
  rejectedRowsReviewed: false,
  accountChecked: false,
  referenceChecked: false,
  amountChecked: false,
  transactionDateChecked: false,
  duplicateSearchPerformed: false,
}

const RECONCILIATION_CHECKLIST_ITEMS = [
  {
    key: 'sourceDatasetReviewed',
    label: 'Source dataset reviewed',
    evidenceLabel:
      'Source dataset valid transactions reviewed',
    description:
      'I inspected the valid transactions in the source dataset.',
  },
  {
    key: 'targetDatasetReviewed',
    label: 'Target dataset reviewed',
    evidenceLabel:
      'Target dataset valid transactions reviewed',
    description:
      'I inspected the valid transactions in the target dataset.',
  },
  {
    key: 'rejectedRowsReviewed',
    label: 'Rejected rows reviewed',
    evidenceLabel:
      'Rejected/invalid rows reviewed',
    description:
      'I checked rejected/invalid rows for a possible hidden counterpart.',
  },
  {
    key: 'accountChecked',
    label: 'Account checked',
    evidenceLabel:
      'Account number comparison completed',
    description:
      'I compared the relevant account number between the datasets.',
  },
  {
    key: 'referenceChecked',
    label: 'Reference checked',
    evidenceLabel:
      'Reference number comparison completed',
    description:
      'I searched and compared transaction references.',
  },
  {
    key: 'amountChecked',
    label: 'Amount checked',
    evidenceLabel:
      'Transaction amount comparison completed',
    description:
      'I searched for the same or related transaction amount.',
  },
  {
    key: 'transactionDateChecked',
    label: 'Transaction date checked',
    evidenceLabel:
      'Transaction date review completed',
    description:
      'I checked the transaction date and nearby posting dates.',
  },
  {
    key: 'duplicateSearchPerformed',
    label: 'Duplicate search performed',
    evidenceLabel:
      'Duplicate transaction search completed',
    description:
      'I checked whether the transaction appears more than once.',
  },
]

const DATA_QUALITY_BASE_CHECKLIST_ITEMS = [
  {
    key: 'sourceDatasetReviewed',
    label: 'Original uploaded dataset reviewed',
    evidenceLabel:
      'Original uploaded banking dataset reviewed',
    description:
      'I inspected the original uploaded transaction dataset that triggered the Data Quality issue.',
  },
  {
    key: 'accountChecked',
    label: 'Affected account data checked',
    evidenceLabel:
      'Affected account data reviewed',
    description:
      'I checked the account information on the affected transaction records.',
  },
  {
    key: 'referenceChecked',
    label: 'Reference data checked',
    evidenceLabel:
      'Reference integrity reviewed',
    description:
      'I checked the transaction references connected to the detected issue.',
  },
  {
    key: 'amountChecked',
    label: 'Amount data checked',
    evidenceLabel:
      'Affected transaction amounts reviewed',
    description:
      'I checked the amounts on the affected transaction records for consistency.',
  },
  {
    key: 'transactionDateChecked',
    label: 'Transaction dates checked',
    evidenceLabel:
      'Affected transaction dates reviewed',
    description:
      'I checked the transaction dates and relevant posting chronology.',
  },
]

const ROOT_CAUSES = [
  {
    value: 'MISSING_SOURCE_TRANSACTION',
    label: 'Missing Source Transaction',
  },
  {
    value: 'MISSING_TARGET_TRANSACTION',
    label: 'Missing Target Transaction',
  },
  {
    value: 'VALIDATION_FAILURE',
    label: 'Validation Failure',
  },
  {
    value: 'AMOUNT_DISCREPANCY',
    label: 'Amount Discrepancy',
  },
  {
    value: 'STATUS_DISCREPANCY',
    label: 'Status Discrepancy',
  },
  {
    value: 'DUPLICATE_TRANSACTION',
    label: 'Duplicate Transaction',
  },
  {
    value: 'TIMING_OR_CUTOFF_ISSUE',
    label: 'Timing / Cut-off Issue',
  },
  {
    value: 'REFERENCE_MISMATCH',
    label: 'Reference Mismatch',
  },
  {
    value: 'POSTING_ERROR',
    label: 'Posting Error',
  },
  {
    value: 'SYSTEM_INTERFACE_ISSUE',
    label: 'System / Interface Issue',
  },
  {
    value: 'MANUAL_PROCESSING_ERROR',
    label: 'Manual Processing Error',
  },
  {
    value: 'FALSE_POSITIVE',
    label: 'False Positive',
  },
  {
    value: 'OTHER',
    label: 'Other',
  },
]

const RECONCILIATION_PROPOSED_ACTIONS = [
  {
    value: 'ACCEPT_TRANSACTION',
    label: 'Accept Transaction',
  },
  {
    value: 'CORRECT_SOURCE_RECORD',
    label: 'Correct Source Record',
  },
  {
    value: 'CORRECT_TARGET_RECORD',
    label: 'Correct Target Record',
  },
  {
    value: 'REPROCESS_TRANSACTION',
    label: 'Reprocess Transaction',
  },
  {
    value: 'REVERSE_TRANSACTION',
    label: 'Reverse Transaction',
  },
  {
    value: 'MANUAL_ADJUSTMENT',
    label: 'Manual Adjustment',
  },
  {
    value: 'ESCALATE',
    label: 'Escalate',
  },
  {
    value: 'NO_ACTION_REQUIRED',
    label: 'No Action Required',
  },
  {
    value: 'OTHER',
    label: 'Other',
  },
]

const DATA_QUALITY_PROPOSED_ACTIONS = [
  {
    value: 'CORRECT_SOURCE_RECORD',
    label: 'Correct Source Record',
  },
  {
    value: 'REPROCESS_TRANSACTION',
    label: 'Reprocess Transaction',
  },
  {
    value: 'REVERSE_TRANSACTION',
    label: 'Reverse Transaction',
  },
  {
    value: 'MANUAL_ADJUSTMENT',
    label: 'Manual Adjustment',
  },
  {
    value: 'ESCALATE',
    label: 'Escalate',
  },
  {
    value: 'NO_ACTION_REQUIRED',
    label: 'No Action Required / False Positive',
  },
  {
    value: 'OTHER',
    label: 'Other',
  },
]

function formatAmount(amount) {
  if (
    amount === null ||
    amount === undefined
  ) {
    return 'Not available'
  }

  if (
    typeof amount === 'object' &&
    amount.$numberDecimal
  ) {
    return amount.$numberDecimal
  }

  return String(amount)
}

function formatLabel(value) {
  if (!value) {
    return 'Not available'
  }

  return String(value)
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    )
}

function formatDate(value) {
  if (!value) {
    return 'Not available'
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return String(value)
  }

  return date.toLocaleString()
}

function getFileName(upload) {
  return (
    upload?.originalName ||
    upload?.fileName ||
    'Unknown file'
  )
}

function getTransactionKey(
  transaction,
  index,
) {
  return (
    transaction?._id ||
    transaction?.id ||
    `${transaction?.transactionId || 'transaction'}-${transaction?.referenceNumber || 'reference'}-${index}`
  )
}

function getDataQualityChecklistItems(
  issue,
  originalUpload,
) {
  const items = [
    ...DATA_QUALITY_BASE_CHECKLIST_ITEMS,
  ]

  if (
    Number(
      originalUpload?.invalidRows ??
        0,
    ) > 0
  ) {
    items.splice(1, 0, {
      key: 'rejectedRowsReviewed',
      label:
        'Rejected rows reviewed',
      evidenceLabel:
        'Rejected/invalid rows reviewed for related evidence',
      description:
        'I checked rejected rows from the original upload to confirm that relevant evidence was not excluded during validation.',
    })
  }

  let finalCheck = {
    key: 'duplicateSearchPerformed',
    label:
      'Related-record search performed',
    evidenceLabel:
      'Related transaction search completed',
    description:
      'I searched the dataset for related transactions that could explain or reproduce the detected issue.',
  }

  if (
    issue?.issueType ===
    'DUPLICATE_TRANSACTION_ID'
  ) {
    finalCheck = {
      key: 'duplicateSearchPerformed',
      label:
        'Duplicate transaction-ID evidence reviewed',
      evidenceLabel:
        'Duplicate transaction-ID evidence confirmed',
      description:
        'I searched the dataset and reviewed all records sharing the detected transaction ID.',
    }
  }

  if (
    issue?.issueType ===
    'DUPLICATE_REFERENCE'
  ) {
    finalCheck = {
      key: 'duplicateSearchPerformed',
      label:
        'Duplicate reference evidence reviewed',
      evidenceLabel:
        'Duplicate reference evidence confirmed',
      description:
        'I searched the dataset and reviewed all records sharing the detected reference number.',
    }
  }

  if (
    issue?.issueType ===
      'REVERSAL_WITHOUT_ORIGINAL' ||
    issue?.issueType ===
      'REVERSAL_AMOUNT_MISMATCH'
  ) {
    finalCheck = {
      key: 'duplicateSearchPerformed',
      label:
        'Original / reversal relationship searched',
      evidenceLabel:
        'Original and reversal relationship reviewed',
      description:
        'I searched for the original and reversal transaction relationship and checked the affected records.',
    }
  }

  items.push(finalCheck)

  return items
}

function getDataQualitySuggestedRootCause(
  issueType,
) {
  switch (issueType) {
    case 'DUPLICATE_TRANSACTION_ID':
    case 'DUPLICATE_REFERENCE':
      return 'DUPLICATE_TRANSACTION'

    case 'REVERSAL_AMOUNT_MISMATCH':
      return 'AMOUNT_DISCREPANCY'

    case 'REVERSAL_WITHOUT_ORIGINAL':
      return 'VALIDATION_FAILURE'

    default:
      return 'OTHER'
  }
}

function generateDataQualityRootCauseDetails(
  caseRecord,
) {
  const issue =
    caseRecord?.dataQualityIssueId

  const upload =
    caseRecord?.originalUploadId ||
    issue?.uploadId

  const keyText =
    issue?.keyValue
      ? ` The detected key is "${issue.keyValue}".`
      : ''

  return [
    `BankSync detected a ${formatLabel(
      issue?.issueType,
    ).toLowerCase()} in the uploaded banking transaction dataset "${getFileName(
      upload,
    )}".${keyText}`,
    '',
    'The detection itself does not prove the business root cause. Review the affected source records and determine whether the issue was caused by duplicate source generation, manual processing, posting logic, interface behavior, or another upstream data problem.',
    '',
    'Record the confirmed cause here after reviewing the evidence. The original upload must remain unchanged as audit evidence.',
  ].join('\n')
}

function generateDataQualityFindings(
  caseRecord,
  checklist,
  activeChecklistItems,
) {
  const issue =
    caseRecord?.dataQualityIssueId

  const upload =
    caseRecord?.originalUploadId ||
    issue?.uploadId

  const related =
    Array.isArray(
      issue?.relatedTransactionIds,
    )
      ? issue.relatedTransactionIds
      : []

  const completed =
    activeChecklistItems.filter(
      (item) =>
        checklist?.[item.key],
    )

  const lines = [
    `BankSync detected ${formatLabel(
      issue?.issueType,
    ).toLowerCase()} in "${getFileName(
      upload,
    )}".`,
  ]

  if (issue?.keyValue) {
    lines.push(
      `Detected key: ${issue.keyValue}.`,
    )
  }

  lines.push(
    `Severity: ${formatLabel(
      issue?.severity,
    )}.`,
  )

  lines.push(
    `Affected related records identified by the scanner: ${related.length}.`,
  )

  if (
    completed.length > 0
  ) {
    lines.push('')

    lines.push(
      'Maker checks completed:',
    )

    completed.forEach(
      (item) => {
        lines.push(
          `- ${item.evidenceLabel}`,
        )
      },
    )
  }

  lines.push('')

  lines.push(
    'State the confirmed investigation finding here, including whether the source extract requires correction before it should be used for reconciliation.',
  )

  return lines.join('\n')
}

function generateDataQualityResolution(
  caseRecord,
  proposedAction,
) {
  const issue =
    caseRecord?.dataQualityIssueId

  const upload =
    caseRecord?.originalUploadId ||
    issue?.uploadId

  const issueName =
    formatLabel(
      issue?.issueType,
    ).toLowerCase()

  const fileName =
    getFileName(upload)

  switch (proposedAction) {
    case 'CORRECT_SOURCE_RECORD':
      return `Correct the affected record(s) in the upstream/source banking extract that produced the ${issueName} in "${fileName}". Preserve the original BankSync upload as immutable audit evidence. After the correction is prepared, the Import Officer should upload the corrected version linked to the original dataset so BankSync can re-scan it and verify that the defect no longer exists before the case is closed.`

    case 'REPROCESS_TRANSACTION':
      return `Reprocess the affected transaction data in the responsible source process, produce a corrected extract, and submit that corrected extract through the BankSync correction workflow. BankSync must verify the new upload before it is treated as reconciliation-ready.`

    case 'REVERSE_TRANSACTION':
      return `Confirm the required reversal with the responsible operations/source-system team, apply the approved correction outside the immutable BankSync original upload, and provide a corrected extract for BankSync verification before reconciliation use.`

    case 'MANUAL_ADJUSTMENT':
      return `Perform the approved manual adjustment in the responsible banking/source process, document the reason and affected records, then provide a corrected extract for BankSync re-scan and verification. The original upload remains preserved for audit.`

    case 'ESCALATE':
      return `Escalate the ${issueName} to the responsible operations, source-system, or interface owner with the affected transaction evidence. No BankSync closure should occur until the issue has either been corrected and verified or formally classified through the approved no-correction/false-positive path.`

    case 'NO_ACTION_REQUIRED':
      return `No source correction is recommended at this stage. Document clear evidence showing why the detected ${issueName} is a valid condition or false positive. The Checker must independently review that evidence before the case can follow the approved no-correction closure path.`

    case 'OTHER':
      return `Document the specific remediation required for the ${issueName}. Any source-data change must be performed outside the immutable original BankSync upload, followed by a corrected upload and objective BankSync verification before the dataset is considered reconciliation-ready.`

    default:
      return ''
  }
}

function MakerInvestigationForm({
  caseRecord,
  currentUser,
  onCaseUpdated,
}) {
  const [
    investigationChecklist,
    setInvestigationChecklist,
  ] = useState(EMPTY_CHECKLIST)

  const [
    rootCauseCategory,
    setRootCauseCategory,
  ] = useState('')

  const [
    rootCauseDetails,
    setRootCauseDetails,
  ] = useState('')

  const [
    investigationNotes,
    setInvestigationNotes,
  ] = useState('')

  const [
    proposedAction,
    setProposedAction,
  ] = useState('')

  const [
    proposedResolution,
    setProposedResolution,
  ] = useState('')

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  useEffect(() => {
    setInvestigationChecklist({
      ...EMPTY_CHECKLIST,
      ...(caseRecord
        ?.investigationChecklist || {}),
    })

    setRootCauseCategory(
      caseRecord?.rootCauseCategory || '',
    )

    setRootCauseDetails(
      caseRecord?.rootCauseDetails || '',
    )

    setInvestigationNotes(
      caseRecord?.investigationNotes || '',
    )

    setProposedAction(
      caseRecord?.proposedAction || '',
    )

    setProposedResolution(
      caseRecord?.proposedResolution || '',
    )
  }, [caseRecord])

  const isDataQualityCase =
    caseRecord?.originType ===
      'DATA_QUALITY_ISSUE' ||
    Boolean(
      caseRecord?.dataQualityIssueId &&
        !caseRecord?.exceptionId,
    )

  const dataQualityIssue =
    caseRecord?.dataQualityIssueId

  const originalUpload =
    caseRecord?.originalUploadId ||
    dataQualityIssue?.uploadId

  const activeChecklistItems =
    useMemo(
      () =>
        isDataQualityCase
          ? getDataQualityChecklistItems(
              dataQualityIssue,
              originalUpload,
            )
          : RECONCILIATION_CHECKLIST_ITEMS,
      [
        isDataQualityCase,
        dataQualityIssue,
        originalUpload,
      ],
    )

  const proposedActions =
    isDataQualityCase
      ? DATA_QUALITY_PROPOSED_ACTIONS
      : RECONCILIATION_PROPOSED_ACTIONS

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

  const canEdit =
    isAssignedMaker &&
    caseRecord?.status ===
      'UNDER_INVESTIGATION'

  const completedChecks =
    useMemo(
      () =>
        activeChecklistItems.filter(
          (item) =>
            Boolean(
              investigationChecklist[
                item.key
              ],
            ),
        ).length,
      [
        activeChecklistItems,
        investigationChecklist,
      ],
    )

  const progressPercentage =
    activeChecklistItems.length > 0
      ? Math.round(
          (completedChecks /
            activeChecklistItems.length) *
            100,
        )
      : 0

  const evidenceSummary =
    useMemo(() => {
      if (isDataQualityCase) {
        const issue =
          dataQualityIssue

        const upload =
          originalUpload

        const relatedTransactions =
          Array.isArray(
            issue?.relatedTransactionIds,
          )
            ? issue.relatedTransactionIds
            : []

        const completedItems =
          activeChecklistItems.filter(
            (item) =>
              investigationChecklist[
                item.key
              ],
          )

        const lines = []

        lines.push(
          'Pre-Reconciliation Data Integrity Evidence',
        )

        lines.push(
          `Original dataset: ${getFileName(
            upload,
          )}`,
        )

        if (upload) {
          lines.push(
            `Dataset rows: ${
              upload.totalRows ?? '—'
            } total, ${
              upload.validRows ?? '—'
            } valid, ${
              upload.invalidRows ?? '—'
            } rejected.`,
          )
        }

        lines.push(
          `Source system: ${
            issue?.sourceSystem ||
            upload?.sourceSystem ||
            'Not available'
          }`,
        )

        lines.push('')

        lines.push(
          `Detected issue: ${formatLabel(
            issue?.issueType,
          )}`,
        )

        lines.push(
          `Severity: ${formatLabel(
            issue?.severity,
          )}`,
        )

        lines.push(
          `Workflow status: ${formatLabel(
            issue?.status,
          )}`,
        )

        if (issue?.keyValue) {
          lines.push(
            `Detected key: ${issue.keyValue}`,
          )
        }

        if (issue?.description) {
          lines.push(
            `System description: ${issue.description}`,
          )
        }

        lines.push('')

        lines.push(
          `Affected transaction records: ${relatedTransactions.length}`,
        )

        relatedTransactions.forEach(
          (transaction, index) => {
            lines.push(
              `- ${transaction?.transactionId || 'Unknown transaction'} | Ref: ${transaction?.referenceNumber || '—'} | Account: ${transaction?.accountNumber || '—'} | Amount: ${formatAmount(
                transaction?.amount,
              )} | Date: ${formatDate(
                transaction?.transactionDate,
              )} | Status: ${transaction?.status || '—'}`,
            )
          },
        )

        lines.push('')

        lines.push(
          `Checks completed: ${completedChecks}/${activeChecklistItems.length}`,
        )

        completedItems.forEach(
          (item) => {
            lines.push(
              `- ${item.evidenceLabel}`,
            )
          },
        )

        lines.push('')

        lines.push(
          'Reconciliation relevance: This issue affects the integrity/readiness of uploaded banking transaction data. Any required source correction must be verified before the corrected dataset is treated as reconciliation-ready.',
        )

        return lines.join('\n')
      }

      const exception =
        caseRecord?.exceptionId

      const reconciliation =
        exception?.reconciliationId

      const result =
        exception?.reconciliationResultId

      const sourceUpload =
        reconciliation?.sourceUploadId

      const targetUpload =
        reconciliation?.targetUploadId

      const sourceTransaction =
        result?.sourceTransactionId

      const targetTransaction =
        result?.targetTransactionId

      const caseTransaction =
        targetTransaction ||
        sourceTransaction ||
        exception?.transactionId

      const completedItems =
        RECONCILIATION_CHECKLIST_ITEMS.filter(
          (item) =>
            investigationChecklist[
              item.key
            ],
        )

      const lines = []

      lines.push(
        `Source dataset: ${getFileName(
          sourceUpload,
        )}`,
      )

      if (sourceUpload) {
        lines.push(
          `Source rows: ${
            sourceUpload.totalRows ?? '—'
          } total, ${
            sourceUpload.validRows ?? '—'
          } valid, ${
            sourceUpload.invalidRows ?? '—'
          } rejected.`,
        )
      }

      lines.push(
        `Target dataset: ${getFileName(
          targetUpload,
        )}`,
      )

      if (targetUpload) {
        lines.push(
          `Target rows: ${
            targetUpload.totalRows ?? '—'
          } total, ${
            targetUpload.validRows ?? '—'
          } valid, ${
            targetUpload.invalidRows ?? '—'
          } rejected.`,
        )
      }

      if (caseTransaction) {
        lines.push('')

        lines.push(
          `Exception transaction: ${
            caseTransaction.transactionId ||
            'Not available'
          }`,
        )

        lines.push(
          `Amount: ${formatAmount(
            caseTransaction.amount,
          )}`,
        )

        lines.push(
          `Reference: ${
            caseTransaction.referenceNumber ||
            'Not available'
          }`,
        )

        lines.push(
          `Account: ${
            caseTransaction.accountNumber ||
            'Not available'
          }`,
        )

        lines.push(
          `Status: ${
            caseTransaction.status ||
            'Not available'
          }`,
        )
      }

      lines.push('')

      lines.push(
        `Checks completed: ${completedChecks}/${RECONCILIATION_CHECKLIST_ITEMS.length}`,
      )

      completedItems.forEach(
        (item) => {
          lines.push(
            `- ${item.evidenceLabel}`,
          )
        },
      )

      lines.push('')

      if (
        !sourceTransaction &&
        targetTransaction
      ) {
        lines.push(
          'System finding: No corresponding source-side transaction was identified by reconciliation.',
        )
      } else if (
        sourceTransaction &&
        !targetTransaction
      ) {
        lines.push(
          'System finding: No corresponding target-side transaction was identified by reconciliation.',
        )
      } else if (
        sourceTransaction &&
        targetTransaction
      ) {
        lines.push(
          'System finding: Transactions exist on both reconciliation sides and require comparison.',
        )
      }

      if (
        exception?.reasons?.length > 0
      ) {
        lines.push(
          `System reason: ${exception.reasons.join(
            '; ',
          )}`,
        )
      }

      return lines.join('\n')
    }, [
      activeChecklistItems,
      caseRecord,
      completedChecks,
      dataQualityIssue,
      investigationChecklist,
      isDataQualityCase,
      originalUpload,
    ])

  if (!canEdit) {
    return null
  }

  const handleChecklistChange = (
    key,
  ) => {
    setInvestigationChecklist(
      (current) => ({
        ...current,
        [key]: !current[key],
      }),
    )

    setSuccess('')
    setError('')
  }

  const handleGenerateRootCause =
    () => {
      if (isDataQualityCase) {
        if (!rootCauseCategory) {
          setRootCauseCategory(
            getDataQualitySuggestedRootCause(
              dataQualityIssue?.issueType,
            ),
          )
        }

        setRootCauseDetails(
          generateDataQualityRootCauseDetails(
            caseRecord,
          ),
        )

        setError('')
        setSuccess('')

        return
      }

      const suggested =
        getSuggestedRootCause(
          caseRecord,
        )

      if (!rootCauseCategory) {
        setRootCauseCategory(
          suggested,
        )
      }

      setRootCauseDetails(
        generateRootCauseDetails(
          caseRecord,
        ),
      )

      setError('')
      setSuccess('')
    }

  const handleGenerateFindings =
    () => {
      if (isDataQualityCase) {
        setInvestigationNotes(
          generateDataQualityFindings(
            caseRecord,
            investigationChecklist,
            activeChecklistItems,
          ),
        )

        setError('')
        setSuccess('')

        return
      }

      setInvestigationNotes(
        generateInvestigationFindings(
          caseRecord,
          investigationChecklist,
        ),
      )

      setError('')
      setSuccess('')
    }

  const handleGenerateResolution =
    () => {
      setError('')
      setSuccess('')

      if (!proposedAction) {
        setError(
          'Select a proposed action before generating resolution details.',
        )

        return
      }

      if (isDataQualityCase) {
        setProposedResolution(
          generateDataQualityResolution(
            caseRecord,
            proposedAction,
          ),
        )

        return
      }

      setProposedResolution(
        generateResolutionDetails(
          caseRecord,
          proposedAction,
        ),
      )
    }

  const handleSave = async (
    event,
  ) => {
    event.preventDefault()

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response =
        await apiRequest(
          `/cases/${caseRecord._id}/investigation`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              investigationChecklist,

              rootCauseCategory:
                rootCauseCategory ||
                null,

              rootCauseDetails,

              investigationNotes,

              evidenceSummary,

              proposedAction:
                proposedAction || null,

              proposedResolution,
            }),
          },
        )

      setSuccess(
        response.message ||
          'Investigation updated successfully.',
      )

      if (onCaseUpdated) {
        await onCaseUpdated()
      }
    } catch (err) {
      setError(
        err.message ||
          'Unable to save investigation.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <SearchCheck size={21} />
          </div>

          <div>
            <p className="text-sm font-medium text-amber-600">
              Maker Investigation
            </p>

            <h2 className="mt-1 text-xl font-semibold text-stone-900">
              Structured Investigation Workspace
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
              {isDataQualityCase
                ? 'Review the detected banking-data integrity issue and determine what must be corrected before the dataset is considered reconciliation-ready. BankSync can prepare factual drafts, but the Maker must review and confirm the investigation.'
                : 'BankSync can prepare factual drafts from the reconciliation data. The Maker must review and edit each draft before submission.'}
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="p-6 sm:p-8"
      >
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck
                size={19}
                className="text-amber-600"
              />

              <div>
                <h3 className="font-semibold text-stone-900">
                  Investigation Checklist
                </h3>

                <p className="mt-1 text-sm text-stone-500">
                  Confirm only checks that were actually performed.
                </p>
              </div>
            </div>

            <div className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
              {completedChecks}/
              {activeChecklistItems.length}{' '}
              completed
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{
                width: `${progressPercentage}%`,
              }}
            />
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {activeChecklistItems.map(
              (item) => (
                <label
                  key={item.key}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                    investigationChecklist[
                      item.key
                    ]
                      ? 'border-emerald-200 bg-emerald-50/60'
                      : 'border-stone-200 bg-stone-50 hover:border-amber-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={
                      investigationChecklist[
                        item.key
                      ]
                    }
                    onChange={() =>
                      handleChecklistChange(
                        item.key,
                      )
                    }
                    className="mt-1 h-4 w-4 accent-emerald-600"
                  />

                  <div>
                    <p className="text-sm font-semibold text-stone-800">
                      {item.label}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-stone-500">
                      {
                        item.description
                      }
                    </p>
                  </div>

                  {investigationChecklist[
                    item.key
                  ] && (
                    <CheckCircle2
                      size={17}
                      className="ml-auto shrink-0 text-emerald-600"
                    />
                  )}
                </label>
              ),
            )}
          </div>
        </div>

        <div className="my-8 border-t border-stone-200" />

        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert
              size={19}
              className="text-amber-600"
            />

            <div>
              <h3 className="font-semibold text-stone-900">
                Root Cause Analysis
              </h3>

              <p className="mt-1 text-sm text-stone-500">
                {isDataQualityCase
                  ? 'Determine the confirmed cause of the source-data integrity issue. The scanner finding is evidence of the defect, not proof of the business root cause.'
                  : 'Determine the most likely cause of the reconciliation exception.'}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <label
              htmlFor="rootCauseCategory"
              className="mb-2 block text-sm font-medium text-stone-700"
            >
              Root Cause Category
            </label>

            <select
              id="rootCauseCategory"
              value={
                rootCauseCategory
              }
              onChange={(event) =>
                setRootCauseCategory(
                  event.target.value,
                )
              }
              className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            >
              <option value="">
                Select root cause
              </option>

              {ROOT_CAUSES.map(
                (item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="rootCauseDetails"
                className="block text-sm font-medium text-stone-700"
              >
                Root Cause Details
              </label>

              <button
                type="button"
                onClick={
                  handleGenerateRootCause
                }
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
              >
                <WandSparkles
                  size={14}
                />
                Generate Draft
              </button>
            </div>

            <textarea
              id="rootCauseDetails"
              rows={5}
              maxLength={3000}
              value={rootCauseDetails}
              onChange={(event) =>
                setRootCauseDetails(
                  event.target.value,
                )
              }
              placeholder={
                isDataQualityCase
                  ? 'Generate a draft from the detected data-integrity evidence or record the confirmed source-data root cause manually...'
                  : 'Generate a draft from the reconciliation evidence or write the root cause manually...'
              }
              className="w-full resize-y rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />

            <p className="mt-1 text-right text-xs text-stone-400">
              {rootCauseDetails.length}
              /3000
            </p>
          </div>
        </div>

        <div className="my-8 border-t border-stone-200" />

        <div>
          <div className="flex items-center gap-2">
            <FileText
              size={19}
              className="text-amber-600"
            />

            <div>
              <h3 className="font-semibold text-stone-900">
                Findings & Evidence
              </h3>

              <p className="mt-1 text-sm text-stone-500">
                {isDataQualityCase
                  ? 'BankSync can create a factual draft from the original upload, detected issue, affected transactions, and completed checks.'
                  : 'BankSync can create a draft finding from the actual reconciliation evidence and checks completed.'}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="investigationNotes"
                className="block text-sm font-medium text-stone-700"
              >
                Investigation Findings
              </label>

              <button
                type="button"
                onClick={
                  handleGenerateFindings
                }
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
              >
                <WandSparkles
                  size={14}
                />
                Generate Draft
              </button>
            </div>

            <textarea
              id="investigationNotes"
              rows={6}
              maxLength={5000}
              value={
                investigationNotes
              }
              onChange={(event) =>
                setInvestigationNotes(
                  event.target.value,
                )
              }
              placeholder="Generate a draft or record the investigation findings manually..."
              className="w-full resize-y rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />

            <p className="mt-1 text-right text-xs text-stone-400">
              {investigationNotes.length}
              /5000
            </p>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-stone-700">
                Evidence Summary
              </label>

              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                <Sparkles size={13} />
                Auto-generated
              </span>
            </div>

            <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-stone-700">
                {evidenceSummary}
              </pre>
            </div>

            <p className="mt-2 text-xs leading-5 text-stone-500">
              {isDataQualityCase
                ? 'Generated from the original uploaded banking dataset, detected issue, affected transaction records, and the checks completed by the Maker.'
                : 'Generated directly from the files, transaction data, system result, and completed checklist.'}
            </p>
          </div>
        </div>

        <div className="my-8 border-t border-stone-200" />

        <div>
          <h3 className="font-semibold text-stone-900">
            Recommended Action
          </h3>

          <p className="mt-1 text-sm text-stone-500">
            {isDataQualityCase
              ? 'Recommend what should happen to the source banking data before it is accepted for reconciliation use.'
              : 'Select the action the Maker recommends after reviewing the evidence.'}
          </p>

          <div className="mt-5">
            <label
              htmlFor="proposedAction"
              className="mb-2 block text-sm font-medium text-stone-700"
            >
              Proposed Action
            </label>

            <select
              id="proposedAction"
              value={proposedAction}
              onChange={(event) => {
                setProposedAction(
                  event.target.value,
                )

                setSuccess('')
                setError('')
              }}
              className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            >
              <option value="">
                Select proposed action
              </option>

              {proposedActions.map(
                (item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="proposedResolution"
                className="block text-sm font-medium text-stone-700"
              >
                Resolution Details
              </label>

              <button
                type="button"
                onClick={
                  handleGenerateResolution
                }
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
              >
                <WandSparkles
                  size={14}
                />
                Generate Draft
              </button>
            </div>

            <textarea
              id="proposedResolution"
              rows={5}
              maxLength={3000}
              value={
                proposedResolution
              }
              onChange={(event) =>
                setProposedResolution(
                  event.target.value,
                )
              }
              placeholder={
                isDataQualityCase
                  ? 'Describe the recommended source-data correction, escalation, or no-correction rationale. Any corrected extract will later require BankSync verification...'
                  : 'Select a proposed action and generate a resolution draft, or write one manually...'
              }
              className="w-full resize-y rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />

            <p className="mt-1 text-right text-xs text-stone-400">
              {proposedResolution.length}
              /3000
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-stone-500">
            {isDataQualityCase
              ? 'Generated text is a draft. The Maker remains responsible for confirming the investigation. The original BankSync upload is audit evidence and must not be directly altered.'
              : 'Generated text is a draft. The Maker remains responsible for reviewing and confirming the investigation before submission.'}
          </p>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={17} />

            {saving
              ? 'Saving Investigation...'
              : 'Save Investigation'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default MakerInvestigationForm
