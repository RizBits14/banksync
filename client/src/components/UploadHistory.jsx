import { useState } from 'react'
import {
  Archive,
  Download,
  Trash2,
} from 'lucide-react'

import {
  apiDownload,
  apiRequest,
} from '../services/api'

import DeleteConfirmModal from './DeleteConfirmModal.jsx'
import ArchiveConfirmModal from './ArchiveConfirmModal.jsx'

function formatDate(dateString) {
  if (!dateString) return '—'

  return new Date(dateString).toLocaleString()
}

function formatStatus(status) {
  return status
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    )
}

function getStatusClasses(status) {
  if (status === 'PARTIALLY_VALIDATED') {
    return 'bg-amber-50 text-amber-700'
  }

  if (
    status === 'FAILED' ||
    status === 'REJECTED'
  ) {
    return 'bg-red-50 text-red-700'
  }

  return 'bg-emerald-50 text-emerald-700'
}

function UploadHistory({
  uploads = [],
  currentUser,
  onDeleteSuccess,
}) {
  const [activeTab, setActiveTab] =
    useState('active')

  const [downloadingId, setDownloadingId] =
    useState(null)

  const [deletingId, setDeletingId] =
    useState(null)

  const [archivingId, setArchivingId] =
    useState(null)

  const [selectedUpload, setSelectedUpload] =
    useState(null)

  const [
    selectedArchiveUpload,
    setSelectedArchiveUpload,
  ] = useState(null)

  const [actionError, setActionError] =
    useState('')

  const [actionSuccess, setActionSuccess] =
    useState('')

  const isAdmin =
    currentUser?.role === 'ADMIN'

  const currentUserId =
    currentUser?._id ||
    currentUser?.id ||
    currentUser?.userId

  const canDeleteUpload = (upload) => {
    if (isAdmin) {
      return true
    }

    if (
      currentUser?.role !== 'IMPORT_OFFICER'
    ) {
      return false
    }

    const uploadedById =
      upload.uploadedBy?._id ||
      upload.uploadedBy

    return (
      currentUserId &&
      uploadedById &&
      String(currentUserId) ===
      String(uploadedById)
    )
  }

  const activeUploads = uploads.filter(
    (upload) => !upload.isArchived,
  )

  const archivedUploads = uploads.filter(
    (upload) => upload.isArchived,
  )

  const displayedUploads =
    activeTab === 'archived'
      ? archivedUploads
      : activeUploads

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setActionError('')
    setActionSuccess('')
  }

  const handleDownloadRejectedRows =
    async (uploadId) => {
      setDownloadingId(uploadId)
      setActionError('')
      setActionSuccess('')

      try {
        await apiDownload(
          `/uploads/${uploadId}/rejected-rows`,
        )
      } catch (err) {
        setActionError(err.message)
      } finally {
        setDownloadingId(null)
      }
    }

  const openDeleteModal = (upload) => {
    setActionError('')
    setActionSuccess('')
    setSelectedUpload(upload)
  }

  const closeDeleteModal = () => {
    if (deletingId) {
      return
    }

    setSelectedUpload(null)
  }

  const handleDelete = async () => {
    if (!selectedUpload) {
      return
    }

    setDeletingId(selectedUpload._id)
    setActionError('')
    setActionSuccess('')

    try {
      const response = await apiRequest(
        `/uploads/${selectedUpload._id}`,
        {
          method: 'DELETE',
        },
      )

      setActionSuccess(
        response.message ||
        'Upload deleted successfully.',
      )

      setSelectedUpload(null)

      if (onDeleteSuccess) {
        await onDeleteSuccess()
      }
    } catch (err) {
      setActionError(err.message)
      setSelectedUpload(null)
    } finally {
      setDeletingId(null)
    }
  }

  const openArchiveModal = (upload) => {
    setActionError('')
    setActionSuccess('')
    setSelectedArchiveUpload(upload)
  }

  const closeArchiveModal = () => {
    if (archivingId) {
      return
    }

    setSelectedArchiveUpload(null)
  }

  const handleArchive = async () => {
    if (!selectedArchiveUpload) {
      return
    }

    setArchivingId(
      selectedArchiveUpload._id,
    )

    setActionError('')
    setActionSuccess('')

    try {
      const response = await apiRequest(
        `/uploads/${selectedArchiveUpload._id}/archive`,
        {
          method: 'PATCH',
        },
      )

      setActionSuccess(
        response.message ||
        'Upload archived successfully.',
      )

      setSelectedArchiveUpload(null)

      if (onDeleteSuccess) {
        await onDeleteSuccess()
      }
    } catch (err) {
      setActionError(err.message)
      setSelectedArchiveUpload(null)
    } finally {
      setArchivingId(null)
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-6 py-5">
          <p className="text-sm font-medium text-amber-600">
            Upload History
          </p>

          <h2 className="mt-1 text-xl font-semibold text-stone-900">
            Transaction files
          </h2>

          <p className="mt-2 text-sm text-stone-500">
            View active uploads and preserved archived transaction records.
          </p>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() =>
                handleTabChange('active')
              }
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === 'active'
                ? 'bg-stone-900 text-white'
                : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                }`}
            >
              Active ({activeUploads.length})
            </button>

            <button
              type="button"
              onClick={() =>
                handleTabChange('archived')
              }
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === 'archived'
                ? 'bg-stone-900 text-white'
                : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                }`}
            >
              Archived ({archivedUploads.length})
            </button>
          </div>
        </div>

        {actionError && (
          <div className="mx-6 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        )}

        {actionSuccess && (
          <div className="mx-6 mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {actionSuccess}
          </div>
        )}

        {displayedUploads.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-stone-700">
              {activeTab === 'archived'
                ? 'No archived files'
                : 'No active files'}
            </p>

            <p className="mt-1 text-sm text-stone-400">
              {activeTab === 'archived'
                ? 'Archived reconciliation records will appear here.'
                : 'Uploaded transaction files will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    File
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Source
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Status
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Rows
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Uploaded By
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Uploaded
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-stone-100">
                {displayedUploads.map(
                  (upload) => {
                    const hasRejectedRows =
                      (upload.invalidRows ??
                        0) > 0

                    return (
                      <tr
                        key={upload._id}
                        className="transition hover:bg-stone-50"
                      >
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-stone-900">
                              {
                                upload.originalName
                              }
                            </p>

                            {upload.isArchived && (
                              <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
                                Archived
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-xs text-stone-400">
                            {upload.fileName}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-600">
                          {
                            upload.sourceSystem
                          }
                        </td>

                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
                              upload.status,
                            )}`}
                          >
                            {formatStatus(
                              upload.status,
                            )}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-6 py-4">
                          <p className="text-sm font-medium text-stone-800">
                            {upload.totalRows ??
                              0}
                          </p>

                          <p className="mt-1 text-xs text-stone-400">
                            {upload.validRows ??
                              0}{' '}
                            valid /{' '}
                            {upload.invalidRows ??
                              0}{' '}
                            invalid
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-6 py-4">
                          <p className="text-sm text-stone-700">
                            {upload.uploadedBy
                              ?.name || '—'}
                          </p>

                          <p className="mt-1 text-xs text-stone-400">
                            {upload.uploadedBy
                              ?.role || ''}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-500">
                          {formatDate(
                            upload.createdAt,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-2">
                            {hasRejectedRows && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadRejectedRows(
                                    upload._id,
                                  )
                                }
                                disabled={
                                  downloadingId ===
                                  upload._id
                                }
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Download
                                  size={15}
                                />

                                {downloadingId ===
                                  upload._id
                                  ? 'Downloading...'
                                  : 'Rejected rows'}
                              </button>
                            )}

                            {activeTab ===
                              'active' &&
                              isAdmin && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openArchiveModal(
                                      upload,
                                    )
                                  }
                                  disabled={
                                    archivingId ===
                                    upload._id
                                  }
                                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Archive
                                    size={
                                      15
                                    }
                                  />

                                  Archive
                                </button>
                              )}

                            {activeTab === 'active' &&
                              canDeleteUpload(upload) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openDeleteModal(
                                      upload,
                                    )
                                  }
                                  disabled={
                                    deletingId ===
                                    upload._id
                                  }
                                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Trash2
                                    size={
                                      15
                                    }
                                  />

                                  Delete
                                </button>
                              )}

                            {activeTab ===
                              'archived' &&
                              !hasRejectedRows && (
                                <span className="text-xs text-stone-400">
                                  Preserved
                                </span>
                              )}
                          </div>
                        </td>
                      </tr>
                    )
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <DeleteConfirmModal
        open={Boolean(selectedUpload)}
        fileName={
          selectedUpload?.originalName || ''
        }
        deleting={Boolean(deletingId)}
        onCancel={closeDeleteModal}
        onConfirm={handleDelete}
      />

      <ArchiveConfirmModal
        open={Boolean(
          selectedArchiveUpload,
        )}
        fileName={
          selectedArchiveUpload
            ?.originalName || ''
        }
        archiving={Boolean(archivingId)}
        onCancel={closeArchiveModal}
        onConfirm={handleArchive}
      />
    </>
  )
}

export default UploadHistory