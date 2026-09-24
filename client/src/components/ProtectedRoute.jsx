import {
  useEffect,
  useState,
} from 'react'

import {
  Navigate,
  useLocation,
} from 'react-router-dom'

import {
  apiRequest,
} from '../services/api'

function ProtectedRoute({
  children,
  allowedRoles,
}) {
  const location =
    useLocation()

  const [loading, setLoading] =
    useState(true)

  const [user, setUser] =
    useState(null)

  useEffect(() => {
    const checkAuthentication =
      async () => {
        try {
          const response =
            await apiRequest(
              '/auth/me',
            )

          setUser(
            response.data,
          )
        } catch {
          setUser(null)
        } finally {
          setLoading(false)
        }
      }

    checkAuthentication()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100">
        <p className="text-sm font-medium text-stone-500">
          Loading BankSync...
        </p>
      </div>
    )
  }

  if (!user) {
    return (
      <Navigate
        to="/"
        replace
      />
    )
  }

  /*
   * FIRST-LOGIN SECURITY GATE
   *
   * A user signed in with a temporary password
   * must not be able to bypass password change
   * by manually entering another protected URL.
   *
   * While mustChangePassword is true, every
   * protected BankSync route is redirected to
   * /change-password.
   */
  if (
    user.mustChangePassword &&
    location.pathname !==
      '/change-password'
  ) {
    return (
      <Navigate
        to="/change-password"
        replace
      />
    )
  }

  /*
   * Apply normal role authorization only after
   * the first-login password requirement has
   * been satisfied.
   */
  if (
    allowedRoles &&
    !allowedRoles.includes(
      user.role,
    )
  ) {
    if (
      user.role ===
      'IMPORT_OFFICER'
    ) {
      return (
        <Navigate
          to="/uploads"
          replace
        />
      )
    }

    return (
      <Navigate
        to="/"
        replace
      />
    )
  }

  return children
}

export default ProtectedRoute
