// Main App Component
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { authApi, UserPublic } from './api';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { Categories } from './pages/Categories';
import { BankAccounts } from './pages/BankAccounts';
import { navItems } from './nav';

export default function App() {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const response = await authApi.getMe();
    if (response.success && response.data) {
      setUser(response.data);
    }
    setLoading(false);
  }

  async function handleLogin(userData: UserPublic) {
    setUser(userData);
  }

  async function handleLogout() {
    await authApi.logout();
    setUser(null);
  }

  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        {/* Header/Nav */}
        {user && (
          <header style={{
            backgroundColor: '#fff',
            borderBottom: '1px solid #ddd',
            padding: '10px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>CorkBooks</h2>
              <nav style={{ display: 'flex', gap: '15px' }}>
                <Link to="/dashboard" style={{ textDecoration: 'none', color: '#007bff' }}>
                  Dashboard
                </Link>
                <Link to="/categories" style={{ textDecoration: 'none', color: '#007bff' }}>
                  Categories
                </Link>
                <Link to="/bank-accounts" style={{ textDecoration: 'none', color: '#007bff' }}>
                  Bank Accounts
                </Link>
              </nav>
            </div>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <span>{user.email}</span>
              <button 
                onClick={handleLogout}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
            </div>
          </header>
        )}

        {/* Main Content */}
        <main>
          <Routes>
            <Route path="/login" element={
              user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute user={user} loading={loading}>
                <Dashboard user={user} />
              </ProtectedRoute>
            } />
            
            <Route path="/categories" element={
              <ProtectedRoute user={user} loading={loading}>
                <Categories />
              </ProtectedRoute>
            } />
            
            <Route path="/bank-accounts" element={
              <ProtectedRoute user={user} loading={loading}>
                <BankAccounts />
              </ProtectedRoute>
            } />
            
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            <Route path="*" element={
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <h1>404 - Not Found</h1>
                <Link to="/dashboard">Go to Dashboard</Link>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
