// User Management Page (Admin Only)
import { useState, useEffect } from 'react';
import { usersApi, UserPublic, roleManagementApi, MenuItem, UserPermissions } from '../api';

interface UserWithDetails extends UserPublic {
  is_active: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export function Users() {
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithDetails | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<UserWithDetails | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [customPermissions, setCustomPermissions] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'viewer' as 'admin' | 'editor' | 'viewer',
  });
  const [error, setError] = useState('');
  const [permissionsError, setPermissionsError] = useState('');
  const [savingPermissions, setSavingPermissions] = useState(false);

  useEffect(() => { loadUsers(); loadMenuItems(); }, []);

  async function loadUsers() {
    setLoading(true);
    const response = await usersApi.list(true); // Include inactive users
    if (response.success && response.data) {
      setUsers(response.data);
    }
    setLoading(false);
  }

  async function loadMenuItems() {
    const response = await roleManagementApi.getMenuItems();
    if (response.success && response.data) {
      setMenuItems(response.data);
    } else {
      console.error('Failed to load menu items:', response.error);
    }
  }

  function openCreateModal() {
    setEditingUser(null);
    setFormData({ email: '', password: '', full_name: '', role: 'viewer' });
    setError('');
    setShowModal(true);
  }

  function openEditModal(user: UserWithDetails) {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      full_name: user.full_name,
      role: user.role as 'admin' | 'editor' | 'viewer',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (editingUser) {
      // Update existing user
      const updates: any = {
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role,
      };
      if (formData.password) {
        updates.password = formData.password;
      }
      
      const response = await usersApi.update(editingUser.id, updates);
      if (response.success) {
        setShowModal(false);
        loadUsers();
      } else {
        setError(response.error || 'Failed to update user');
      }
    } else {
      // Create new user
      if (!formData.password) {
        setError('Password is required for new users');
        return;
      }
      
      const response = await usersApi.create(formData);
      if (response.success) {
        setShowModal(false);
        loadUsers();
      } else {
        setError(response.error || 'Failed to create user');
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    
    const response = await usersApi.delete(id);
    if (response.success) {
      loadUsers();
    } else {
      alert(response.error || 'Failed to delete user');
    }
  }

  async function openPermissionsModal(user: UserWithDetails) {
    setPermissionsUser(user);
    setPermissionsError('');
    setUserPermissions(null);
    setSavingPermissions(true);
    setShowPermissionsModal(true);

    // Load user's permissions
    const response = await usersApi.getPermissions(user.id);
    if (response.success && response.data) {
      setUserPermissions(response.data);
      setCustomPermissions(response.data.custom_permissions || { ...response.data.effective_permissions });
    } else {
      console.error('Failed to load permissions:', response.error);
      setPermissionsError('Failed to load user permissions');
    }
    setSavingPermissions(false);
  }

  async function handleSavePermissions() {
    if (!permissionsUser) return;

    setSavingPermissions(true);
    setPermissionsError('');

    const response = await usersApi.updatePermissions(permissionsUser.id, customPermissions);
    
    if (response.success) {
      setShowPermissionsModal(false);
      loadUsers();
    } else {
      setPermissionsError(response.error || 'Failed to update permissions');
    }

    setSavingPermissions(false);
  }

  async function handleRevertPermissions() {
    if (!permissionsUser) return;

    if (!confirm('Revert to default role permissions? This will remove all custom permissions for this user.')) {
      return;
    }

    setSavingPermissions(true);
    setPermissionsError('');

    const response = await usersApi.deletePermissions(permissionsUser.id);
    
    if (response.success) {
      setShowPermissionsModal(false);
      loadUsers();
    } else {
      setPermissionsError(response.error || 'Failed to revert permissions');
    }

    setSavingPermissions(false);
  }

  function toggleCustomPermission(menuId: string) {
    setCustomPermissions(prev => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  }

  function getRoleBadge(role: string) {
    const styles = {
      admin: 'bg-red-100 text-red-800 border border-red-200',
      editor: 'bg-blue-100 text-blue-800 border border-blue-200',
      viewer: 'bg-gray-100 text-gray-700 border border-gray-200',
    };
    return styles[role as keyof typeof styles] || styles.viewer;
  }

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  function getAvatarColor(email: string): string {
    const colors = [
      'bg-purple-600',
      'bg-blue-600',
      'bg-green-600',
      'bg-yellow-600',
      'bg-pink-600',
      'bg-indigo-600',
    ];
    const index = email.charCodeAt(0) % colors.length;
    return colors[index];
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">User Management</h1>
            <p className="text-gray-600 text-sm">Manage user accounts, roles, and permissions</p>
            <div className="flex gap-4 mt-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{users.filter(u => u.is_active).length}</span> Active
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <span className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{users.filter(u => !u.is_active).length}</span> Inactive
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{users.length}</span> Total
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span className="text-lg">+</span>
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full ${getAvatarColor(user.email)} flex items-center justify-center text-white font-medium text-xs`}>
                        {getInitials(user.full_name)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded ${getRoleBadge(user.role)}`}>
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex items-center gap-1.5 text-xs font-medium rounded ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      }) : (
                        <span className="text-gray-400 text-xs">Never</span>
                      )}
                    </div>
                    {user.last_login_at && (
                      <div className="text-xs text-gray-500">
                        {new Date(user.last_login_at).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit user"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openPermissionsModal(user)}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Manage permissions"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </button>
                      {user.is_active === 1 ? (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Deactivate user"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                      ) : (
                        <span className="p-1.5 text-gray-300" title="User is inactive">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first user</p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span>+</span>
              <span>Add User</span>
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
            {/* Modal Header */}
            <div className="bg-gray-800 px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-white">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h2>
              <p className="text-gray-300 text-xs mt-1">
                {editingUser ? 'Update user information and role' : 'Add a new user to the system'}
              </p>
            </div>

            <div className="p-5">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Password {editingUser && <span className="text-gray-500 font-normal">(leave blank to keep current)</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={editingUser ? 'Leave blank to keep current' : '••••••••'}
                    required={!editingUser}
                    minLength={8}
                  />
                  {!editingUser && (
                    <p className="text-xs text-gray-500 mt-1">Minimum 8 characters required</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    User Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    required
                  >
                    <option value="viewer">Viewer - Read-only</option>
                    <option value="editor">Editor - Create & Edit</option>
                    <option value="admin">Admin - Full Access</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.role === 'admin' && 'Full system access, can manage users and permissions'}
                    {formData.role === 'editor' && 'Can create and edit data, but not manage users'}
                    {formData.role === 'viewer' && 'Read-only access to view data'}
                  </p>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors"
                  >
                    {editingUser ? 'Update User' : 'Create User'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm bg-gray-200 text-gray-700 font-medium rounded hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && permissionsUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full shadow-xl max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gray-800 px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Manage Permissions
              </h2>
              <div className="flex items-center gap-3 mt-3">
                <div className={`w-8 h-8 rounded-full ${getAvatarColor(permissionsUser.email)} flex items-center justify-center text-white font-semibold text-xs`}>
                  {getInitials(permissionsUser.full_name)}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{permissionsUser.full_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-gray-300 text-xs">Role:</span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${getRoleBadge(permissionsUser.role)}`}>
                      {permissionsUser.role.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(85vh-180px)]">
              {permissionsError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {permissionsError}
                </div>
              )}

              {userPermissions && (
                <>
                  {userPermissions.has_custom_permissions && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-xs font-semibold text-yellow-900">Custom Permissions Active</p>
                          <p className="text-xs text-yellow-700 mt-0.5">
                            This user has custom permissions that override their role defaults.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    <h3 className="text-xs font-semibold text-gray-700 uppercase">Menu Access Permissions</h3>
                    <p className="text-xs text-gray-500 mt-1">Select which menus this user can access</p>
                  </div>

                  {menuItems.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm text-red-600">No menu items available. Please check API access.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                      {menuItems.map((item) => {
                        const isInherited = customPermissions[item.id] === userPermissions.default_permissions[item.id];
                        const isEnabled = customPermissions[item.id];

                        return (
                          <label
                            key={item.id}
                            className={`relative flex items-start p-2 border rounded cursor-pointer transition-colors ${
                              !isInherited 
                                ? 'border-blue-300 bg-blue-50' 
                                : isEnabled
                                ? 'border-green-200 bg-green-50 hover:bg-green-100'
                                : 'border-gray-200 bg-white hover:bg-gray-50'
                            } ${savingPermissions ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isEnabled || false}
                              onChange={() => toggleCustomPermission(item.id)}
                              disabled={savingPermissions}
                              className="mt-0.5 mr-2 h-3.5 w-3.5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-sm">{item.icon}</span>
                                <span className="font-medium text-gray-900 text-xs leading-tight">{item.label}</span>
                              </div>
                              {!isInherited && (
                                <span className="inline-block text-[10px] px-1 py-0.5 bg-blue-200 text-blue-800 font-semibold rounded leading-none mt-0.5">
                                  CUSTOM
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {!userPermissions && savingPermissions && (
                <div className="py-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                  <p className="mt-3 text-gray-600 text-sm">Loading permissions...</p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
              <div className="flex gap-2">
                <button
                  onClick={handleSavePermissions}
                  disabled={savingPermissions}
                  className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingPermissions ? 'Saving...' : 'Save Permissions'}
                </button>
                {userPermissions?.has_custom_permissions && (
                  <button
                    onClick={handleRevertPermissions}
                    disabled={savingPermissions}
                    className="px-4 py-2 text-sm bg-yellow-600 text-white font-medium rounded hover:bg-yellow-700 transition-colors disabled:opacity-50"
                    title="Remove custom permissions and use role defaults"
                  >
                    Revert to Role
                  </button>
                )}
                <button
                  onClick={() => setShowPermissionsModal(false)}
                  disabled={savingPermissions}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-700 font-medium rounded hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
