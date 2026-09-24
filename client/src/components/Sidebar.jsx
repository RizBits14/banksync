import {
  useEffect,
  useState,
} from 'react'

import {
  Activity,
  ClipboardCheck,
  ClipboardList,
  FileBarChart,
  FileSearch,
  LayoutDashboard,
  ShieldAlert,
  ShieldCheck,
  Upload,
  Users,
} from 'lucide-react'

import {
  NavLink,
} from 'react-router-dom'

import {
  apiRequest,
} from '../services/api'

const menuItems = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    roles: [
      'ADMIN',
      'CHECKER',
      'AUDITOR',
      'OPERATIONS_MANAGER',
    ],
  },

  {
    label: 'Uploads',
    icon: Upload,
    path: '/uploads',
    roles: [
      'ADMIN',
      'IMPORT_OFFICER',
    ],
  },

  {
    label: 'Data Corrections',
    icon: ClipboardList,
    path: '/data-corrections',
    roles: [
      'IMPORT_OFFICER',
    ],
  },

  {
    label: 'Reconciliation',
    icon: FileSearch,
    path: '/reconciliation',
  },

  {
    label: 'Exceptions',
    icon: Activity,
    path: '/exceptions',
    roles: [
      'ADMIN',
      'MAKER',
      'CHECKER',
      'AUDITOR',
      'OPERATIONS_MANAGER',
    ],
  },

  {
    label: 'Cases',
    icon: ClipboardCheck,
    path: '/cases',
    roles: [
      'ADMIN',
      'MAKER',
      'CHECKER',
      'AUDITOR',
      'OPERATIONS_MANAGER',
    ],
  },

  {
    label: 'Data Quality',
    icon: ShieldAlert,
    path: '/data-quality',
    roles: [
      'ADMIN',
      'IMPORT_OFFICER',
      'CHECKER',
      'AUDITOR',
      'OPERATIONS_MANAGER',
    ],
  },

  {
    label: 'Audit Logs',
    icon: ShieldCheck,
    path: '/audit-logs',
    roles: [
      'ADMIN',
      'AUDITOR',
      'OPERATIONS_MANAGER',
    ],
  },

  {
    label: 'Reports',
    icon: FileBarChart,
    path: '/reports',
    roles: [
      'ADMIN',
      'AUDITOR',
      'OPERATIONS_MANAGER',
    ],
  },

  {
    label: 'Users',
    icon: Users,
    path: '/users',
    roles: [
      'ADMIN',
    ],
  },
]

function Sidebar() {
  const [
    currentUser,
    setCurrentUser,
  ] = useState(null)

  useEffect(() => {
    const loadCurrentUser =
      async () => {
        try {
          const response =
            await apiRequest(
              '/auth/me',
            )

          setCurrentUser(
            response.data,
          )
        } catch {
          setCurrentUser(
            null,
          )
        }
      }

    loadCurrentUser()
  }, [])

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 flex-col border-r border-stone-800 bg-stone-900 lg:flex">

      {/* BRAND */}
      <div className="flex h-20 items-center border-b border-stone-800 px-6">
        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-stone-950">
            <ShieldCheck
              size={22}
              strokeWidth={2.2}
            />
          </div>

          <div>
            <h1 className="text-lg font-semibold text-white">
              BankSync
            </h1>

            <p className="text-xs text-stone-400">
              Reconciliation
            </p>
          </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 px-3 py-5">

        <p className="mb-3 px-3 text-xs font-medium uppercase tracking-[0.15em] text-stone-500">
          Workspace
        </p>

        <div className="space-y-1">
          {menuItems.map(
            (item) => {
              const Icon =
                item.icon

              /*
               * Hide menu item when
               * the user's role does
               * not have permission.
               */
              if (
                item.roles &&
                (
                  !currentUser ||
                  !item.roles.includes(
                    currentUser.role,
                  )
                )
              ) {
                return null
              }

              /*
               * Modules without routes
               * remain disabled until
               * their frontend is built.
               */
              if (!item.path) {
                return (
                  <button
                    key={
                      item.label
                    }
                    type="button"
                    disabled
                    className="flex w-full cursor-default items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-stone-500"
                  >
                    <Icon
                      size={18}
                      className="text-stone-600"
                    />

                    {
                      item.label
                    }
                  </button>
                )
              }

              return (
                <NavLink
                  key={
                    item.label
                  }
                  to={
                    item.path
                  }
                  className={({
                    isActive,
                  }) =>
                    `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                      isActive
                        ? 'bg-stone-800 text-white'
                        : 'text-stone-400 hover:bg-stone-800/60 hover:text-white'
                    }`
                  }
                >
                  {({
                    isActive,
                  }) => (
                    <>
                      <Icon
                        size={18}
                        className={
                          isActive
                            ? 'text-amber-400'
                            : 'text-stone-500'
                        }
                      />

                      {
                        item.label
                      }
                    </>
                  )}
                </NavLink>
              )
            },
          )}
        </div>
      </nav>

      {/* FOOTER */}
      <div className="border-t border-stone-800 p-4">
        <div className="rounded-xl bg-stone-800/60 px-4 py-3">

          <p className="text-xs font-medium text-stone-300">
            BankSync
          </p>

          <p className="mt-1 text-xs text-stone-500">
            Internal banking
            system
          </p>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
