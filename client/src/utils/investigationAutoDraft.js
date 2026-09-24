function getAmount(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null
  }

  if (
    typeof value === 'object' &&
    value.$numberDecimal
  ) {
    return Number(
      value.$numberDecimal,
    )
  }

  const parsed =
    Number(value)

  return Number.isFinite(parsed)
    ? parsed
    : null
}

function displayAmount(value) {
  const amount =
    getAmount(value)

  if (amount === null) {
    return 'not available'
  }

  return String(amount)
}

function getTransaction(
  caseRecord,
) {
  const exception =
    caseRecord?.exceptionId

  const result =
    exception?.reconciliationResultId

  return (
    result?.targetTransactionId ||
    result?.sourceTransactionId ||
    exception?.transactionId ||
    null
  )
}

function getContext(
  caseRecord,
) {
  const exception =
    caseRecord?.exceptionId

  const reconciliation =
    exception?.reconciliationId

  const result =
    exception?.reconciliationResultId

  return {
    exception,
    reconciliation,
    result,

    sourceUpload:
      reconciliation?.sourceUploadId,

    targetUpload:
      reconciliation?.targetUploadId,

    sourceTransaction:
      result?.sourceTransactionId,

    targetTransaction:
      result?.targetTransactionId,

    transaction:
      getTransaction(caseRecord),
  }
}

function fileName(upload) {
  return (
    upload?.originalName ||
    upload?.fileName ||
    'the dataset'
  )
}

export function getSuggestedRootCause(
  caseRecord,
) {
  const {
    exception,
    sourceTransaction,
    targetTransaction,
  } = getContext(caseRecord)

  switch (
    exception?.exceptionType
  ) {
    case 'UNMATCHED':
      if (
        !sourceTransaction &&
        targetTransaction
      ) {
        return 'MISSING_SOURCE_TRANSACTION'
      }

      if (
        sourceTransaction &&
        !targetTransaction
      ) {
        return 'MISSING_TARGET_TRANSACTION'
      }

      return 'OTHER'

    case 'AMOUNT_MISMATCH':
      return 'AMOUNT_DISCREPANCY'

    case 'STATUS_MISMATCH':
      return 'STATUS_DISCREPANCY'

    case 'AMOUNT_AND_STATUS_MISMATCH':
      return 'AMOUNT_DISCREPANCY'

    case 'PROBABLE_MATCH':
      return 'OTHER'

    default:
      return 'OTHER'
  }
}

export function generateRootCauseDetails(
  caseRecord,
) {
  const {
    exception,
    sourceUpload,
    targetUpload,
    sourceTransaction,
    targetTransaction,
    transaction,
  } = getContext(caseRecord)

  const type =
    exception?.exceptionType

  if (
    type === 'UNMATCHED' &&
    !sourceTransaction &&
    targetTransaction
  ) {
    return `${targetTransaction.transactionId} exists in the target dataset ${fileName(
      targetUpload,
    )} with amount ${displayAmount(
      targetTransaction.amount,
    )}, reference ${
      targetTransaction.referenceNumber ||
      'not available'
    }, and account ${
      targetTransaction.accountNumber ||
      'not available'
    }. No corresponding transaction was identified in the source dataset ${fileName(
      sourceUpload,
    )}. The source file contains ${
      sourceUpload?.validRows ?? '—'
    } valid rows and ${
      sourceUpload?.invalidRows ?? '—'
    } rejected rows. The available source evidence should be reviewed before confirming the transaction as genuinely missing.`
  }

  if (
    type === 'UNMATCHED' &&
    sourceTransaction &&
    !targetTransaction
  ) {
    return `${sourceTransaction.transactionId} exists in the source dataset ${fileName(
      sourceUpload,
    )} with amount ${displayAmount(
      sourceTransaction.amount,
    )}, reference ${
      sourceTransaction.referenceNumber ||
      'not available'
    }, and account ${
      sourceTransaction.accountNumber ||
      'not available'
    }. No corresponding transaction was identified in the target dataset ${fileName(
      targetUpload,
    )}.`
  }

  if (
    type === 'AMOUNT_MISMATCH' &&
    sourceTransaction &&
    targetTransaction
  ) {
    const sourceAmount =
      getAmount(
        sourceTransaction.amount,
      )

    const targetAmount =
      getAmount(
        targetTransaction.amount,
      )

    const difference =
      sourceAmount !== null &&
      targetAmount !== null
        ? Math.abs(
            sourceAmount -
              targetAmount,
          )
        : null

    return `The source and target transactions were associated during reconciliation, but their amounts are inconsistent. Source amount: ${displayAmount(
      sourceTransaction.amount,
    )}. Target amount: ${displayAmount(
      targetTransaction.amount,
    )}.${
      difference !== null
        ? ` Absolute difference: ${difference}.`
        : ''
    } The discrepancy requires verification against the originating transaction records.`
  }

  if (
    type === 'STATUS_MISMATCH' &&
    sourceTransaction &&
    targetTransaction
  ) {
    return `The source and target transactions were associated during reconciliation, but their statuses differ. Source status: ${
      sourceTransaction.status ||
      'not available'
    }. Target status: ${
      targetTransaction.status ||
      'not available'
    }. The transaction lifecycle should be reviewed to determine which status accurately represents the transaction.`
  }

  if (
    type ===
      'AMOUNT_AND_STATUS_MISMATCH' &&
    sourceTransaction &&
    targetTransaction
  ) {
    return `The related source and target transactions contain both amount and status inconsistencies. Source amount: ${displayAmount(
      sourceTransaction.amount,
    )}; target amount: ${displayAmount(
      targetTransaction.amount,
    )}. Source status: ${
      sourceTransaction.status ||
      'not available'
    }; target status: ${
      targetTransaction.status ||
      'not available'
    }. Both discrepancies require investigation before resolution.`
  }

  if (
    type === 'PROBABLE_MATCH' &&
    sourceTransaction &&
    targetTransaction
  ) {
    return `The reconciliation engine identified the source transaction ${
      sourceTransaction.transactionId
    } and target transaction ${
      targetTransaction.transactionId
    } as a probable match with a match score of ${
      exception
        ?.reconciliationResultId
        ?.matchScore ??
      'not available'
    }. The Maker should verify the transaction identifiers, amount, reference, account, date, and status before confirming whether both records represent the same transaction.`
  }

  return transaction
    ? `Transaction ${
        transaction.transactionId
      } requires manual investigation based on the recorded reconciliation exception and supporting dataset evidence.`
    : 'This reconciliation exception requires manual investigation using the available source and target evidence.'
}

