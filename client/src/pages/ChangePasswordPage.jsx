import {
  useEffect,
  useState,
} from 'react'

import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  apiRequest,
} from '../services/api'

function getHomeRoute(role) {
  if (
    role ===
    'IMPORT_OFFICER'
  ) {
    return '/uploads'
  }

  if (
    role ===
    'MAKER'
  ) {
    return '/cases'
  }

  return '/dashboard'
}

function ChangePasswordPage() {
  const navigate =
    useNavigate()

  const [
    currentUser,
    setCurrentUser,
  ] = useState(null)

  const [
    loadingUser,
    setLoadingUser,
  ] = useState(true)

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState('')

  const [
    newPassword,
    setNewPassword,
  ] = useState('')

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('')

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] = useState(false)

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false)

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false)

  const [
    submitting,
    setSubmitting,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    success,
    setSuccess,
  ] = useState('')

  /*
   * ----------------------------------------
   * LOAD CURRENT USER
   * ----------------------------------------
   */
  useEffect(() => {
    const loadCurrentUser =
      async () => {
        try {
          setLoadingUser(true)

          const response =
            await apiRequest(
              '/auth/me',
            )

          const user =
            response.data

          setCurrentUser(
            user,
          )

          /*
           * If this user has already
           * changed the temporary password,
           * there is no reason to remain
           * on this page.
           */
          if (
            !user.mustChangePassword
          ) {
            navigate(
              getHomeRoute(
                user.role,
              ),
              {
                replace: true,
              },
            )
          }
        } catch {
          navigate(
            '/',
            {
              replace: true,
            },
          )
        } finally {
          setLoadingUser(
            false,
          )
        }
      }

    loadCurrentUser()
  }, [navigate])

  /*
   * ----------------------------------------
   * PASSWORD RULES
   * ----------------------------------------
   */
  const hasLength =
    newPassword.length >= 8

  const hasUppercase =
    /[A-Z]/.test(
      newPassword,
    )

  const hasLowercase =
    /[a-z]/.test(
      newPassword,
    )

  const hasNumber =
    /[0-9]/.test(
      newPassword,
    )

  const passwordsMatch =
    newPassword.length > 0 &&
    newPassword ===
      confirmPassword

  const passwordValid =
    hasLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    passwordsMatch

  /*
   * ----------------------------------------
   * CHANGE PASSWORD
   * ----------------------------------------
   */
  const handleSubmit =
    async (event) => {
      event.preventDefault()

      setError('')
      setSuccess('')

      if (!currentPassword) {
        setError(
          'Enter your temporary password.',
        )

        return
      }

      if (
        !hasLength ||
        !hasUppercase ||
        !hasLowercase ||
        !hasNumber
      ) {
        setError(
          'Your new password does not meet the security requirements.',
        )

        return
      }

      if (
        newPassword !==
        confirmPassword
      ) {
        setError(
          'New password and confirmation do not match.',
        )

        return
      }

      try {
        setSubmitting(true)

        const response =
          await apiRequest(
            '/auth/change-password',
            {
              method: 'POST',

              body:
                JSON.stringify({
                  currentPassword,

                  newPassword,

                  confirmPassword,
                }),
            },
          )

        setSuccess(
          response.message ||
            'Password changed successfully.',
        )

        /*
         * Small delay so the employee
         * can see the success state.
         */
        window.setTimeout(
          () => {
            navigate(
              getHomeRoute(
                currentUser?.role,
              ),
              {
                replace: true,
              },
            )
          },
          1000,
        )
      } catch (err) {
        setError(
          err.message ||
            'Unable to change password.',
        )
      } finally {
        setSubmitting(false)
      }
    }

  if (loadingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100">
        <p className="text-sm font-medium text-stone-500">
          Loading BankSync...
        </p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-stone-100">
      <div className="min-h-screen lg:grid lg:grid-cols-2">

        {/* LEFT SIDE */}
        <section className="hidden flex-col justify-between bg-stone-900 px-12 py-10 text-white lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-stone-950">
              <ShieldCheck
                size={24}
                strokeWidth={2.2}
              />
            </div>

            <div>
              <h1 className="text-xl font-semibold">
                BankSync
              </h1>

              <p className="text-sm text-stone-400">
                Reconciliation Platform
              </p>
            </div>
          </div>

          <div className="max-w-lg">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-amber-400">
              First Login Security
            </p>

            <h2 className="text-4xl font-semibold leading-tight tracking-tight">
              Protect your account before entering BankSync.
            </h2>

            <p className="mt-5 max-w-md text-base leading-7 text-stone-400">
              Your temporary password
              was provided only for your
              first sign-in. Create your
              own secure password before
              accessing banking
              operations.
            </p>
          </div>

          <p className="text-sm text-stone-500">
            Internal banking operations system
          </p>
        </section>

        {/* CHANGE PASSWORD */}
        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">

            {/* MOBILE BRAND */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-900 text-amber-400">
                <ShieldCheck
                  size={24}
                />
              </div>

              <div>
                <h1 className="text-xl font-semibold text-stone-900">
                  BankSync
                </h1>

                <p className="text-sm text-stone-500">
                  Reconciliation Platform
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <KeyRound
                  size={22}
                />
              </div>

              <div className="mt-5">
                <p className="text-sm font-medium text-amber-600">
                  First login
                </p>

                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">
                  Change your password
                </h2>

                <p className="mt-2 text-sm leading-6 text-stone-500">
                  Welcome{' '}
                  <strong className="font-semibold text-stone-700">
                    {currentUser?.name}
                  </strong>
                  . You must replace your
                  temporary password
                  before continuing.
                </p>
              </div>

              <form
                onSubmit={
                  handleSubmit
                }
                className="mt-7 space-y-5"
              >

                {/* CURRENT PASSWORD */}
                <div>
                  <label
                    htmlFor="currentPassword"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    Temporary Password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                    />

                    <input
                      id="currentPassword"
                      type={
                        showCurrentPassword
                          ? 'text'
                          : 'password'
                      }
                      value={
                        currentPassword
                      }
                      onChange={(
                        event,
                      ) => {
                        setCurrentPassword(
                          event.target
                            .value,
                        )

                        setError('')
                      }}
                      placeholder="Enter temporary password"
                      autoFocus
                      className="h-12 w-full rounded-xl border border-stone-300 bg-white pl-11 pr-12 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowCurrentPassword(
                          (
                            current,
                          ) =>
                            !current,
                        )
                      }
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                    >
                      {showCurrentPassword ? (
                        <EyeOff
                          size={18}
                        />
                      ) : (
                        <Eye
                          size={18}
                        />
                      )}
                    </button>
                  </div>
                </div>

                {/* NEW PASSWORD */}
                <div>
                  <label
                    htmlFor="newPassword"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    New Password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                    />

                    <input
                      id="newPassword"
                      type={
                        showNewPassword
                          ? 'text'
                          : 'password'
                      }
                      value={
                        newPassword
                      }
                      onChange={(
                        event,
                      ) => {
                        setNewPassword(
                          event.target
                            .value,
                        )

                        setError('')
                      }}
                      placeholder="Create a new password"
                      className="h-12 w-full rounded-xl border border-stone-300 bg-white pl-11 pr-12 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowNewPassword(
                          (
                            current,
                          ) =>
                            !current,
                        )
                      }
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                    >
                      {showNewPassword ? (
                        <EyeOff
                          size={18}
                        />
                      ) : (
                        <Eye
                          size={18}
                        />
                      )}
                    </button>
                  </div>
                </div>

                {/* CONFIRM PASSWORD */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    Confirm New Password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                    />

                    <input
                      id="confirmPassword"
                      type={
                        showConfirmPassword
                          ? 'text'
                          : 'password'
                      }
                      value={
                        confirmPassword
                      }
                      onChange={(
                        event,
                      ) => {
                        setConfirmPassword(
                          event.target
                            .value,
                        )

                        setError('')
                      }}
                      placeholder="Re-enter new password"
                      className="h-12 w-full rounded-xl border border-stone-300 bg-white pl-11 pr-12 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (
                            current,
                          ) =>
                            !current,
                        )
                      }
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                    >
                      {showConfirmPassword ? (
                        <EyeOff
                          size={18}
                        />
                      ) : (
                        <Eye
                          size={18}
                        />
                      )}
                    </button>
                  </div>
                </div>

                {/* RULES */}
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Password requirements
                  </p>

                  <div className="mt-3 grid gap-2 text-xs">
                    <p
                      className={
                        hasLength
                          ? 'text-emerald-700'
                          : 'text-stone-500'
                      }
                    >
                      ✓ At least 8 characters
                    </p>

                    <p
                      className={
                        hasUppercase
                          ? 'text-emerald-700'
                          : 'text-stone-500'
                      }
                    >
                      ✓ At least one uppercase letter
                    </p>

                    <p
                      className={
                        hasLowercase
                          ? 'text-emerald-700'
                          : 'text-stone-500'
                      }
                    >
                      ✓ At least one lowercase letter
                    </p>

                    <p
                      className={
                        hasNumber
                          ? 'text-emerald-700'
                          : 'text-stone-500'
                      }
                    >
                      ✓ At least one number
                    </p>

                    <p
                      className={
                        passwordsMatch
                          ? 'text-emerald-700'
                          : 'text-stone-500'
                      }
                    >
                      ✓ Passwords match
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <CheckCircle2
                      size={17}
                      className="mt-0.5 shrink-0"
                    />

                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !currentPassword ||
                    !passwordValid
                  }
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting
                    ? 'Changing password...'
                    : 'Change Password & Continue'}
                </button>
              </form>

              <p className="mt-5 text-center text-xs leading-5 text-stone-400">
                You cannot access your
                BankSync workspace until
                the temporary password
                has been changed.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default ChangePasswordPage