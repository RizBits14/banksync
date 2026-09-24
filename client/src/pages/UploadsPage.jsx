import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import { UploadCloud } from 'lucide-react'

import { apiRequest } from '../services/api'
import UploadForm from '../components/UploadForm.jsx'
import UploadHistory from '../components/UploadHistory.jsx'

function UploadsPage() {
  const [uploads, setUploads] = useState([])
  const [currentUser, setCurrentUser] =
    useState(null)

  const [loadingUploads, setLoadingUploads] =
    useState(true)

  const [error, setError] = useState('')

  const loadUploads = useCallback(async () => {
    setLoadingUploads(true)
    setError('')

    try {
      const response =
        await apiRequest('/uploads')

      setUploads(response.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingUploads(false)
    }
  }, [])

  useEffect(() => {
    const loadPageData = async () => {
      try {
        const meResponse =
          await apiRequest('/auth/me')

        setCurrentUser(meResponse.data)
      } catch (err) {
        setError(err.message)
      }
    }

    loadPageData()
    loadUploads()
  }, [loadUploads])

  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Page heading */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <UploadCloud size={22} />
            </div>

            <div>
              <p className="text-sm font-medium text-amber-600">
                Transaction Data
              </p>

              <h1 className="mt-1 text-2xl font-semibold text-stone-900">
                Uploads
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
                Upload CSV or Excel transaction files from supported banking
                systems for validation and reconciliation.
              </p>
            </div>
          </div>
        </section>

        {/* Upload form */}
        <div className="mt-6">
          <UploadForm
            onUploadSuccess={loadUploads}
          />
        </div>

        {/* Page error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Upload history */}
        <div className="mt-6">
          {loadingUploads ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-stone-500">
                Loading upload history...
              </p>
            </div>
          ) : (
            <UploadHistory
              uploads={uploads}
              currentUser={currentUser}
              onDeleteSuccess={loadUploads}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default UploadsPage