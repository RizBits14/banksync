import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  Inbox,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCog,
  Users,
  X,
  XCircle,
} from 'lucide-react'

import { apiRequest } from '../services/api'

const ROLES = [
  'ADMIN',
  'IMPORT_OFFICER',
  'MAKER',
  'CHECKER',
  'AUDITOR',
  'OPERATIONS_MANAGER',
]

const EMPTY_CREATE_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'MAKER',
}

function formatLabel(value) {
  if (!value) return '—'

  return String(value)
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    )
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString()
}

function roleClasses(role) {
  if (role === 'ADMIN') {
    return 'bg-red-50 text-red-700'
  }

  if (role === 'OPERATIONS_MANAGER') {
    return 'bg-violet-50 text-violet-700'
  }

  if (role === 'CHECKER') {
    return 'bg-blue-50 text-blue-700'
  }

  if (role === 'MAKER') {
    return 'bg-amber-50 text-amber-700'
  }

  if (role === 'AUDITOR') {
    return 'bg-emerald-50 text-emerald-700'
  }

  return 'bg-stone-100 text-stone-700'
}

function createEmailBase(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '.')
    .replace(/\.+/g, '.')
}

function generateUniqueEmail(
  name,
  users,
) {
  const base =
    createEmailBase(name)

  if (!base) {
    return ''
  }

  const existingEmails =
    new Set(
      users.map((user) =>
        String(user.email)
          .toLowerCase()
          .trim(),
      ),
    )

  const firstEmail =
    `${base}@banksync.com`

  if (
    !existingEmails.has(
      firstEmail,
    )
  ) {
    return firstEmail
  }

  let number = 2

  while (
    existingEmails.has(
      `${base}${number}@banksync.com`,
    )
  ) {
    number += 1
  }

  return `${base}${number}@banksync.com`
}

function generateTemporaryPassword() {
  const uppercase =
    'ABCDEFGHJKLMNPQRSTUVWXYZ'

  const lowercase =
    'abcdefghijkmnopqrstuvwxyz'

  const numbers =
    '23456789'

  const allCharacters =
    uppercase +
    lowercase +
    numbers

  const randomIndex = (
    characters,
  ) => {
    const values =
      new Uint32Array(1)

    window.crypto.getRandomValues(
      values,
    )

    return (
      values[0] %
      characters.length
    )
  }

  const password = [
    uppercase[
      randomIndex(uppercase)
    ],

    lowercase[
      randomIndex(lowercase)
    ],

    numbers[
      randomIndex(numbers)
    ],
  ]

  while (
    password.length < 6
  ) {
    password.push(
      allCharacters[
        randomIndex(
          allCharacters,
        )
      ],
    )
  }

  for (
    let index =
      password.length - 1;
    index > 0;
    index -= 1
  ) {
    const values =
      new Uint32Array(1)

    window.crypto.getRandomValues(
      values,
    )

    const swapIndex =
      values[0] %
      (index + 1)

    ;[
      password[index],
      password[swapIndex],
    ] = [
      password[swapIndex],
      password[index],
    ]
  }

  return password.join('')
}

