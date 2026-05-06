import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { authApi, UserPublic, usersApi, UserPermissions } from '../api';

interface AppLayoutProps {
  user: UserPublic;
  onLogout: () => void;
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  path: string;
  icon: string;
  permissionId: string; // Permission identifier from database
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: '◈', permissionId: 'dashboard' },
  { label: 'Imports', path: '/imports', icon: '↑', permissionId: 'imports' },
  { label: 'Transactions', path: '/transactions', icon: '≡', permissionId: 'transactions' },
  { label: 'Categories', path: '/categories', icon: '⊞', permissionId: 'categories' },
  { label: 'Bank Accounts', path: '/bank-accounts', icon: '🏦', permissionId: 'bank-accounts' },
  { label: 'Import Templates', path: '/import-templates', icon: '📋', permissionId: 'import-templates' },
  { label: 'Reports', path: '/reconciliation', icon: '📊', permissionId: 'reports' },
  { label: 'Users', path: '/users', icon: '👥', permissionId: 'users' },
  { label: 'Role Management', path: '/role-management', icon: '🔐', permissionId: 'role-management' },
];

export function AppLayout({ user, onLogout, children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadUserPermissions();
  }, [user.id]);

  async function loadUserPermissions() {
    const response = await usersApi.getPermissions(user.id);
    if (response.success && response.data) {
      setPermissions(response.data.effective_permissions);
    } else {
      // Fallback: allow everything if permissions can't be loaded
      console.error('Failed to load user permissions, using permissive fallback');
      setPermissions({
        'dashboard': true,
        'imports': true,
        'transactions': true,
        'categories': true,
        'bank-accounts': true,
        'import-templates': true,
        'reports': true,
        'users': user.role === 'admin',
        'role-management': user.role === 'admin',
      });
    }
    setPermissionsLoaded(true);
  }

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
          {permissionsLoaded && navItems
            .filter(item => permissions[item.permissionId] === true)
            .map(item => (
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
          {!permissionsLoaded && (
            <div className="px-3 py-2 text-slate-400 text-sm text-center">
              Loading menu...
            </div>
          )}
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
