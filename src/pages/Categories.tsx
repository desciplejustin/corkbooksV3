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
    setShowForm(true);
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

      if (response.success) {
        await loadCategories();
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

    if (response.success) {
      await loadCategories();
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

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Categories</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {showForm ? 'Cancel' : '+ New Category'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fee',
          color: '#c33',
          borderRadius: '4px',
          marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          padding: '1.5rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          marginBottom: '2rem',
        }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Category' : 'New Category'}</h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Type *
            </label>
            <select
              value={formData.category_type}
              onChange={(e) => setFormData({ ...formData, category_type: e.target.value as 'income' | 'expense' })}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Scope *
            </label>
            <select
              value={formData.scope}
              onChange={(e) => setFormData({ ...formData, scope: e.target.value as 'personal' | 'business' | 'shared' })}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            >
              <option value="personal">Personal</option>
              <option value="business">Business</option>
              <option value="shared">Shared</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={formData.sars_related === 1}
                onChange={(e) => setFormData({ ...formData, sars_related: e.target.checked ? 1 : 0 })}
              />
              <span>SARS Tax Related</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="submit"
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {editingId ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div>
          <label style={{ marginRight: '0.5rem', fontWeight: 'bold' }}>Type:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            style={{ padding: '0.25rem 0.5rem' }}
          >
            <option value="all">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div>
          <label style={{ marginRight: '0.5rem', fontWeight: 'bold' }}>Scope:</label>
          <select
            value={filterScope}
            onChange={(e) => setFilterScope(e.target.value as any)}
            style={{ padding: '0.25rem 0.5rem' }}
          >
            <option value="all">All</option>
            <option value="personal">Personal</option>
            <option value="business">Business</option>
            <option value="shared">Shared</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            <span style={{ fontWeight: 'bold' }}>Show Inactive</span>
          </label>
        </div>
      </div>

      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        backgroundColor: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Name</th>
            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Type</th>
            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Scope</th>
            <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>SARS</th>
            <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Active</th>
            <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredCategories.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
                No categories found
              </td>
            </tr>
          ) : (
            filteredCategories.map((category) => (
              <tr key={category.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '1rem' }}>{category.name}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    backgroundColor: category.category_type === 'income' ? '#d4edda' : '#f8d7da',
                    color: category.category_type === 'income' ? '#155724' : '#721c24',
                  }}>
                    {category.category_type}
                  </span>
                </td>
                <td style={{ padding: '1rem', textTransform: 'capitalize' }}>{category.scope}</td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  {category.sars_related === 1 ? '✓' : '-'}
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <button
                    onClick={() => toggleActive(category)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      backgroundColor: category.is_active === 1 ? '#28a745' : '#dc3545',
                      color: 'white',
                      fontSize: '0.875rem',
                    }}
                  >
                    {category.is_active === 1 ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button
                    onClick={() => handleEdit(category)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
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
  );
}
