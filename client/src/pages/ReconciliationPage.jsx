import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  ArrowRightLeft,
  CheckCircle2,
  Eye,
  FileSearch,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react'

import { Link } from 'react-router-dom'

import { apiRequest } from '../services/api'

function formatDate(dateString) {
  if (!dateString) return '—'

  return new Date(dateString).toLocaleString()
}

function formatStatus(status) {
  if (!status) return '—'

  return status
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    )
}

function formatSystem(system) {
  const labels = {
    CBS: 'Core Banking System (CBS)',
    ATM: 'ATM',
    INTERNET_BANKING: 'Internet Banking',
    MOBILE_BANKING: 'Mobile Banking',
    PAYMENT_GATEWAY: 'Payment Gateway',
    GENERAL_LEDGER: 'General Ledger',
    REMITTANCE: 'Remittance',
  }

  return labels[system] || formatStatus(system)
}

function getStatusClasses(status) {
  if (status === 'COMPLETED') {
    return 'bg-emerald-50 text-emerald-700'
  }

  if (status === 'FAILED') {
    return 'bg-red-50 text-red-700'
  }

  if (status === 'PROCESSING') {
    return 'bg-amber-50 text-amber-700'
  }

  return 'bg-stone-100 text-stone-600'
}

function getObjectId(value) {
  if (!value) return ''

  if (typeof value === 'string') {
    return value
  }

  return (
    value._id ||
    value.id ||
    ''
  )
}

/*
 * The backend remains the final authority.
 *
 * This frontend filter keeps obvious historical
 * versions out of the dropdown:
 *
 * original upload
 *   -> hidden once a correction version exists
 *
 * older correction attempts
 *   -> hidden when a newer linked attempt exists
 *
 * The server then verifies that the remaining
 * corrected candidate is actually the task's
 * VERIFIED_RESOLVED correctedUploadId.
 */
function getVisibleReconciliationUploads(
  uploads,
) {
  const readyUploads =
    uploads.filter(
      (upload) =>
        !upload.isArchived &&
        (
          upload.status ===
            'VALIDATED' ||
          upload.status ===
            'PARTIALLY_VALIDATED' ||
          upload.status ===
            'COMPLETED'
        ),
    )

  const correctionUploads =
    readyUploads.filter(
      (upload) =>
        Boolean(
          getObjectId(
            upload
              .correctionOfUploadId,
          ),
        ),
    )

  const originalsWithCorrections =
    new Set(
      correctionUploads
        .map((upload) =>
          getObjectId(
            upload
              .correctionOfUploadId,
          ),
        )
        .filter(Boolean),
    )

  const latestCorrectionByOriginal =
    new Map()

  for (
    const upload
    of correctionUploads
  ) {
    const originalId =
      getObjectId(
        upload
          .correctionOfUploadId,
      )

    if (!originalId) {
      continue
    }

    const current =
      latestCorrectionByOriginal.get(
        originalId,
      )

    if (
      !current ||
      new Date(
        upload.createdAt || 0,
      ).getTime() >
        new Date(
          current.createdAt || 0,
        ).getTime()
    ) {
      latestCorrectionByOriginal.set(
        originalId,
        upload,
      )
    }
  }

  return readyUploads.filter(
    (upload) => {
      const uploadId =
        getObjectId(
          upload._id,
        )

      /*
       * Hide the immutable original once a
       * correction chain exists.
       */
      if (
        originalsWithCorrections.has(
          uploadId,
        )
      ) {
        return false
      }

      const originalId =
        getObjectId(
          upload
            .correctionOfUploadId,
        )

      if (!originalId) {
        return true
      }

      /*
       * Hide older corrected attempts.
       *
       * BankSync backend still checks that
       * this latest candidate is the actual
       * verified correctedUploadId.
       */
      const latest =
        latestCorrectionByOriginal.get(
          originalId,
        )

      return (
        getObjectId(
          latest?._id,
        ) === uploadId
      )
    },
  )
}

