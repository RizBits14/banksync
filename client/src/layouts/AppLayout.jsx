import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'

import Sidebar from '../components/Sidebar.jsx'
import { apiRequest } from '../services/api'

function AppLayout() {
  const navigate = useNavigate()

  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState('')

  const handleLogout = async () => {
    setLoggingOut(true)
    setError('')

    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
      })

      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 lg:flex">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <header className="border-b border-stone-200 bg-white">
          <div className="flex h-20 items-center justify-between px-5 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-600">
                BankSync
              </p>

              <p className="mt-1 text-sm font-medium text-stone-500">
                Reconciliation Platform
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex h-10 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut size={17} />

              <span className="hidden sm:inline">
                {loggingOut ? 'Signing out...' : 'Sign out'}
              </span>
            </button>
          </div>
        </header>

        {error && (
          <div className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6 lg:mx-8">
            {error}
          </div>
        )}

        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout