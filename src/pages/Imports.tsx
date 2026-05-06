import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { importsApi, bankAccountsApi, Import, BankAccount } from '../api';

export function Imports() {
  const [imports, setImports] = useState<Import[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [importsRes, accountsRes] = await Promise.all([
      importsApi.list(),
      bankAccountsApi.list(),
    ]);
    if (importsRes.success) setImports(importsRes.data || []);
    else setError(importsRes.error || 'Failed to load imports');
    if (accountsRes.success) setBankAccounts(accountsRes.data || []);
    setLoading(false);
  }

  function getBankAccountName(id: string) {
    const acc = bankAccounts.find(a => a.id === id);
    return acc ? `${acc.bank_name} – ${acc.name}` : id;
  }

  const filtered = filterStatus ? imports.filter(i => i.status === filterStatus) : imports;

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-50 text-gray-700 border border-gray-200',
      ready: 'bg-blue-50 text-blue-700 border border-blue-200',
      finalised: 'bg-green-50 text-green-700 border border-green-200',
    };
    const labels: Record<string, string> = {
      draft: 'Draft',
      ready: 'Ready',
      finalised: 'Finalised',
    };
    return (
      <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${styles[status] || 'bg-gray-50 text-gray-700 border border-gray-200'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const progressBar = (reviewed: number, total: number) => {
    const percentage = total > 0 ? Math.round((reviewed / total) * 100) : 0;
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
          <div 
            className={`h-full transition-all ${percentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-gray-600 font-medium whitespace-nowrap">
          {reviewed}/{total}
        </span>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Statement Imports</h1>
          <p className="text-sm text-gray-500 mt-1">Upload and review bank statements</p>
        </div>
        <Link
          to="/imports/new"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg no-underline transition-all shadow-sm hover:shadow"
        >
          + Upload Statement
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm mb-6">{error}</div>
      )}

      {/* Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="finalised">Finalised</option>
          </select>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
          <p className="text-gray-500 text-sm mt-3">Loading imports...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="text-center py-20 px-6">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No imports found</h3>
            <p className="mt-2 text-sm text-gray-500">Get started by uploading your first bank statement</p>
            <Link 
              to="/imports/new" 
              className="mt-6 inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg no-underline transition-colors"
            >
              Upload Statement
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Account</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Period</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(imp => (
                <tr key={imp.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{getBankAccountName(imp.bank_account_id)}</span>
                      <span className="text-xs text-gray-500 mt-0.5">{imp.source_filename}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{imp.statement_month}</span>
                      {imp.period_start && imp.period_end && (
                        <span className="text-xs text-gray-500 mt-0.5">
                          {imp.period_start} to {imp.period_end}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-32">
                      {progressBar(imp.reviewed_count ?? 0, imp.row_count)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {statusBadge(imp.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {imp.status !== 'finalised' ? (
                        <Link
                          to={`/imports/${imp.id}/review?filter=unallocated`}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg no-underline transition-colors"
                        >
                          Continue
                        </Link>
                      ) : (
                        <Link
                          to={`/imports/${imp.id}/review`}
                          className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs font-semibold rounded-lg no-underline transition-colors"
                        >
                          View
                        </Link>
                      )}
                      {imp.source_file_key && (
                        <a
                          href={importsApi.downloadUrl(imp.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors no-underline"
                          title="Download original file"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