export function generateInvestigationFindings(
  caseRecord,
  checklist,
) {
  const {
    exception,
    sourceTransaction,
    targetTransaction,
    transaction,
  } = getContext(caseRecord)

  const checks = []

  if (checklist?.sourceDatasetReviewed) {
    checks.push(
      'source dataset reviewed',
    )
  }

  if (checklist?.targetDatasetReviewed) {
    checks.push(
      'target dataset reviewed',
    )
  }

  if (checklist?.rejectedRowsReviewed) {
    checks.push(
      'rejected rows reviewed',
    )
  }

  if (checklist?.accountChecked) {
    checks.push(
      'account comparison completed',
    )
  }

  if (checklist?.referenceChecked) {
    checks.push(
      'reference comparison completed',
    )
  }

  if (checklist?.amountChecked) {
    checks.push(
      'amount comparison completed',
    )
  }

  if (
    checklist?.transactionDateChecked
  ) {
    checks.push(
      'transaction date reviewed',
    )
  }

  if (
    checklist?.duplicateSearchPerformed
  ) {
    checks.push(
      'duplicate search completed',
    )
  }

  let finding = ''

  if (
    exception?.exceptionType ===
      'UNMATCHED' &&
    !sourceTransaction &&
    targetTransaction
  ) {
    finding = `The target dataset contains transaction ${targetTransaction.transactionId} for amount ${displayAmount(
      targetTransaction.amount,
    )}, reference ${
      targetTransaction.referenceNumber ||
      'not available'
    }, and account ${
      targetTransaction.accountNumber ||
      'not available'
    }. No corresponding source-side transaction was identified by the reconciliation engine.`
  } else if (
    exception?.exceptionType ===
      'UNMATCHED' &&
    sourceTransaction &&
    !targetTransaction
  ) {
    finding = `The source dataset contains transaction ${sourceTransaction.transactionId}, but no corresponding target-side transaction was identified by the reconciliation engine.`
  } else if (
    sourceTransaction &&
    targetTransaction
  ) {
    finding = `The reconciliation linked source transaction ${sourceTransaction.transactionId} with target transaction ${targetTransaction.transactionId}. The exception type is ${
      exception?.exceptionType ||
      'not available'
    }, requiring manual verification of the differing transaction attributes.`
  } else if (transaction) {
    finding = `Transaction ${transaction.transactionId} was reviewed for the recorded reconciliation exception.`
  } else {
    finding =
      'The reconciliation exception was reviewed using the available transaction evidence.'
  }

  if (checks.length > 0) {
    finding += ` Investigation checks completed: ${checks.join(
      ', ',
    )}.`
  }

  return finding
}

export function generateResolutionDetails(
  caseRecord,
  proposedAction,
) {
  const {
    transaction,
  } = getContext(caseRecord)

  const transactionId =
    transaction?.transactionId ||
    'the affected transaction'

  switch (proposedAction) {
    case 'CORRECT_SOURCE_RECORD':
      return `Verify why ${transactionId} is absent from or inconsistent in the source transaction record. If the transaction is confirmed as legitimate, correct or restore the source record and reprocess the affected reconciliation to confirm that the exception is resolved.`

    case 'CORRECT_TARGET_RECORD':
      return `Verify the target-side record for ${transactionId}. Correct the target transaction data where required and reprocess the reconciliation to confirm that both systems are consistent.`

    case 'REPROCESS_TRANSACTION':
      return `Reprocess ${transactionId} through the appropriate transaction workflow and then rerun reconciliation to confirm that the transaction is correctly represented on both sides.`

    case 'REVERSE_TRANSACTION':
      return `Verify that reversal is authorized for ${transactionId}. Process the required reversal through the approved operational procedure and rerun reconciliation after the reversal is recorded.`

    case 'MANUAL_ADJUSTMENT':
      return `Perform the authorized manual adjustment for ${transactionId}, retaining the appropriate supporting evidence and approval. Rerun reconciliation after the adjustment is posted.`

    case 'ESCALATE':
      return `Escalate ${transactionId} to the appropriate operations, system, or control team with the reconciliation evidence, investigation findings, and identified discrepancy for further resolution.`

    case 'ACCEPT_TRANSACTION':
      return `Accept ${transactionId} as valid after confirming that the available reconciliation evidence supports the transaction and that no corrective posting is required.`

    case 'NO_ACTION_REQUIRED':
      return `Document why ${transactionId} requires no corrective action and retain the supporting investigation evidence for Checker review and audit purposes.`

    case 'OTHER':
      return `Document the specific corrective action required for ${transactionId}, including the responsible process or team and the verification needed before the case can be considered resolved.`

    default:
      return ''
  }
}