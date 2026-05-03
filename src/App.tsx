// Main App Component
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { authApi, UserPublic } from './api';
import ProtectedRoute from './components/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { Categories } from './pages/Categories';
import { BankAccounts } from './pages/BankAccounts';
import { Imports } from './pages/Imports';
import { ImportUpload } from './pages/ImportUpload';
import { ImportReview } from './pages/ImportReview';
import { Transactions } from './pages/Transactions';
import { Reconciliation } from './pages/Reconciliation';

export default function App() {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    const response = await authApi.getMe();
    if (response.success && response.data) setUser(response.data);
    setLoading(false);
  }

  function handleLogout() { setUser(null); }

  const wrap = (el: React.ReactNode) =>
    user ? (
      <AppLayout user={user} onLogout={handleLogout}>
        <ProtectedRoute user={user} loading={loading}>
          {el}
        </ProtectedRoute>
      </AppLayout>
    ) : (
      <ProtectedRoute user={user} loading={loading}>{el}</ProtectedRoute>
    );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          user ? <Navigate to="/dashboard" replace /> : <Login onLogin={setUser} />
        } />
        <Route path="/dashboard" element={wrap(<Dashboard user={user} />)} />
        <Route path="/categories" element={wrap(<Categories />)} />
        <Route path="/bank-accounts" element={wrap(<BankAccounts />)} />
        <Route path="/imports" element={wrap(<Imports />)} />
        <Route path="/imports/new" element={wrap(<ImportUpload />)} />
        <Route path="/imports/:id/review" element={wrap(<ImportReview />)} />
        <Route path="/transactions" element={wrap(<Transactions />)} />
        <Route path="/reconciliation" element={wrap(<Reconciliation />)} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={
          <div className="flex items-center justify-center h-screen flex-col gap-4">
            <h1 className="text-2xl font-bold text-gray-700">404 – Page Not Found</h1>
            <Link to="/dashboard" className="text-blue-600 hover:underline">Go to Dashboard</Link>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}
