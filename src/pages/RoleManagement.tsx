// Role Management Page (Admin Only)
// Configure default permissions for each role (admin, editor, viewer)

import { useState, useEffect } from 'react';
import { roleManagementApi, MenuItem, RolePermissions } from '../api';

export function RoleManagement() {
  const [roles, setRoles] = useState<RolePermissions[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<RolePermissions | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [rolesResponse, menuResponse] = await Promise.all([
      roleManagementApi.listRoles(),
      roleManagementApi.getMenuItems(),
    ]);

    if (rolesResponse.success && rolesResponse.data) {
      setRoles(rolesResponse.data);
    }
    if (menuResponse.success && menuResponse.data) {
      setMenuItems(menuResponse.data);
    }
    setLoading(false);
  }

  function openEditModal(role: RolePermissions) {
    setEditingRole(role);
    setPermissions({ ...role.permissions });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!editingRole) return;

    setSaving(true);
    setError('');

    const response = await roleManagementApi.updateRole(editingRole.role, permissions);
    
    if (response.success) {
      setShowModal(false);
      loadData();
    } else {
      setError(response.error || 'Failed to update role permissions');
    }

    setSaving(false);
  }

  function togglePermission(menuId: string) {
    setPermissions(prev => ({
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

  function getRoleDescription(role: string) {
    const descriptions = {
      admin: 'System administrators with full access to all features',
      editor: 'Users who can create and modify data, but not manage users',
      viewer: 'Users with read-only access to view data',
    };
    return descriptions[role as keyof typeof descriptions] || '';
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading role permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
          <p className="text-gray-600 text-sm mt-2">Configure default menu permissions for each user role</p>
        </div>
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{roles.length}</span> Roles
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{menuItems.length}</span> Permissions
            </span>
          </div>
        </div>
      </div>

      {/* Roles Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {roles.map((role) => {
                const enabledCount = Object.values(role.permissions).filter(Boolean).length;
                const totalCount = menuItems.length;
                const percentage = Math.round((enabledCount / totalCount) * 100);

                return (
                  <tr key={role.role} className="hover:bg-gray-50">
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded uppercase ${getRoleBadge(role.role)}`}>
                        {role.role}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="text-sm text-gray-700 max-w-md">{getRoleDescription(role.role)}</div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 inline-flex items-center gap-1.5 text-xs font-medium rounded ${
                          percentage === 100 ? 'bg-green-100 text-green-800 border border-green-200' :
                          percentage > 50 ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        }`}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          {enabledCount}/{totalCount}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {new Date(role.updated_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(role)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit permissions"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEditModal(role)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="View permissions"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Permissions Modal */}
      {showModal && editingRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full shadow-xl max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gray-800 px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-white">
                Configure {editingRole.role.charAt(0).toUpperCase() + editingRole.role.slice(1)} Permissions
              </h2>
              <p className="text-gray-300 text-sm mt-1">
                {getRoleDescription(editingRole.role)}
              </p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
              {error && (
                <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
                  Menu Access Permissions
                </h3>
                <p className="text-xs text-gray-500">Select which menus users with this role can access</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                {menuItems.map((item) => {
                  const isEnabled = permissions[item.id];
                  
                  return (
                    <label
                      key={item.id}
                      className={`relative flex items-start p-2 border rounded cursor-pointer transition-all ${
                        isEnabled
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isEnabled || false}
                        onChange={() => togglePermission(item.id)}
                        disabled={saving}
                        className="mt-0.5 mr-2 h-3.5 w-3.5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{item.icon}</span>
                          <span className="font-medium text-gray-900 text-xs leading-tight">{item.label}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving Changes...
                    </span>
                  ) : (
                    'Save Permissions'
                  )}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="px-5 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
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
