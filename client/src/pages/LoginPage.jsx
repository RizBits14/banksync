import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Send,
  ShieldCheck,
  UserPlus,
  UserRound,
  X,
} from 'lucide-react'

import { apiRequest } from '../services/api'

function LoginPage() {
  const navigate = useNavigate()

  /*
   * LOGIN
   */
  const [showPassword, setShowPassword] =
    useState(false)

  const [email, setEmail] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  /*
   * ACCOUNT REQUEST
   */
  const [
    requestModalOpen,
    setRequestModalOpen,
  ] = useState(false)

  const [
    requestName,
    setRequestName,
  ] = useState('')

  const [
    requestEmail,
    setRequestEmail,
  ] = useState('')

  const [
    requestError,
    setRequestError,
  ] = useState('')

  const [
    requestMessage,
    setRequestMessage,
  ] = useState('')

  const [
    requestLoading,
    setRequestLoading,
  ] = useState(false)

  /*
   * ----------------------------------------
   * LOGIN
   * ----------------------------------------
   */
  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault()

    setLoading(true)
    setError('')

    try {
      /*
       * Step 1:
       * Authenticate with the entered
       * BankSync User ID and password.
       */
      await apiRequest(
        '/auth/login',
        {
          method: 'POST',

          body:
            JSON.stringify({
              email:
                email
                  .trim()
                  .toLowerCase(),

              password,
            }),
        },
      )

      /*
       * Step 2:
       * Load the authenticated user.
       */
      const meResponse =
        await apiRequest(
          '/auth/me',
        )

      const user =
        meResponse.data

      /*
       * Step 3:
       * A newly created employee using
       * a temporary password cannot
       * enter the workspace yet.
       */
      if (
        user.mustChangePassword
      ) {
        navigate(
          '/change-password',
          {
            replace: true,
          },
        )

        return
      }

      /*
       * Step 4:
       * Normal role-based routing.
       */
      if (
        user.role ===
        'IMPORT_OFFICER'
      ) {
        navigate(
          '/uploads',
          {
            replace: true,
          },
        )

        return
      }

      if (
        user.role ===
        'MAKER'
      ) {
        navigate(
          '/cases',
          {
            replace: true,
          },
        )

        return
      }

      /*
       * ADMIN
       * CHECKER
       * AUDITOR
       * OPERATIONS_MANAGER
       */
      navigate(
        '/dashboard',
        {
          replace: true,
        },
      )
    } catch (err) {
      setError(
        err.message ||
          'Unable to sign in.',
      )
    } finally {
      setLoading(false)
    }
  }

  /*
   * ----------------------------------------
   * OPEN REQUEST FORM
   * ----------------------------------------
   */
  const openRequestModal =
    () => {
      setRequestName('')
      setRequestEmail('')
      setRequestError('')
      setRequestMessage('')

      setRequestModalOpen(
        true,
      )
    }

  /*
   * ----------------------------------------
   * CLOSE REQUEST FORM
   * ----------------------------------------
   */
  const closeRequestModal =
    () => {
      if (requestLoading) {
        return
      }

      setRequestModalOpen(
        false,
      )

      setRequestError('')
      setRequestMessage('')
    }

  /*
   * ----------------------------------------
   * SUBMIT ACCOUNT REQUEST
   * ----------------------------------------
   */
  const handleAccountRequest =
    async (event) => {
      event.preventDefault()

      setRequestError('')
      setRequestMessage('')

      const cleanName =
        requestName.trim()

      const cleanEmail =
        requestEmail
          .trim()
          .toLowerCase()

      if (
        cleanName.length < 2
      ) {
        setRequestError(
          'Please enter your full name.',
        )

        return
      }

      if (
        !cleanEmail ||
        !cleanEmail.includes(
          '@',
        )
      ) {
        setRequestError(
          'Please enter a valid email address.',
        )

        return
      }

      try {
        setRequestLoading(
          true,
        )

        const response =
          await apiRequest(
            '/account-requests',
            {
              method: 'POST',

              body:
                JSON.stringify({
                  name:
                    cleanName,

                  email:
                    cleanEmail,
                }),
            },
          )

        setRequestMessage(
          response.message ||
            'Account request submitted successfully.',
        )

        setRequestName('')
        setRequestEmail('')
      } catch (err) {
        setRequestError(
          err.message ||
            'Unable to submit account request.',
        )
      } finally {
        setRequestLoading(
          false,
        )
      }
    }

  return (
    <>
      <main className="min-h-screen bg-stone-100">
        <div className="min-h-screen lg:grid lg:grid-cols-2">

          {/* LEFT SECTION */}
          <section className="hidden flex-col justify-between bg-stone-900 px-12 py-10 text-white lg:flex">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-stone-950">
                <ShieldCheck
                  size={24}
                  strokeWidth={2.2}
                />
              </div>

              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  BankSync
                </h1>

                <p className="text-sm text-stone-400">
                  Reconciliation Platform
                </p>
              </div>
            </div>

            <div className="max-w-lg">
              <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-amber-400">
                Secure. Accurate. Controlled.
              </p>

              <h2 className="text-4xl font-semibold leading-tight tracking-tight">
                Keep every transaction aligned across your banking systems.
              </h2>

              <p className="mt-5 max-w-md text-base leading-7 text-stone-400">
                Upload transaction
                data, reconcile
                records, investigate
                exceptions, and manage
                approval workflows
                from one secure
                platform.
              </p>
            </div>

            <p className="text-sm text-stone-500">
              Internal banking operations system
            </p>
          </section>

          {/* LOGIN SECTION */}
          <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
            <div className="w-full max-w-md">

              {/* MOBILE BRANDING */}
              <div className="mb-10 flex items-center gap-3 lg:hidden">
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

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold tracking-tight text-stone-900">
                    Welcome back
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    Sign in with your
                    BankSync account to
                    continue.
                  </p>
                </div>

                <form
                  onSubmit={
                    handleSubmit
                  }
                  className="space-y-5"
                >
                  {/* USER ID */}
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-medium text-stone-700"
                    >
                      BankSync User ID
                    </label>

                    <div className="relative">
                      <Mail
                        size={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                      />

                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(
                          event,
                        ) =>
                          setEmail(
                            event.target
                              .value,
                          )
                        }
                        placeholder="you@banksync.com"
                        required
                        autoComplete="username"
                        className="h-12 w-full rounded-xl border border-stone-300 bg-white pl-11 pr-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                      />
                    </div>
                  </div>

                  {/* PASSWORD */}
                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm font-medium text-stone-700"
                    >
                      Password
                    </label>

                    <div className="relative">
                      <LockKeyhole
                        size={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                      />

                      <input
                        id="password"
                        type={
                          showPassword
                            ? 'text'
                            : 'password'
                        }
                        value={
                          password
                        }
                        onChange={(
                          event,
                        ) =>
                          setPassword(
                            event.target
                              .value,
                          )
                        }
                        placeholder="Enter your password"
                        required
                        autoComplete="current-password"
                        className="h-12 w-full rounded-xl border border-stone-300 bg-white pl-11 pr-12 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (
                              current,
                            ) =>
                              !current,
                          )
                        }
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 transition hover:text-stone-700"
                        aria-label={
                          showPassword
                            ? 'Hide password'
                            : 'Show password'
                        }
                      >
                        {showPassword ? (
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

                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      loading
                    }
                    className="flex h-12 w-full items-center justify-center rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading
                      ? 'Signing in...'
                      : 'Sign in'}
                  </button>
                </form>

                {/* REQUEST ACCOUNT */}
                <div className="mt-6 border-t border-stone-100 pt-6">
                  <p className="text-center text-sm text-stone-500">
                    New employee?
                  </p>

                  <button
                    type="button"
                    onClick={
                      openRequestModal
                    }
                    className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-stone-900"
                  >
                    <UserPlus
                      size={17}
                    />

                    Request an Account
                  </button>

                  <p className="mt-4 text-center text-xs leading-5 text-stone-400">
                    Access is restricted
                    to authorized
                    BankSync users.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ACCOUNT REQUEST MODAL */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white shadow-2xl">

            <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <UserPlus
                    size={20}
                  />
                </div>

                <h2 className="mt-4 text-xl font-semibold text-stone-900">
                  Request BankSync Account
                </h2>

                <p className="mt-2 text-sm leading-6 text-stone-500">
                  Submit your name and
                  email. An
                  administrator will
                  review your request.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeRequestModal
                }
                disabled={
                  requestLoading
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50"
                aria-label="Close request form"
              >
                <X
                  size={18}
                />
              </button>
            </div>

            <form
              onSubmit={
                handleAccountRequest
              }
              className="p-6"
            >
              {/* NAME */}
              <div>
                <label
                  htmlFor="requestName"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Full Name
                </label>

                <div className="relative">
                  <UserRound
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                  />

                  <input
                    id="requestName"
                    type="text"
                    value={
                      requestName
                    }
                    disabled={
                      requestLoading
                    }
                    onChange={(
                      event,
                    ) => {
                      setRequestName(
                        event.target
                          .value,
                      )

                      setRequestError(
                        '',
                      )

                      setRequestMessage(
                        '',
                      )
                    }}
                    placeholder="Enter your full name"
                    autoFocus
                    className="h-12 w-full rounded-xl border border-stone-300 bg-white pl-11 pr-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 disabled:bg-stone-50"
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div className="mt-5">
                <label
                  htmlFor="requestEmail"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Email Address
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                  />

                  <input
                    id="requestEmail"
                    type="email"
                    value={
                      requestEmail
                    }
                    disabled={
                      requestLoading
                    }
                    onChange={(
                      event,
                    ) => {
                      setRequestEmail(
                        event.target
                          .value,
                      )

                      setRequestError(
                        '',
                      )

                      setRequestMessage(
                        '',
                      )
                    }}
                    placeholder="employee@example.com"
                    className="h-12 w-full rounded-xl border border-stone-300 bg-white pl-11 pr-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 disabled:bg-stone-50"
                  />
                </div>

                <p className="mt-2 text-xs leading-5 text-stone-400">
                  If approved, your
                  BankSync User ID and
                  temporary password
                  will be sent to this
                  email.
                </p>
              </div>

              {requestError && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {requestError}
                </div>
              )}

              {requestMessage && (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
                  {requestMessage}
                </div>
              )}

              <div className="mt-6 flex gap-3 border-t border-stone-100 pt-5">
                <button
                  type="button"
                  onClick={
                    closeRequestModal
                  }
                  disabled={
                    requestLoading
                  }
                  className="h-11 flex-1 rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
                >
                  {requestMessage
                    ? 'Close'
                    : 'Cancel'}
                </button>

                {!requestMessage && (
                  <button
                    type="submit"
                    disabled={
                      requestLoading
                    }
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Send
                      size={16}
                    />

                    {requestLoading
                      ? 'Submitting...'
                      : 'Submit Request'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default LoginPage