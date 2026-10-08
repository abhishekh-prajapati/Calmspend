import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FinancialProvider } from './context/FinancialContext';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';

// Lazy-loaded secondary pages for optimized bundle chunking
const ReportPage = lazy(() => import('./pages/ReportPage').then((m) => ({ default: m.ReportPage })));
const PlanPage = lazy(() => import('./pages/PlanPage').then((m) => ({ default: m.PlanPage })));
const VaultPage = lazy(() => import('./pages/VaultPage').then((m) => ({ default: m.VaultPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const GoalsPage = lazy(() => import('./pages/GoalsPage').then((m) => ({ default: m.GoalsPage })));
const AddExpensePage = lazy(() => import('./pages/AddExpensePage').then((m) => ({ default: m.AddExpensePage })));
const EditExpensePage = lazy(() => import('./pages/EditExpensePage').then((m) => ({ default: m.EditExpensePage })));
const AddIncomePage = lazy(() => import('./pages/AddIncomePage').then((m) => ({ default: m.AddIncomePage })));
const EditIncomePage = lazy(() => import('./pages/EditIncomePage').then((m) => ({ default: m.EditIncomePage })));
const AddTransferPage = lazy(() => import('./pages/AddTransferPage').then((m) => ({ default: m.AddTransferPage })));
const EditTransferPage = lazy(() => import('./pages/EditTransferPage').then((m) => ({ default: m.EditTransferPage })));
const DataManagementPage = lazy(() => import('./pages/DataManagementPage').then((m) => ({ default: m.DataManagementPage })));
const AACallbackPage = lazy(() => import('./pages/AACallbackPage').then((m) => ({ default: m.AACallbackPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

function RouteFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-body-sm)' }}>
      Loading...
    </div>
  );
}

export function App() {
  return (
    <FinancialProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/plan" element={<PlanPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/net-worth" element={<GoalsPage />} />
              <Route path="/vault" element={<VaultPage />} />
              <Route path="/settings" element={<Navigate to="/vault" replace />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/expenses/new" element={<AddExpensePage />} />
              <Route path="/expenses/:id/edit" element={<EditExpensePage />} />
              <Route path="/income/new" element={<AddIncomePage />} />
              <Route path="/income/:id/edit" element={<EditIncomePage />} />
              <Route path="/transfers/new" element={<AddTransferPage />} />
              <Route path="/transfers/:id/edit" element={<EditTransferPage />} />
              <Route path="/data-management" element={<DataManagementPage />} />
              <Route path="/aa/callback" element={<AACallbackPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </FinancialProvider>
  );
}

export default App;