function ReconciliationPage() {
  const [currentUser, setCurrentUser] =
    useState(null)

  const [uploads, setUploads] =
    useState([])

  const [
    reconciliations,
    setReconciliations,
  ] = useState([])

  const [
    profiles,
    setProfiles,
  ] = useState([])

  const [
    profileKey,
    setProfileKey,
  ] = useState('')

  const [
    sourceUploadId,
    setSourceUploadId,
  ] = useState('')

  const [
    targetUploadId,
    setTargetUploadId,
  ] = useState('')

  const [loading, setLoading] =
    useState(true)

  const [creating, setCreating] =
    useState(false)

  const [retryingId, setRetryingId] =
    useState(null)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const canCreate =
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'IMPORT_OFFICER'

  const currentUserId =
    currentUser?._id ||
    currentUser?.id ||
    currentUser?.userId

  const loadReconciliations =
    useCallback(async () => {
      const response =
        await apiRequest('/reconciliations')

      setReconciliations(
        response.data || [],
      )
    }, [])

  const loadPageData =
    useCallback(async () => {
      setLoading(true)
      setError('')

      try {
        const meResponse =
          await apiRequest('/auth/me')

        const user = meResponse.data

        setCurrentUser(user)

        const requests = [
          apiRequest('/reconciliations'),
        ]

        if (
          user?.role === 'ADMIN' ||
          user?.role === 'IMPORT_OFFICER'
        ) {
          requests.push(
            apiRequest(
              '/reconciliations/profiles',
            ),
          )

          requests.push(
            apiRequest('/uploads'),
          )
        }

        const responses =
          await Promise.all(requests)

        setReconciliations(
          responses[0]?.data || [],
        )

        if (responses[1]) {
          setProfiles(
            responses[1]?.data || [],
          )
        }

        if (responses[2]) {
          setUploads(
            responses[2]?.data || [],
          )
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }, [])

  useEffect(() => {
    loadPageData()
  }, [loadPageData])

  const eligibleUploads =
    useMemo(
      () =>
        getVisibleReconciliationUploads(
          uploads,
        ),
      [uploads],
    )

  const selectedProfile =
    useMemo(
      () =>
        profiles.find(
          (profile) =>
            profile.key === profileKey,
        ) || null,
      [profiles, profileKey],
    )

  /*
   * The selected Reconciliation Profile
   * decides which banking systems may appear
   * on each side.
   *
   * Example:
   * ATM_TO_CBS
   *
   * Source dropdown -> ATM uploads only
   * Target dropdown -> CBS uploads only
   *
   * The backend independently enforces the
   * same rule and remains the final authority.
   */
  const sourceCandidates =
    useMemo(
      () => {
        if (!selectedProfile) {
          return []
        }

        return eligibleUploads.filter(
          (upload) =>
            upload.sourceSystem ===
            selectedProfile.sourceSystem,
        )
      },
      [
        eligibleUploads,
        selectedProfile,
      ],
    )

  const targetCandidates =
    useMemo(
      () => {
        if (!selectedProfile) {
          return []
        }

        return eligibleUploads.filter(
          (upload) =>
            upload.sourceSystem ===
              selectedProfile.targetSystem &&
            upload._id !==
              sourceUploadId,
        )
      },
      [
        eligibleUploads,
        selectedProfile,
        sourceUploadId,
      ],
    )

  const canRetryReconciliation = (
    reconciliation,
  ) => {
    if (
      reconciliation.status !== 'FAILED'
    ) {
      return false
    }

    /*
     * Legacy reconciliations were created
     * before pairing profiles existed.
     *
     * The backend intentionally blocks retry
     * for those runs, so the frontend should
     * not display a Retry button for them.
     */
    if (!reconciliation.profileKey) {
      return false
    }

    if (currentUser?.role === 'ADMIN') {
      return true
    }

    if (
      currentUser?.role !==
      'IMPORT_OFFICER'
    ) {
      return false
    }

    const startedById =
      reconciliation.startedBy?._id ||
      reconciliation.startedBy

    return (
      currentUserId &&
      startedById &&
      String(currentUserId) ===
      String(startedById)
    )
  }

  const handleCreate = async (
    event,
  ) => {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!profileKey) {
      setError(
        'Select a reconciliation profile first.',
      )
      return
    }

    if (
      !sourceUploadId ||
      !targetUploadId
    ) {
      setError(
        'Select both source and target uploads.',
      )
      return
    }

    if (
      sourceUploadId === targetUploadId
    ) {
      setError(
        'Source and target uploads must be different.',
      )
      return
    }

    setCreating(true)

    try {
      const response =
        await apiRequest(
          '/reconciliations',
          {
            method: 'POST',
            body: JSON.stringify({
              profileKey,
              sourceUploadId,
              targetUploadId,
            }),
          },
        )

      setSuccess(
        response.message ||
        'Reconciliation completed successfully.',
      )

      setProfileKey('')
      setSourceUploadId('')
      setTargetUploadId('')

      await loadReconciliations()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleRetry = async (
    reconciliationId,
  ) => {
    setRetryingId(reconciliationId)
    setError('')
    setSuccess('')

    try {
      const response =
        await apiRequest(
          `/reconciliations/${reconciliationId}/retry`,
          {
            method: 'POST',
          },
        )

      setSuccess(
        response.message ||
        'Reconciliation retried successfully.',
      )

      await loadReconciliations()
    } catch (err) {
      setError(err.message)
    } finally {
      setRetryingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-medium text-stone-500">
          Loading reconciliations...
        </p>
      </div>
    )
  }

  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <ArrowRightLeft size={22} />
            </div>

            <div>
              <p className="text-sm font-medium text-amber-600">
                Transaction Matching
              </p>

              <h1 className="mt-1 text-2xl font-semibold text-stone-900">
                Reconciliation
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
                Reconcile only bank-approved system pairs. Each reconciliation
                profile defines where the business event originates, where its
                corresponding posting should appear, and why those two datasets
                belong together.
              </p>
            </div>
          </div>
        </section>

        {canCreate && (
          <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <FileSearch
                size={20}
                className="text-amber-600"
              />

              <div>
                <h2 className="font-semibold text-stone-900">
                  Start reconciliation
                </h2>

                <p className="mt-1 text-sm text-stone-500">
                  First choose the business reconciliation profile. BankSync
                  then shows only Source and Target uploads that belong to that
                  approved system pair.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleCreate}
              className="mt-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="reconciliationProfile"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Reconciliation profile
                </label>

                <select
                  id="reconciliationProfile"
                  value={profileKey}
                  onChange={(event) => {
                    setProfileKey(
                      event.target.value,
                    )

                    /*
                     * A new profile may require a
                     * completely different banking
                     * system pair, so clear both file
                     * selections immediately.
                     */
                    setSourceUploadId('')
                    setTargetUploadId('')
                    setError('')
                    setSuccess('')
                  }}
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                >
                  <option value="">
                    Select reconciliation profile
                  </option>

                  {profiles.map(
                    (profile) => (
                      <option
                        key={profile.key}
                        value={profile.key}
                      >
                        {profile.name}
                        {' — '}
                        {formatSystem(profile.sourceSystem)}
                        {' → '}
                        {formatSystem(profile.targetSystem)}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {selectedProfile && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-700">
                      Source: {formatSystem(selectedProfile.sourceSystem)}
                    </span>

                    <ArrowRightLeft
                      size={16}
                      className="text-amber-600"
                    />

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-700">
                      Target: {formatSystem(selectedProfile.targetSystem)}
                    </span>
                  </div>

                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Why this pair?
                  </p>

                  <p className="mt-1 text-sm leading-6 text-stone-700">
                    {selectedProfile.businessReason}
                  </p>

                  <p className="mt-2 text-xs leading-5 text-stone-500">
                    Files from other banking systems are intentionally excluded
                    because they do not represent the two sides of this
                    configured business control.
                  </p>
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
                <div>
                  <label
                    htmlFor="sourceUpload"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    Source upload
                    {selectedProfile
                      ? ` — ${formatSystem(selectedProfile.sourceSystem)}`
                      : ''}
                  </label>

                  <select
                    id="sourceUpload"
                    value={sourceUploadId}
                    disabled={!selectedProfile}
                    onChange={(event) => {
                      const value =
                        event.target.value

                      setSourceUploadId(value)

                      if (
                        value ===
                        targetUploadId
                      ) {
                        setTargetUploadId('')
                      }

                      setError('')
                    }}
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400"
                  >
                    <option value="">
                      {selectedProfile
                        ? `Select ${formatSystem(selectedProfile.sourceSystem)} source file`
                        : 'Select a profile first'}
                    </option>

                    {sourceCandidates.map(
                      (upload) => (
                        <option
                          key={upload._id}
                          value={upload._id}
                        >
                          {upload.originalName}
                          {' — '}
                          {formatSystem(
                          upload.sourceSystem,
                        )}
                          {upload.correctionOfUploadId
                            ? ' — Verified correction candidate'
                            : ''}
                        </option>
                      ),
                    )}
                  </select>

                  {selectedProfile &&
                    sourceCandidates.length ===
                      0 && (
                      <p className="mt-2 text-xs leading-5 text-amber-700">
                        No reconciliation-ready{' '}
                        {
                          formatSystem(
                            selectedProfile.sourceSystem,
                          )
                        }{' '}
                        upload is currently available.
                      </p>
                    )}
                </div>

                <div className="hidden items-end justify-center pb-3 lg:flex">
                  <ArrowRightLeft
                    size={20}
                    className="text-stone-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="targetUpload"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    Target upload
                    {selectedProfile
                      ? ` — ${formatSystem(selectedProfile.targetSystem)}`
                      : ''}
                  </label>

                  <select
                    id="targetUpload"
                    value={targetUploadId}
                    disabled={!selectedProfile}
                    onChange={(event) => {
                      setTargetUploadId(
                        event.target.value,
                      )

                      setError('')
                    }}
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400"
                  >
                    <option value="">
                      {selectedProfile
                        ? `Select ${formatSystem(selectedProfile.targetSystem)} target file`
                        : 'Select a profile first'}
                    </option>

                    {targetCandidates.map(
                      (upload) => (
                        <option
                          key={upload._id}
                          value={upload._id}
                        >
                          {upload.originalName}
                          {' — '}
                          {formatSystem(
                          upload.sourceSystem,
                        )}
                          {upload.correctionOfUploadId
                            ? ' — Verified correction candidate'
                            : ''}
                        </option>
                      ),
                    )}
                  </select>

                  {selectedProfile &&
                    targetCandidates.length ===
                      0 && (
                      <p className="mt-2 text-xs leading-5 text-amber-700">
                        No reconciliation-ready{' '}
                        {
                          formatSystem(
                            selectedProfile.targetSystem,
                          )
                        }{' '}
                        upload is currently available.
                      </p>
                    )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-5">
                <p className="max-w-2xl text-xs leading-5 text-stone-500">
                  BankSync also checks archived files, Data Quality issues,
                  correction status, and superseded upload versions on the
                  backend before allowing the reconciliation to run.
                </p>

                <button
                  type="submit"
                  disabled={
                    creating ||
                    !profileKey ||
                    !sourceUploadId ||
                    !targetUploadId
                  }
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RefreshCw
                    size={16}
                    className={
                      creating
                        ? 'animate-spin'
                        : ''
                    }
                  />

                  {creating
                    ? 'Reconciling...'
                    : 'Run reconciliation'}
                </button>
              </div>
            </form>

            {profiles.length === 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                No reconciliation profiles are available. BankSync will not
                allow arbitrary file pairing.
              </div>
            )}
          </section>
        )}

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

        <section className="mt-6 rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 px-6 py-5">
            <p className="text-sm font-medium text-amber-600">
              Reconciliation History
            </p>

            <h2 className="mt-1 text-xl font-semibold text-stone-900">
              Previous runs
            </h2>
          </div>

          {reconciliations.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-stone-500">
                No reconciliation runs found.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Profile
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Source
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Target
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Status
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Results
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Started By
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Created
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-100">
                  {reconciliations.map(
                    (reconciliation) => (
                      <tr
                        key={
                          reconciliation._id
                        }
                        className="transition hover:bg-stone-50"
                      >
                        <td className="min-w-[260px] px-6 py-4">
                          <p className="text-sm font-medium text-stone-800">
                            {reconciliation
                              .profileName ||
                              'Legacy reconciliation'}
                          </p>

                          <p className="mt-1 text-xs text-stone-400">
                            {reconciliation
                              .profileKey ||
                              'No profile recorded'}
                          </p>

                          {reconciliation
                            .businessReason && (
                            <p className="mt-2 max-w-xs text-xs leading-5 text-stone-500">
                              {
                                reconciliation.businessReason
                              }
                            </p>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4">
                          <p className="text-sm font-medium text-stone-800">
                            {reconciliation
                              .sourceUploadId
                              ?.originalName ||
                              '—'}
                          </p>

                          <p className="mt-1 text-xs text-stone-400">
                            {formatSystem(
                              reconciliation
                                .sourceUploadId
                                ?.sourceSystem,
                            )}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-6 py-4">
                          <p className="text-sm font-medium text-stone-800">
                            {reconciliation
                              .targetUploadId
                              ?.originalName ||
                              '—'}
                          </p>

                          <p className="mt-1 text-xs text-stone-400">
                            {formatSystem(
                              reconciliation
                                .targetUploadId
                                ?.sourceSystem,
                            )}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
                              reconciliation.status,
                            )}`}
                          >
                            {formatStatus(
                              reconciliation.status,
                            )}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          {reconciliation.status ===
                            'COMPLETED' ? (
                            <div className="min-w-[210px] space-y-1 text-xs">
                              <div className="flex items-center gap-2 text-emerald-700">
                                <CheckCircle2
                                  size={14}
                                />

                                {
                                  reconciliation.matchedCount
                                }{' '}
                                matched
                              </div>

                              <div className="text-stone-500">
                                {
                                  reconciliation.probableMatchCount
                                }{' '}
                                probable
                                {' · '}
                                {
                                  reconciliation.unmatchedCount
                                }{' '}
                                unmatched
                                {' · '}
                                {
                                  reconciliation.mismatchCount
                                }{' '}
                                mismatched
                              </div>
                            </div>
                          ) : reconciliation.status ===
                            'FAILED' ? (
                            <div className="flex items-center gap-2 text-xs text-red-600">
                              <TriangleAlert
                                size={14}
                              />

                              Processing failed
                            </div>
                          ) : (
                            <span className="text-xs text-stone-400">
                              Processing
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4">
                          <p className="text-sm text-stone-700">
                            {reconciliation
                              .startedBy
                              ?.name || '—'}
                          </p>

                          <p className="mt-1 text-xs text-stone-400">
                            {reconciliation
                              .startedBy
                              ?.role || ''}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-500">
                          {formatDate(
                            reconciliation.createdAt,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4">
                          {reconciliation.status ===
                            'COMPLETED' ? (
                            <Link
                              to={`/reconciliation/${reconciliation._id}/results`}
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 hover:text-stone-950"
                            >
                              <Eye size={15} />

                              View Results
                            </Link>
                          ) : canRetryReconciliation(
                            reconciliation,
                          ) ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleRetry(
                                  reconciliation._id,
                                )
                              }
                              disabled={
                                retryingId ===
                                reconciliation._id
                              }
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <RefreshCw
                                size={15}
                                className={
                                  retryingId ===
                                    reconciliation._id
                                    ? 'animate-spin'
                                    : ''
                                }
                              />

                              {retryingId ===
                                reconciliation._id
                                ? 'Retrying...'
                                : 'Retry'}
                            </button>
                          ) : (
                            <span className="text-xs text-stone-400">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default ReconciliationPage