import { Routes, Route } from 'react-router-dom'

import LoginPage from './pages/LoginPage.jsx'
import ChangePasswordPage from './pages/ChangePasswordPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import UploadsPage from './pages/UploadsPage.jsx'
import ReconciliationPage from './pages/ReconciliationPage.jsx'
import ReconciliationResultsPage from './pages/ReconciliationResultsPage.jsx'
import ExceptionsPage from './pages/ExceptionsPage.jsx'
import CasesPage from './pages/CasesPage.jsx'
import CaseDetailsPage from './pages/CaseDetailsPage.jsx'
import UsersPage from './pages/UsersPage.jsx'
import AuditLogsPage from './pages/AuditLogsPage.jsx'
import DataQualityPage from './pages/DataQualityPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import ImportCorrectionTasksPage from './pages/ImportCorrectionTasksPage.jsx'

import ProtectedRoute from './components/ProtectedRoute.jsx'
import AppLayout from './layouts/AppLayout.jsx'

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<LoginPage />}
      />

      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={[
              'ADMIN',
              'CHECKER',
              'AUDITOR',
              'OPERATIONS_MANAGER',
            ]}
          >
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/*
        AppLayout is only a layout shell.

        Every child route below already has its own
        ProtectedRoute, so wrapping AppLayout in a
        second ProtectedRoute causes two separate
        /auth/me checks and two loading screens for
        the same navigation.

        Keeping only the child guards prevents the
        visible loading/flicker cycle while preserving
        the same authentication and role protection.
      */}
      <Route
        element={<AppLayout />}
      >
        <Route
          path="/uploads"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ADMIN',
                'IMPORT_OFFICER',
              ]}
            >
              <UploadsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reconciliation"
          element={
            <ProtectedRoute>
              <ReconciliationPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reconciliation/:id/results"
          element={
            <ProtectedRoute>
              <ReconciliationResultsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/exceptions"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ADMIN',
                'MAKER',
                'CHECKER',
                'AUDITOR',
                'OPERATIONS_MANAGER',
              ]}
            >
              <ExceptionsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cases"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ADMIN',
                'MAKER',
                'CHECKER',
                'AUDITOR',
                'OPERATIONS_MANAGER',
              ]}
            >
              <CasesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cases/:id"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ADMIN',
                'MAKER',
                'CHECKER',
                'AUDITOR',
                'OPERATIONS_MANAGER',
              ]}
            >
              <CaseDetailsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/data-quality"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ADMIN',
                'IMPORT_OFFICER',
                'CHECKER',
                'AUDITOR',
                'OPERATIONS_MANAGER',
              ]}
            >
              <DataQualityPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/data-corrections"
          element={
            <ProtectedRoute
              allowedRoles={[
                'IMPORT_OFFICER',
              ]}
            >
              <ImportCorrectionTasksPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ADMIN',
                'AUDITOR',
                'OPERATIONS_MANAGER',
              ]}
            >
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ADMIN',
                'AUDITOR',
                'OPERATIONS_MANAGER',
              ]}
            >
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ADMIN',
              ]}
            >
              <UsersPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  )
}

export default App