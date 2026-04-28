import { useState, useEffect } from 'react';
import { bankAccountsApi, BankAccount } from '../api';

export function BankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    bank_name: '',
    account_number_masked: '',
    owner_name: '',
    account_type: '',
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    setLoading(true);
    const response = await bankAccountsApi.list();
    if (response.success && response.data) {
      // Store all accounts (including inactive ones)
      setAccounts(response.data);
      setError(null);
    } else {
      setError(response.error || 'Failed to load bank accounts');
    }
    setLoading(false);
  }

  function handleEdit(account: BankAccount) {
    setEditingId(account.id);
    setFormData({
      name: account.name,
      bank_name: account.bank_name,
      account_number_masked: account.account_number_masked,
      owner_name: account.owner_name,
      account_type: account.account_type || '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      let response;
      if (editingId) {
        response = await bankAccountsApi.update(editingId, formData);
      } else {
        response = await bankAccountsApi.create(formData);
      }

      if (response.success) {
        await loadAccounts();
        resetForm();
        setError(null);
      } else {
        setError(response.error || 'Failed to save bank account');
      }
    } catch (err) {
      setError('An error occurred');
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      bank_name: '',
      account_number_masked: '',
      owner_name: '',
      account_type: '',
    });
    setEditingId(null);
    setShowForm(false);
  }

  async function toggleActive(account: BankAccount) {
    const response = await bankAccountsApi.update(account.id, {
      is_active: account.is_active === 1 ? 0 : 1,
    });

    if (response.success) {
      await loadAccounts();
    } else {
      setError(response.error || 'Failed to update bank account');
    }
  }

  const filteredAccounts = accounts.filter((acc) => {
    if (!showInactive && acc.is_active === 0) return false;
    return true;
  });

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Bank Accounts</h1>
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
          {showForm ? 'Cancel' : '+ New Bank Account'}
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
          <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Bank Account' : 'New Bank Account'}</h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Account Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Justin's Discovery Cheque"
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
              Bank Name *
            </label>
            <input
              type="text"
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              required
              placeholder="e.g., Discovery Bank"
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
              Account Number (Masked) *
            </label>
            <input
              type="text"
              value={formData.account_number_masked}
              onChange={(e) => setFormData({ ...formData, account_number_masked: e.target.value })}
              required
              placeholder="e.g., ****1234"
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
              Owner Name *
            </label>
            <input
              type="text"
              value={formData.owner_name}
              onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
              required
              placeholder="e.g., Justin Smit"
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
              Account Type
            </label>
            <input
              type="text"
              value={formData.account_type}
              onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
              placeholder="e.g., Cheque, Savings, Credit Card"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
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
            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Account Name</th>
            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Bank</th>
            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Account Number</th>
            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Owner</th>
            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Type</th>
            <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Status</th>
            <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredAccounts.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
                No bank accounts found
              </td>
            </tr>
          ) : (
            filteredAccounts.map((account) => (
              <tr key={account.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{account.name}</td>
                <td style={{ padding: '1rem' }}>{account.bank_name}</td>
                <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{account.account_number_masked}</td>
                <td style={{ padding: '1rem' }}>{account.owner_name}</td>
                <td style={{ padding: '1rem' }}>{account.account_type || '-'}</td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <button
                    onClick={() => toggleActive(account)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      backgroundColor: account.is_active === 1 ? '#28a745' : '#dc3545',
                      color: 'white',
                      fontSize: '0.875rem',
                    }}
                  >
                    {account.is_active === 1 ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button
                    onClick={() => handleEdit(account)}
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