function UsersPage() {
  const [
    users,
    setUsers,
  ] = useState([])

  const [
    currentUser,
    setCurrentUser,
  ] = useState(null)

  const [
    accountRequests,
    setAccountRequests,
  ] = useState([])

  const [
    requestRoles,
    setRequestRoles,
  ] = useState({})

  const [
    approvingRequestId,
    setApprovingRequestId,
  ] = useState(null)

  const [
    approvedCredentials,
    setApprovedCredentials,
  ] = useState(null)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const [
    success,
    setSuccess,
  ] = useState('')

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    roleFilter,
    setRoleFilter,
  ] = useState('ALL')

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('ALL')

  const [
    processingId,
    setProcessingId,
  ] = useState(null)

  const [
    createModalOpen,
    setCreateModalOpen,
  ] = useState(false)

  const [
    createForm,
    setCreateForm,
  ] = useState(
    EMPTY_CREATE_FORM,
  )

  const [
    creatingUser,
    setCreatingUser,
  ] = useState(false)

  const [
    createError,
    setCreateError,
  ] = useState('')

  const [
    showPassword,
    setShowPassword,
  ] = useState(false)

  const [
    copiedField,
    setCopiedField,
  ] = useState('')

  const [
    pendingAction,
    setPendingAction,
  ] = useState(null)

  /*
   * ----------------------------------------
   * LOAD USERS
   * ----------------------------------------
   */
  const loadUsers =
    useCallback(async () => {
      const response =
        await apiRequest(
          '/users',
        )

      setUsers(
        Array.isArray(
          response?.data,
        )
          ? response.data
          : [],
      )
    }, [])

  /*
   * ----------------------------------------
   * LOAD ACCOUNT REQUESTS
   * ----------------------------------------
   */
  const loadAccountRequests =
    useCallback(async () => {
      const response =
        await apiRequest(
          '/account-requests?status=PENDING',
        )

      const requests =
        Array.isArray(
          response?.data,
        )
          ? response.data
          : []

      setAccountRequests(
        requests,
      )

      setRequestRoles(
        (current) => {
          const next = {
            ...current,
          }

          requests.forEach(
            (request) => {
              if (
                !next[
                  request._id
                ]
              ) {
                next[
                  request._id
                ] = 'MAKER'
              }
            },
          )

          return next
        },
      )
    }, [])

  /*
   * ----------------------------------------
   * INITIAL PAGE LOAD
   * ----------------------------------------
   */
  useEffect(() => {
    const loadPage =
      async () => {
        try {
          setLoading(true)
          setError('')

          const [
            usersResponse,
            meResponse,
            requestsResponse,
          ] =
            await Promise.all([
              apiRequest(
                '/users',
              ),

              apiRequest(
                '/auth/me',
              ),

              apiRequest(
                '/account-requests?status=PENDING',
              ),
            ])

          setUsers(
            Array.isArray(
              usersResponse?.data,
            )
              ? usersResponse.data
              : [],
          )

          setCurrentUser(
            meResponse?.data ||
              null,
          )

          const requests =
            Array.isArray(
              requestsResponse?.data,
            )
              ? requestsResponse.data
              : []

          setAccountRequests(
            requests,
          )

          const roles = {}

          requests.forEach(
            (request) => {
              roles[
                request._id
              ] = 'MAKER'
            },
          )

          setRequestRoles(
            roles,
          )
        } catch (err) {
          setError(
            err.message ||
              'Unable to load user administration.',
          )
        } finally {
          setLoading(false)
        }
      }

    loadPage()
  }, [])

  /*
   * ----------------------------------------
   * STATISTICS
   * ----------------------------------------
   */
  const stats = useMemo(() => {
    const active =
      users.filter(
        (user) =>
          user.isActive,
      ).length

    const inactive =
      users.length -
      active

    const makers =
      users.filter(
        (user) =>
          user.role ===
            'MAKER' &&
          user.isActive,
      ).length

    const checkers =
      users.filter(
        (user) =>
          user.role ===
            'CHECKER' &&
          user.isActive,
      ).length

    return {
      total:
        users.length,

      active,

      inactive,

      makers,

      checkers,
    }
  }, [users])

  /*
   * ----------------------------------------
   * FILTER USERS
   * ----------------------------------------
   */
  const filteredUsers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase()

      return users.filter(
        (user) => {
          const matchesSearch =
            !query ||
            user.name
              ?.toLowerCase()
              .includes(
                query,
              ) ||
            user.email
              ?.toLowerCase()
              .includes(
                query,
              )

          const matchesRole =
            roleFilter ===
              'ALL' ||
            user.role ===
              roleFilter

          const matchesStatus =
            statusFilter ===
              'ALL' ||
            (statusFilter ===
              'ACTIVE' &&
              user.isActive) ||
            (statusFilter ===
              'INACTIVE' &&
              !user.isActive)

          return (
            matchesSearch &&
            matchesRole &&
            matchesStatus
          )
        },
      )
    }, [
      users,
      search,
      roleFilter,
      statusFilter,
    ])

  /*
   * ----------------------------------------
   * APPROVE ACCOUNT REQUEST
   * ----------------------------------------
   */
  const approveRequest =
    async (request) => {
      const role =
        requestRoles[
          request._id
        ] || 'MAKER'

      try {
        setApprovingRequestId(
          request._id,
        )

        setError('')
        setSuccess('')

        const response =
          await apiRequest(
            `/account-requests/${request._id}/approve`,
            {
              method: 'POST',

              body:
                JSON.stringify({
                  role,
                }),
            },
          )

        const credentials =
          response?.data
            ?.credentials

        const createdUser =
          response?.data?.user

        setApprovedCredentials(
          {
            name:
              createdUser
                ?.name ||
              request.name,

            requestedEmail:
              request.email,

            loginId:
              credentials
                ?.loginId ||
              '',

            temporaryPassword:
              credentials
                ?.temporaryPassword ||
              '',

            role:
              createdUser
                ?.role ||
              role,
          },
        )

        await Promise.all([
          loadUsers(),
          loadAccountRequests(),
        ])

        setSuccess(
          'Account request approved and BankSync account created successfully.',
        )
      } catch (err) {
        setError(
          err.message ||
            'Unable to approve account request.',
        )
      } finally {
        setApprovingRequestId(
          null,
        )
      }
    }

  /*
   * ----------------------------------------
   * MANUAL CREATE USER
   * ----------------------------------------
   */
  const openCreateModal =
    () => {
      setCreateForm({
        ...EMPTY_CREATE_FORM,
      })

      setCreateError('')
      setShowPassword(false)
      setCopiedField('')

      setCreateModalOpen(
        true,
      )
    }

  const closeCreateModal =
    () => {
      if (creatingUser) {
        return
      }

      setCreateModalOpen(
        false,
      )

      setCreateError('')
      setShowPassword(false)
      setCopiedField('')
    }

  const handleNameChange = (
    value,
  ) => {
    const generatedEmail =
      generateUniqueEmail(
        value,
        users,
      )

    setCreateForm(
      (current) => ({
        ...current,

        name:
          value,

        email:
          generatedEmail,

        password:
          value
            .trim()
            .length >= 2 &&
          !current.password
            ? generateTemporaryPassword()
            : current.password,
      }),
    )

    setCreateError('')
    setCopiedField('')
  }

  const handleRoleChange = (
    value,
  ) => {
    setCreateForm(
      (current) => ({
        ...current,

        role:
          value,
      }),
    )

    setCreateError('')
  }

  const regeneratePassword =
    () => {
      setCreateForm(
        (current) => ({
          ...current,

          password:
            generateTemporaryPassword(),
        }),
      )

      setCopiedField('')
    }

  /*
   * ----------------------------------------
   * COPY
   * ----------------------------------------
   */
  const copyValue = async (
    field,
    value,
  ) => {
    if (!value) {
      return
    }

    try {
      await navigator.clipboard.writeText(
        value,
      )

      setCopiedField(
        field,
      )

      window.setTimeout(
        () => {
          setCopiedField('')
        },
        1500,
      )
    } catch {
      setCopiedField('')
    }
  }

  const copyApprovedCredentials =
    async () => {
      if (
        !approvedCredentials
      ) {
        return
      }

      const text =
        [
          `Name: ${approvedCredentials.name}`,
          `BankSync User ID: ${approvedCredentials.loginId}`,
          `Temporary Password: ${approvedCredentials.temporaryPassword}`,
          `Role: ${formatLabel(approvedCredentials.role)}`,
        ].join('\n')

      await copyValue(
        'approved-all',
        text,
      )
    }

  /*
   * ----------------------------------------
   * MANUAL CREATE USER
   * ----------------------------------------
   */
  const handleCreateUser =
    async (event) => {
      event.preventDefault()

      const name =
        createForm.name.trim()

      const email =
        createForm.email
          .trim()
          .toLowerCase()

      const password =
        createForm.password

      const role =
        createForm.role

      if (
        name.length < 2
      ) {
        setCreateError(
          'Enter the full name first.',
        )

        return
      }

      if (!email) {
        setCreateError(
          'BankSync could not generate a login ID.',
        )

        return
      }

      if (
        password.length !==
        6
      ) {
        setCreateError(
          'Temporary password must be exactly 6 characters.',
        )

        return
      }

      if (
        !ROLES.includes(
          role,
        )
      ) {
        setCreateError(
          'Select a valid user role.',
        )

        return
      }

      try {
        setCreatingUser(true)
        setCreateError('')
        setError('')
        setSuccess('')

        const response =
          await apiRequest(
            '/auth/register',
            {
              method: 'POST',

              body:
                JSON.stringify({
                  name,
                  email,
                  password,
                  role,
                }),
            },
          )

        await loadUsers()

        setCreateModalOpen(
          false,
        )

        setCreateForm({
          ...EMPTY_CREATE_FORM,
        })

        setSuccess(
          response.message ||
            'User created successfully.',
        )

        setApprovedCredentials(
          {
            name,
            requestedEmail:
              '',

            loginId:
              email,

            temporaryPassword:
              password,

            role,
          },
        )
      } catch (err) {
        setCreateError(
          err.message ||
            'Unable to create user.',
        )
      } finally {
        setCreatingUser(false)
      }
    }

  /*
   * ----------------------------------------
   * ROLE / STATUS MANAGEMENT
   * ----------------------------------------
   */
  const requestRoleChange = (
    user,
    newRole,
  ) => {
    if (
      !newRole ||
      newRole === user.role
    ) {
      return
    }

    setPendingAction({
      type: 'ROLE',

      user,

      newRole,
    })

    setError('')
    setSuccess('')
  }

  const requestStatusChange = (
    user,
  ) => {
    setPendingAction({
      type: 'STATUS',

      user,

      nextStatus:
        !user.isActive,
    })

    setError('')
    setSuccess('')
  }

  const closeConfirmation =
    () => {
      if (processingId) {
        return
      }

      setPendingAction(null)
    }

  const executeConfirmedAction =
    async () => {
      if (!pendingAction) {
        return
      }

      const {
        user,
      } = pendingAction

      try {
        setProcessingId(
          user._id,
        )

        setError('')
        setSuccess('')

        if (
          pendingAction.type ===
          'ROLE'
        ) {
          const response =
            await apiRequest(
              `/users/${user._id}/role`,
              {
                method:
                  'PATCH',

                body:
                  JSON.stringify({
                    role:
                      pendingAction
                        .newRole,
                  }),
              },
            )

          setSuccess(
            response.message ||
              'User role updated successfully.',
          )
        }

        if (
          pendingAction.type ===
          'STATUS'
        ) {
          const response =
            await apiRequest(
              `/users/${user._id}/status`,
              {
                method:
                  'PATCH',

                body:
                  JSON.stringify({
                    isActive:
                      pendingAction
                        .nextStatus,
                  }),
              },
            )

          setSuccess(
            response.message ||
              'User status updated successfully.',
          )
        }

        await loadUsers()

        setPendingAction(
          null,
        )
      } catch (err) {
        setError(
          err.message ||
            'Unable to update user.',
        )

        setPendingAction(
          null,
        )
      } finally {
        setProcessingId(
          null,
        )
      }
    }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-medium text-stone-500">
          Loading user
          administration...
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="p-5 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">

          {/* PAGE HEADER */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Users
                    size={22}
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-amber-600">
                    Administration
                  </p>

                  <h1 className="mt-1 text-2xl font-semibold text-stone-900">
                    Users
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    Review account
                    requests, manage
                    roles, and control
                    BankSync access.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  openCreateModal
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-stone-800"
              >
                <Plus
                  size={17}
                />

                Create User
              </button>
            </div>
          </section>

          {/* STATS */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Pending Requests
              </p>

              <p className="mt-2 text-2xl font-semibold text-amber-700">
                {
                  accountRequests.length
                }
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Total Users
              </p>

              <p className="mt-2 text-2xl font-semibold text-stone-900">
                {stats.total}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Active
              </p>

              <p className="mt-2 text-2xl font-semibold text-emerald-700">
                {stats.active}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Inactive
              </p>

              <p className="mt-2 text-2xl font-semibold text-stone-700">
                {stats.inactive}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Active Makers
              </p>

              <p className="mt-2 text-2xl font-semibold text-amber-700">
                {stats.makers}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Active Checkers
              </p>

              <p className="mt-2 text-2xl font-semibold text-blue-700">
                {stats.checkers}
              </p>
            </div>
          </div>

          {/* ACCOUNT REQUESTS */}
          <section className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Inbox
                    size={19}
                  />
                </div>

                <div>
                  <h2 className="font-semibold text-stone-900">
                    Account Requests
                  </h2>

                  <p className="mt-1 text-xs text-stone-500">
                    Review pending
                    employee access
                    requests.
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                {
                  accountRequests.length
                }{' '}
                Pending
              </span>
            </div>

            {accountRequests.length ===
            0 ? (
              <div className="px-6 py-10 text-center">
                <CheckCircle2
                  size={30}
                  className="mx-auto text-emerald-500"
                />

                <p className="mt-3 text-sm font-medium text-stone-700">
                  No pending account
                  requests
                </p>

                <p className="mt-1 text-xs text-stone-400">
                  New employee requests
                  will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-stone-50">
                    <tr className="text-left text-xs font-medium uppercase tracking-wide text-stone-400">
                      <th className="px-5 py-3">
                        Employee
                      </th>

                      <th className="px-5 py-3">
                        Request Email
                      </th>

                      <th className="px-5 py-3">
                        Requested
                      </th>

                      <th className="px-5 py-3">
                        Assign Role
                      </th>

                      <th className="px-5 py-3">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-stone-100">
                    {accountRequests.map(
                      (
                        request,
                      ) => {
                        const approving =
                          approvingRequestId ===
                          request._id

                        return (
                          <tr
                            key={
                              request._id
                            }
                            className="text-sm"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600">
                                  <UserCog
                                    size={
                                      16
                                    }
                                  />
                                </div>

                                <div>
                                  <p className="font-medium text-stone-900">
                                    {
                                      request.name
                                    }
                                  </p>

                                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                    <Clock3
                                      size={
                                        11
                                      }
                                    />

                                    Pending
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-sm text-stone-600">
                              {
                                request.email
                              }
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-xs text-stone-500">
                              {formatDate(
                                request.createdAt,
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <select
                                value={
                                  requestRoles[
                                    request._id
                                  ] ||
                                  'MAKER'
                                }
                                disabled={
                                  approving
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setRequestRoles(
                                    (
                                      current,
                                    ) => ({
                                      ...current,

                                      [request._id]:
                                        event
                                          .target
                                          .value,
                                    }),
                                  )
                                }
                                className="h-10 min-w-[185px] rounded-xl border border-stone-200 bg-white px-3 text-xs text-stone-700 outline-none focus:border-amber-300 disabled:opacity-50"
                              >
                                {ROLES.map(
                                  (
                                    role,
                                  ) => (
                                    <option
                                      key={
                                        role
                                      }
                                      value={
                                        role
                                      }
                                    >
                                      {formatLabel(
                                        role,
                                      )}
                                    </option>
                                  ),
                                )}
                              </select>
                            </td>

                            <td className="px-5 py-4">
                              <button
                                type="button"
                                disabled={
                                  approving
                                }
                                onClick={() =>
                                  approveRequest(
                                    request,
                                  )
                                }
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 text-xs font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <CheckCircle2
                                  size={
                                    15
                                  }
                                />

                                {approving
                                  ? 'Creating...'
                                  : 'Approve & Create Account'}
                              </button>
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

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          {/* USER FILTERS */}
          <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px]">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                />

                <input
                  type="text"
                  value={
                    search
                  }
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Search by name or email..."
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-amber-300"
                />
              </div>

              <select
                value={
                  roleFilter
                }
                onChange={(
                  event,
                ) =>
                  setRoleFilter(
                    event.target
                      .value,
                  )
                }
                className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 outline-none"
              >
                <option value="ALL">
                  All roles
                </option>

                {ROLES.map(
                  (role) => (
                    <option
                      key={role}
                      value={role}
                    >
                      {formatLabel(
                        role,
                      )}
                    </option>
                  ),
                )}
              </select>

              <select
                value={
                  statusFilter
                }
                onChange={(
                  event,
                ) =>
                  setStatusFilter(
                    event.target
                      .value,
                  )
                }
                className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 outline-none"
              >
                <option value="ALL">
                  All statuses
                </option>

                <option value="ACTIVE">
                  Active
                </option>

                <option value="INACTIVE">
                  Inactive
                </option>
              </select>
            </div>
          </section>

          {/* USER DIRECTORY */}
          <section className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="font-semibold text-stone-900">
                  User Directory
                </h2>

                <p className="mt-1 text-xs text-stone-500">
                  {
                    filteredUsers.length
                  }{' '}
                  user
                  {filteredUsers.length ===
                  1
                    ? ''
                    : 's'}{' '}
                  shown
                </p>
              </div>

              <ShieldCheck
                size={19}
                className="text-stone-400"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-stone-50">
                  <tr className="text-left text-xs font-medium uppercase tracking-wide text-stone-400">
                    <th className="px-5 py-3">
                      User
                    </th>

                    <th className="px-5 py-3">
                      Role
                    </th>

                    <th className="px-5 py-3">
                      Status
                    </th>

                    <th className="px-5 py-3">
                      Created
                    </th>

                    <th className="px-5 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-100">
                  {filteredUsers.map(
                    (user) => {
                      const isSelf =
                        user._id ===
                        currentUser?._id

                      const processing =
                        processingId ===
                        user._id

                      return (
                        <tr
                          key={
                            user._id
                          }
                          className="text-sm"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600">
                                <UserCog
                                  size={
                                    16
                                  }
                                />
                              </div>

                              <div>
                                <p className="font-medium text-stone-900">
                                  {
                                    user.name
                                  }

                                  {isSelf && (
                                    <span className="ml-2 text-xs font-normal text-stone-400">
                                      You
                                    </span>
                                  )}
                                </p>

                                <p className="mt-0.5 text-xs text-stone-500">
                                  {
                                    user.email
                                  }
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {isSelf ? (
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${roleClasses(
                                  user.role,
                                )}`}
                              >
                                {formatLabel(
                                  user.role,
                                )}
                              </span>
                            ) : (
                              <select
                                value={
                                  user.role
                                }
                                disabled={
                                  processing
                                }
                                onChange={(
                                  event,
                                ) =>
                                  requestRoleChange(
                                    user,
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                className="h-9 min-w-[170px] rounded-lg border border-stone-200 bg-white px-2 text-xs text-stone-700 outline-none disabled:opacity-50"
                              >
                                {ROLES.map(
                                  (
                                    role,
                                  ) => (
                                    <option
                                      key={
                                        role
                                      }
                                      value={
                                        role
                                      }
                                    >
                                      {formatLabel(
                                        role,
                                      )}
                                    </option>
                                  ),
                                )}
                              </select>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-col items-start gap-1.5">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  user.isActive
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-stone-100 text-stone-600'
                                }`}
                              >
                                {user.isActive ? (
                                  <CheckCircle2
                                    size={
                                      13
                                    }
                                  />
                                ) : (
                                  <XCircle
                                    size={
                                      13
                                    }
                                  />
                                )}

                                {user.isActive
                                  ? 'Active'
                                  : 'Inactive'}
                              </span>

                              {user.mustChangePassword && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
                                  <KeyRound
                                    size={
                                      11
                                    }
                                  />

                                  Password change required
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-xs text-stone-500">
                            {formatDate(
                              user.createdAt,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {isSelf ? (
                              <span className="text-xs text-stone-400">
                                Current
                                account
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={
                                  processing
                                }
                                onClick={() =>
                                  requestStatusChange(
                                    user,
                                  )
                                }
                                className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition disabled:opacity-50 ${
                                  user.isActive
                                    ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                {processing
                                  ? 'Updating...'
                                  : user.isActive
                                    ? 'Deactivate'
                                    : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    },
                  )}

                  {filteredUsers.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={
                          5
                        }
                        className="px-5 py-10 text-center text-sm text-stone-500"
                      >
                        No users match
                        the selected
                        filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {/* APPROVED CREDENTIALS */}
      {approvedCredentials && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2
                    size={21}
                  />
                </div>

                <h2 className="mt-4 text-xl font-semibold text-stone-900">
                  Account Created
                </h2>

                <p className="mt-2 text-sm leading-6 text-stone-500">
                  These credentials are
                  shown for this
                  approval. Email
                  delivery will be
                  connected next.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setApprovedCredentials(
                    null,
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X
                  size={18}
                />
              </button>
            </div>

            <div className="p-6">
              <div className="rounded-xl bg-stone-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  Employee
                </p>

                <p className="mt-1 font-semibold text-stone-900">
                  {
                    approvedCredentials.name
                  }
                </p>

                {approvedCredentials.requestedEmail && (
                  <>
                    <p className="mt-4 text-xs font-medium uppercase tracking-wide text-stone-400">
                      Requested Email
                    </p>

                    <p className="mt-1 text-sm text-stone-700">
                      {
                        approvedCredentials.requestedEmail
                      }
                    </p>
                  </>
                )}

                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-stone-400">
                  BankSync User ID
                </p>

                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="break-all font-mono text-sm font-semibold text-stone-900">
                    {
                      approvedCredentials.loginId
                    }
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      copyValue(
                        'approved-login',
                        approvedCredentials.loginId,
                      )
                    }
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 hover:bg-stone-50"
                  >
                    {copiedField ===
                    'approved-login' ? (
                      <CheckCircle2
                        size={
                          15
                        }
                        className="text-emerald-600"
                      />
                    ) : (
                      <Copy
                        size={
                          15
                        }
                      />
                    )}
                  </button>
                </div>

                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-stone-400">
                  Temporary Password
                </p>

                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="font-mono text-lg font-semibold tracking-wider text-stone-900">
                    {
                      approvedCredentials.temporaryPassword
                    }
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      copyValue(
                        'approved-password',
                        approvedCredentials.temporaryPassword,
                      )
                    }
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 hover:bg-stone-50"
                  >
                    {copiedField ===
                    'approved-password' ? (
                      <CheckCircle2
                        size={
                          15
                        }
                        className="text-emerald-600"
                      />
                    ) : (
                      <Copy
                        size={
                          15
                        }
                      />
                    )}
                  </button>
                </div>

                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-stone-400">
                  Role
                </p>

                <p className="mt-1 text-sm font-semibold text-stone-800">
                  {formatLabel(
                    approvedCredentials.role,
                  )}
                </p>
              </div>

              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                The employee must change
                this temporary password
                after first login.
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={
                    copyApprovedCredentials
                  }
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white text-sm font-semibold text-stone-700 hover:bg-stone-50"
                >
                  {copiedField ===
                  'approved-all' ? (
                    <CheckCircle2
                      size={
                        16
                      }
                      className="text-emerald-600"
                    />
                  ) : (
                    <Copy
                      size={
                        16
                      }
                    />
                  )}

                  Copy All
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setApprovedCredentials(
                      null,
                    )
                  }
                  className="h-11 flex-1 rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white hover:bg-stone-800"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL CREATE USER */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">
              <div>
                <p className="text-sm font-medium text-amber-600">
                  Administration
                </p>

                <h2 className="mt-1 text-xl font-semibold text-stone-900">
                  Create BankSync User
                </h2>

                <p className="mt-1 text-sm text-stone-500">
                  Enter the full name.
                  BankSync will generate
                  the login ID and
                  temporary password.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeCreateModal
                }
                disabled={
                  creatingUser
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X
                  size={18}
                />
              </button>
            </div>

            <form
              onSubmit={
                handleCreateUser
              }
              className="p-6"
            >
              <div>
                <label
                  htmlFor="newUserName"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Full Name
                </label>

                <input
                  id="newUserName"
                  type="text"
                  value={
                    createForm.name
                  }
                  onChange={(
                    event,
                  ) =>
                    handleNameChange(
                      event.target
                        .value,
                    )
                  }
                  placeholder="e.g. Rahim Ahmed"
                  autoFocus
                  className="h-11 w-full rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-amber-300"
                />
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  Bank Email / User ID
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={
                      createForm.email
                    }
                    placeholder="Generated automatically"
                    className="h-11 min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm text-stone-700 outline-none"
                  />

                  <button
                    type="button"
                    disabled={
                      !createForm.email
                    }
                    onClick={() =>
                      copyValue(
                        'email',
                        createForm.email,
                      )
                    }
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 disabled:opacity-40"
                  >
                    {copiedField ===
                    'email' ? (
                      <CheckCircle2
                        size={
                          17
                        }
                        className="text-emerald-600"
                      />
                    ) : (
                      <Copy
                        size={
                          17
                        }
                      />
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  Temporary Password
                </label>

                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <input
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      readOnly
                      value={
                        createForm.password
                      }
                      placeholder="Generated automatically"
                      className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 pr-11 font-mono text-sm tracking-wider text-stone-800 outline-none"
                    />

                    <button
                      type="button"
                      disabled={
                        !createForm.password
                      }
                      onClick={() =>
                        setShowPassword(
                          (
                            current,
                          ) =>
                            !current,
                        )
                      }
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 disabled:opacity-40"
                    >
                      {showPassword ? (
                        <EyeOff
                          size={
                            17
                          }
                        />
                      ) : (
                        <Eye
                          size={
                            17
                          }
                        />
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={
                      !createForm.name
                        .trim()
                    }
                    onClick={
                      regeneratePassword
                    }
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 disabled:opacity-40"
                  >
                    <RefreshCw
                      size={17}
                    />
                  </button>

                  <button
                    type="button"
                    disabled={
                      !createForm.password
                    }
                    onClick={() =>
                      copyValue(
                        'password',
                        createForm.password,
                      )
                    }
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 disabled:opacity-40"
                  >
                    {copiedField ===
                    'password' ? (
                      <CheckCircle2
                        size={
                          17
                        }
                        className="text-emerald-600"
                      />
                    ) : (
                      <Copy
                        size={
                          17
                        }
                      />
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <label
                  htmlFor="newUserRole"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Role
                </label>

                <select
                  id="newUserRole"
                  value={
                    createForm.role
                  }
                  onChange={(
                    event,
                  ) =>
                    handleRoleChange(
                      event.target
                        .value,
                    )
                  }
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 outline-none focus:border-amber-300"
                >
                  {ROLES.map(
                    (role) => (
                      <option
                        key={
                          role
                        }
                        value={
                          role
                        }
                      >
                        {formatLabel(
                          role,
                        )}
                      </option>
                    ),
                  )}
                </select>

                {createForm.role ===
                  'ADMIN' && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
                    <AlertTriangle
                      size={16}
                      className="mt-0.5 shrink-0 text-amber-600"
                    />

                    <p className="text-xs leading-5 text-amber-800">
                      This user receives
                      full Admin
                      permissions.
                    </p>
                  </div>
                )}
              </div>

              {createError && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {
                    createError
                  }
                </div>
              )}

              <div className="mt-6 flex gap-3 border-t border-stone-100 pt-5">
                <button
                  type="button"
                  onClick={
                    closeCreateModal
                  }
                  disabled={
                    creatingUser
                  }
                  className="h-11 flex-1 rounded-xl border border-stone-200 bg-white px-5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    creatingUser ||
                    createForm.name
                      .trim()
                      .length < 2 ||
                    !createForm.email ||
                    createForm.password
                      .length !== 6
                  }
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus
                    size={17}
                  />

                  {creatingUser
                    ? 'Creating...'
                    : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROLE / STATUS CONFIRMATION */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white shadow-2xl">
            <div className="p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <AlertTriangle
                  size={21}
                />
              </div>

              <h2 className="mt-4 text-lg font-semibold text-stone-900">
                {pendingAction.type ===
                'ROLE'
                  ? 'Confirm Role Change'
                  : pendingAction
                        .nextStatus
                    ? 'Activate User'
                    : 'Deactivate User'}
              </h2>

              {pendingAction.type ===
                'ROLE' && (
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Change{' '}
                  <strong>
                    {
                      pendingAction
                        .user.name
                    }
                  </strong>{' '}
                  from{' '}
                  <strong>
                    {formatLabel(
                      pendingAction
                        .user.role,
                    )}
                  </strong>{' '}
                  to{' '}
                  <strong>
                    {formatLabel(
                      pendingAction
                        .newRole,
                    )}
                  </strong>
                  ?
                </p>
              )}

              {pendingAction.type ===
                'STATUS' && (
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {pendingAction
                    .nextStatus
                    ? 'Restore access for'
                    : 'Disable access for'}{' '}
                  <strong>
                    {
                      pendingAction
                        .user.name
                    }
                  </strong>
                  ?
                </p>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={
                    closeConfirmation
                  }
                  disabled={Boolean(
                    processingId,
                  )}
                  className="h-10 rounded-xl border border-stone-200 px-4 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    executeConfirmedAction
                  }
                  disabled={Boolean(
                    processingId,
                  )}
                  className={`h-10 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-50 ${
                    pendingAction.type ===
                      'STATUS' &&
                    !pendingAction
                      .nextStatus
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-stone-900 hover:bg-stone-800'
                  }`}
                >
                  {processingId
                    ? 'Updating...'
                    : pendingAction.type ===
                        'ROLE'
                      ? 'Confirm Change'
                      : pendingAction
                            .nextStatus
                        ? 'Activate User'
                        : 'Deactivate User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default UsersPage