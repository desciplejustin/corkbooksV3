import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { authApi, UserPublic } from '../api';

interface AppLayoutProps {
  user: UserPublic;
  onLogout: () => void;
  children: React.ReactNode;
}

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: '◈' },
  { label: 'Imports', path: '/imports', icon: '↑' },
  { label: 'Transactions', path: '/transactions', icon: '≡' },
  { label: 'Categories', path: '/categories', icon: '⊞' },
  { label: 'Bank Accounts', path: '/bank-accounts', icon: '🏦' },
  { label: 'Reports', path: '/reports', icon: '📊' },
];

export function AppLayout({ user, onLogout, children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    await authApi.logout();
    onLogout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`flex flex-col flex-shrink-0 bg-slate-800 text-white transition-all duration-200 ${
          collapsed ? 'w-14' : 'w-56'
        }`}
      >
        {/* Logo row */}
        <div className={`flex items-center h-14 px-3 border-b border-slate-700 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <span className="text-white font-bold text-lg tracking-tight">CorkBooks</span>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 mx-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <span className="text-base leading-none w-5 text-center flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User / logout */}
        <div className={`border-t border-slate-700 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
          {collapsed ? (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Logout"
            >
              ⏻
            </button>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="text-xs text-slate-400 truncate">{user.email}</div>
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  user.role === 'admin' ? 'bg-green-600 text-white' : 'bg-cyan-700 text-white'
                }`}>{user.role}</span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
