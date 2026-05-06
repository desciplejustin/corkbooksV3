import { useState, useEffect } from 'react';
import { categoriesApi, Category } from '../api';

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category_type: 'expense' as 'income' | 'expense',
    scope: 'personal' as 'personal' | 'business' | 'shared',
    sars_related: 0,
  });

  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterScope, setFilterScope] = useState<'all' | 'personal' | 'business' | 'shared'>('all');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    const response = await categoriesApi.list();
    if (response.success && response.data) {
      // Store all categories (including inactive ones)
      setCategories(response.data);
      setError(null);
    } else {
      setError(response.error || 'Failed to load categories');
    }
    setLoading(false);
  }

  function handleEdit(category: Category) {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      category_type: category.category_type,
      scope: category.scope,
      sars_related: category.sars_related,
    });
    // Don't set showForm for edit - we'll use a modal instead
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      let response;
      if (editingId) {
        response = await categoriesApi.update(editingId, formData);
      } else {
        response = await categoriesApi.create(formData);
      }

      if (response.success && response.data) {
        // Update state directly to avoid scroll jump
        if (editingId) {
          setCategories(prev => prev.map(cat => 
            cat.id === editingId ? response.data! : cat
          ));
        } else {
          setCategories(prev => [...prev, response.data!]);
        }
        resetForm();
        setError(null);
      } else {
        setError(response.error || 'Failed to save category');
      }
    } catch (err) {
      setError('An error occurred');
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      category_type: 'expense',
      scope: 'personal',
      sars_related: 0,
    });
    setEditingId(null);
    setShowForm(false);
  }

  async function toggleActive(category: Category) {
    const response = await categoriesApi.update(category.id, {
      is_active: category.is_active === 1 ? 0 : 1,
    });

    if (response.success && response.data) {
      // Update state directly to avoid scroll jump
      setCategories(prev => prev.map(cat => 
        cat.id === category.id ? response.data! : cat
      ));
      setError(null);
    } else {
      setError(response.error || 'Failed to update category');
    }
  }

  const filteredCategories = categories.filter((cat) => {
    if (filterType !== 'all' && cat.category_type !== filterType) return false;
    if (filterScope !== 'all' && cat.scope !== filterScope) return false;
    if (!showInactive && cat.is_active === 0) return false;
    return true;
  });

  if (loading) return <div className="p-6 text-gray-500">Loading…</div>;

  return (
    <div className="p-6 max-w-5xl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Categories</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Category'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm mb-4">
          {error}
        </div>
      )}

      {showForm && !editingId && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4">
          <h3 className="text-base font-semibold text-gray-800 mb-4">New Category</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select
                value={formData.category_type}
                onChange={(e) => setFormData({ ...formData, category_type: e.target.value as 'income' | 'expense' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scope *</label>
              <select
                value={formData.scope}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value as 'personal' | 'business' | 'shared' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="personal">Personal</option>
                <option value="business">Business</option>
                <option value="shared">Shared</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.sars_related === 1}
                  onChange={(e) => setFormData({ ...formData, sars_related: e.target.checked ? 1 : 0 })}
                  className="rounded"
                />
                SARS Tax Related
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors">
              Create
            </button>
            <button type="button" onClick={resetForm} className="px-5 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
          onClick={() => resetForm()}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-6 w-[600px] max-w-[95vw] max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Edit Category</h2>
              <button
                onClick={() => resetForm()}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={formData.category_type}
                    onChange={(e) => setFormData({ ...formData, category_type: e.target.value as 'income' | 'expense' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scope *</label>
                  <select
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value as 'personal' | 'business' | 'shared' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="personal">Personal</option>
                    <option value="business">Business</option>
                    <option value="shared">Shared</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.sars_related === 1}
                      onChange={(e) => setFormData({ ...formData, sars_related: e.target.checked ? 1 : 0 })}
                      className="rounded"
                    />
                    SARS Tax Related
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <button type="submit" className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors">
                  Update
                </button>
                <button type="button" onClick={resetForm} className="px-5 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <label className="font-medium text-gray-600">Type:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="font-medium text-gray-600">Scope:</label>
          <select value={filterScope} onChange={(e) => setFilterScope(e.target.value as any)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All</option>
            <option value="personal">Personal</option>
            <option value="business">Business</option>
            <option value="shared">Shared</option>
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded" />
          Show Inactive
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Scope</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">SARS</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredCategories.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">No categories found</td>
              </tr>
            ) : (
              filteredCategories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{category.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                      category.category_type === 'income'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {category.category_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">{category.scope}</td>
                  <td className="px-4 py-3 text-center">
                    {category.sars_related === 1
                      ? <span className="text-green-600 font-semibold">✓</span>
                      : <span className="text-gray-300">–</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(category)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer border-0 ${
                        category.is_active === 1
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {category.is_active === 1 ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleEdit(category)}
                      className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
