import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bankAccountsApi, importTemplatesApi, BankAccount, ImportTemplate } from '../api';

const EMPTY_FORM = {
  name: '',
  bank_name: '',
  account_number_masked: '',
  owner_name: '',
  account_type: '',
  default_import_template_id: '',
};

export function BankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [templates, setTemplates] = useState<ImportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [accountsRes, templatesRes] = await Promise.all([
      bankAccountsApi.list(),
      importTemplatesApi.list({ includeInactive: false }),
    ]);

    if (accountsRes.success) {
      setAccounts(accountsRes.data || []);
    } else {
      setError(accountsRes.error || 'Failed to load bank accounts');
    }

    if (templatesRes.success) {
      setTemplates(templatesRes.data || []);
    } else {
      setError(templatesRes.error || 'Failed to load import templates');
    }

    setLoading(false);
  }

  function resetForm() {
    setShowModal(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  }

  function startCreate() {
    setError('');
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  }

  function startEdit(account: BankAccount) {
    setError('');
    setEditingId(account.id);
    setFormData({
      name: account.name,
      bank_name: account.bank_name,
      account_number_masked: account.account_number_masked,
      owner_name: account.owner_name,
      account_type: account.account_type || '',
      default_import_template_id: account.default_import_template_id || '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      ...formData,
      account_type: formData.account_type || null,
      default_import_template_id: formData.default_import_template_id || null,
    };

    const response = editingId
      ? await bankAccountsApi.update(editingId, payload)
      : await bankAccountsApi.create(payload);

    setSaving(false);
    if (!response.success) {
      setError(response.error || 'Failed to save bank account');
      return;
    }

    await loadData();
    resetForm();
  }

  async function toggleActive(account: BankAccount) {
    const response = await bankAccountsApi.update(account.id, {
      is_active: account.is_active === 1 ? 0 : 1,
    });

    if (!response.success) {
      setError(response.error || 'Failed to update bank account');
      return;
    }

    await loadData();
  }

  function templateName(templateId: string | null) {
    if (!templateId) return 'No template linked';
    const template = templates.find(item => item.id === templateId);
    return template ? template.name : 'Linked template unavailable';
  }

  const visibleAccounts = showInactive ? accounts : accounts.filter(account => account.is_active === 1);

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Bank Accounts</h1>
          <p className="text-sm text-gray-500 m-0">Each account links to a default import template. Users pick the account, not parser settings.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/import-templates" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg no-underline transition-colors">
            Manage Templates
          </Link>
          <button onClick={startCreate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
            + New Account
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.currentTarget.checked)} className="rounded" />
          Show Inactive
        </label>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Bank</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Template</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleAccounts.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No bank accounts found</td></tr>
              ) : visibleAccounts.map(account => (
                <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{account.name}</div>
                    <div className="text-xs text-gray-500">{account.account_number_masked}{account.account_type ? ` · ${account.account_type}` : ''}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{account.bank_name}</td>
                  <td className="px-4 py-3 text-gray-600">{account.owner_name}</td>
                  <td className="px-4 py-3 text-gray-600">{templateName(account.default_import_template_id)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActive(account)} className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border-0 cursor-pointer ${account.is_active === 1 ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {account.is_active === 1 ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(account)} className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Bank Account Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full shadow-xl">
            {/* Modal Header */}
            <div className="bg-gray-800 px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? 'Edit Bank Account' : 'Create New Bank Account'}
              </h2>
              <p className="text-gray-300 text-xs mt-1">
                {editingId ? 'Update bank account information and template link' : 'Add a new bank account to the system'}
              </p>
            </div>

            <div className="p-5">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Account Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., FNB Savings"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Bank *
                    </label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., FNB"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Account Number (Masked) *
                    </label>
                    <input
                      type="text"
                      value={formData.account_number_masked}
                      onChange={e => setFormData({ ...formData, account_number_masked: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., ****1234"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Owner *
                    </label>
                    <input
                      type="text"
                      value={formData.owner_name}
                      onChange={e => setFormData({ ...formData, owner_name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., John Doe"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Account Type
                    </label>
                    <input
                      type="text"
                      value={formData.account_type}
                      onChange={e => setFormData({ ...formData, account_type: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Savings, Cheque"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Default Import Template
                    </label>
                    <select
                      value={formData.default_import_template_id}
                      onChange={e => setFormData({ ...formData, default_import_template_id: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="">No template linked</option>
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name}{template.bank_name ? ` · ${template.bank_name}` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Template used when uploading statements for this account
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                  >
                    {saving ? 'Saving…' : editingId ? 'Update Account' : 'Create Account'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
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
    </div>
  );
}